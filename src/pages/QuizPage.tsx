import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useConfigStore } from "@/stores/useConfigStore"; // <-- Using Zustand
import { useToast } from "@/hooks/use-toast";
import type { Question } from "@/types/question";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import QuizImageViewer from "@/components/QuizImageViewer";

// Icons
import { CheckCircle2, XCircle, ArrowLeft, Trophy, RotateCcw, AlertCircle } from "lucide-react";

// --- HELPERS & CONFIG ---

type ScoringMatrixType = Record<string, Record<string, Record<string, number>>>;
const SCORING_MATRIX: ScoringMatrixType = {
    "correct": {
        Remembering: { Easy: 0.04, Medium: 0.05, Hard: 0.06 },
        Understanding: { Easy: 0.06, Medium: 0.08, Hard: 0.10 },
        Applying: { Easy: 0.00, Medium: 0.12, Hard: 0.15 }
    },
    "incorrect": {
        Remembering: { Easy: 0.08, Medium: 0.07, Hard: 0.06 },
        Understanding: { Easy: 0.07, Medium: 0.06, Hard: 0.05 },
        Applying: { Easy: 0.00, Medium: 0.05, Hard: 0.03 }
    }
};

function calculateNewMasteryScore(currentScore: number, isCorrect: boolean, bloomLevel: string, difficulty: string) {
    const resultType: string = isCorrect ? "correct" : "incorrect";
    const delta: number = SCORING_MATRIX[resultType]?.[bloomLevel]?.[difficulty] || 0.0;
    let newScore = isCorrect ? currentScore + delta : currentScore - delta;
    newScore = Math.max(0.0, Math.min(1.0, newScore));
    return Math.round(newScore * 100) / 100;
}

function getDifficultyStyle(difficulty: string) {
    switch (difficulty) {
        case "Easy": return "bg-green-600 text-white font-bold border-transparent shadow-sm";
        case "Medium": return "bg-orange-500 text-white font-bold border-transparent shadow-sm";
        case "Hard": return "bg-red-500 text-white font-bold border-transparent shadow-sm";
        default: return "text-muted-foreground border-border";
    }
}

function getTaxonomyStyle(taxonomy: string) {
    switch (taxonomy) {
        case "Remembering": return "text-green-600 border-green-600/30 bg-green-50";
        case "Understanding": return "text-orange-500 border-orange-500/30 bg-orange-50";
        case "Applying": return "text-destructive border-destructive/30 bg-destructive/10";
        default: return "text-muted-foreground border-border";
    }
}

function getStoredScores() {
    try {
        return JSON.parse(localStorage.getItem('reviewer_knowledge_scores') || '{}');
    } catch {
        return {};
    }
}

// --- MAIN COMPONENT ---

export default function QuizPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();
    const [searchParams] = useSearchParams();

    // Config & Auth
    const backendUrl = useConfigStore((state) => state.backendUrl);
    const token = localStorage.getItem('reviewer_token');

    // Knowledge Score State
    const [knowledgeScores, setKnowledgeScores] = useState<Record<string, any>>(getStoredScores());

    // URL Params
    const mode = searchParams.get("mode");
    const trialDifficulty = searchParams.get("difficulty");
    const trialSubject = searchParams.get("subject");
    const trialQuestionId = searchParams.get("question_id");
    const isTrial = mode === "trial";

    // Quiz States
    const [showFallback, setShowFallback] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selected, setSelected] = useState<number | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [fetchError, setFetchError] = useState<{ title: string, reason: string } | null>(null);

    const [score, setScore] = useState(0);
    const [finished, setFinished] = useState(false);
    const TOTAL_QUESTIONS = isTrial ? 1 : 50;

    const [question, setQuestion] = useState<Question | null>(null);

    // Remediation States
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [showNoDowngradeModal, setShowNoDowngradeModal] = useState(false);
    const [pendingScores, setPendingScores] = useState<Record<string, any> | null>(null);

    // --- EFFECTS ---

    useEffect(() => {
        if (!token) {
            toast({ title: "Authentication Required", description: "Please sign in first!", variant: "destructive" });
            navigate("/");
            return;
        }
        if (!location.state?.started) {
            toast({ title: "Invalid Access", description: "Please start the quiz from the dashboard.", variant: "destructive" });
            navigate("/select", { replace: true });
        }
    }, [token, navigate, location, toast]);

    useEffect(() => {
        if (token) loadNewQuestion();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    useEffect(() => {
        let timer: number;
        if (isLoading || !question) {
            timer = window.setTimeout(() => setShowFallback(true), 7000);
        }
        return () => clearTimeout(timer);
    }, [isLoading, question]);

    // --- FETCH LOGIC ---

    const fetchQuestion = async (overrideScores?: Record<string, any>) => {
        const scoresToUse = overrideScores || knowledgeScores;
        const requestPayload = isTrial
            ? { is_trial: true, question_id: trialQuestionId, subject: trialSubject, difficulty: trialDifficulty }
            : { scores: scoresToUse, current_index: currentIndex };

        const endpoint = isTrial ? "/api/ai/trial" : "/api/ai/question";
        console.log(`${backendUrl}${endpoint}`)
        const response = await fetch(`${backendUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestPayload),
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData?.detail?.reason || errData?.detail || "Failed to load question from server.");
        }

        const data = await response.json();
        const rawQuestion = data.query;
        rawQuestion.original_question_id = rawQuestion.question_id;
        rawQuestion.original_question = rawQuestion.question;
        rawQuestion.execution_time = data.execution_time_seconds;

        const questionIndex = data.log_count % TOTAL_QUESTIONS;
        if (questionIndex !== 0) setCurrentIndex(questionIndex);

        return rawQuestion;
    };

    const loadNewQuestion = async (overrideScores?: Record<string, any>) => {
        setIsLoading(true);
        setFetchError(null);
        setShowFallback(false);

        try {
            const data = await fetchQuestion(overrideScores);
            setQuestion(data);
            if (data.isMock) {
                toast({ variant: "destructive", title: "Offline Mode", description: data.mockMessage });
            }
        } catch (error: any) {
            setFetchError({ title: "Connection Error", reason: error.message });
            toast({ variant: "destructive", title: "Connection Error", description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const fetchDowngradedQuestion = async (originalId: string | null, scoresToUse: Record<string, any>) => {
        if (!originalId) {
            setShowNoDowngradeModal(true);
            return;
        }

        setIsLoading(true);
        setSelected(null);
        setShowResult(false);
        setShowFallback(false);

        try {
            const response = await fetch(`${backendUrl}/api/ai/downgraded?original_question_id=${originalId}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("No downgrade found");

            const data = await response.json();
            const downgradeQuestion = data.result.response;
            downgradeQuestion.execution_time = data.execution_time_seconds || 0;
            downgradeQuestion.original_question = downgradeQuestion.question;
            downgradeQuestion.original_question_id = originalId;

            if (!downgradeQuestion?.downgraded_question) throw new Error("Invalid downgrade data");

            setQuestion(downgradeQuestion);
            setIsReviewMode(true);
        } catch (error) {
            setPendingScores(scoresToUse);
            setShowNoDowngradeModal(true);
        } finally {
            setIsLoading(false);
        }
    };

    // --- HANDLERS ---

    const proceedToNextMainQuestion = (scoresToUse: Record<string, any>) => {
        if (currentIndex + 1 < TOTAL_QUESTIONS) {
            setCurrentIndex((i) => i + 1);
            setShowFallback(false);
            setSelected(null);
            setShowResult(false);
            setIsReviewMode(false);
            loadNewQuestion(scoresToUse);
        } else {
            setFinished(true);
        }
    };

    const handleAnswer = async (index: number) => {
        if (showResult || !question) return;

        setSelected(index);
        setShowResult(true);

        const isCorrect = question.options[index].toLowerCase() === (isReviewMode ? question.downgraded_answer : question.answer).toLowerCase();
        let latestScores = { ...knowledgeScores };

        // 1. Scoring Logic
        if (!isReviewMode) {
            const currentScore = knowledgeScores?.[question.subtopic]?.mastery_score || 0;
            const updatedMasteryScore = calculateNewMasteryScore(currentScore, isCorrect, question.bloom_taxonomy, question.difficulty);

            latestScores = {
                ...knowledgeScores,
                [question.subtopic]: {
                    ...knowledgeScores[question.subtopic],
                    mastery_score: updatedMasteryScore
                }
            };

            // Update local state and storage
            setKnowledgeScores(latestScores);
            localStorage.setItem('reviewer_knowledge_scores', JSON.stringify(latestScores));

            if (isCorrect) {
                setScore((s) => s + 1);
                toast({ title: "✅ Correct!", description: `Score updated to ${updatedMasteryScore}` });
            } else {
                toast({ variant: "destructive", title: "❌ Wrong!", description: `Score dropped to ${updatedMasteryScore}` });
            }
        } else {
            if (isCorrect) {
                toast({ title: "✅ Correct!", description: "Great job reviewing this concept!" });
            } else {
                toast({ variant: "destructive", title: "❌ Tricky Concept!", description: "Keep practicing, you'll get it." });
            }
        }

        // 2. Background Logging (Fire and forget)
        const endpoint = isReviewMode ? "/api/reviews" : "/api/logs";
        fetch(`${backendUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                data: question,
                isCorrect,
                latestScores,
                timestamp: new Date().toISOString()
            }),
        }).catch(() => {
            toast({ variant: "destructive", title: "Sync Warning", description: `Could not save log to database.` });
        });

        // 3. Routing Delay
        setTimeout(() => {
            if (!isCorrect && !isReviewMode && question.bloom_taxonomy !== "Remembering") {
                fetchDowngradedQuestion(question.original_question_id, latestScores);
            } else {
                proceedToNextMainQuestion(latestScores);
            }
        }, 1500);
    };

    // --- RENDERERS ---

    if (!token || !location.state?.started) return null;

    if (fetchError) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md shadow-xl border-border/50 text-center">
                    <CardHeader className="space-y-3">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/15">
                            <XCircle className="h-8 w-8 text-destructive" />
                        </div>
                        <CardTitle className="text-xl font-bold text-foreground">{fetchError.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">{fetchError.reason}</p>
                        <div className="flex gap-3 justify-center pt-2">
                            <Button variant="outline" onClick={() => navigate("/select")} className="gap-2">
                                <ArrowLeft className="h-4 w-4" /> Back
                            </Button>
                            <Button onClick={() => loadNewQuestion()}>
                                Try Again
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isLoading || !question) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background p-4">
                <div className="flex flex-col items-center gap-6 text-center max-w-sm">
                    <div className="animate-pulse text-xl font-medium text-primary">
                        {isReviewMode ? "Generating a downgraded review question..." : "Loading your next challenge..."}
                    </div>
                    {showFallback && (
                        <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <p className="text-sm text-destructive">
                                This is taking longer than usual. Check your backend connection or try again.
                            </p>
                            <Button onClick={() => navigate("/select")} variant="outline" className="gap-2">
                                <ArrowLeft className="h-4 w-4" /> Return to Dashboard
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (finished) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
                <Card className="w-full max-w-md shadow-xl border-border/50 text-center bg-white">
                    <CardHeader className="space-y-3">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
                            <Trophy className="h-8 w-8 text-success" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-foreground">Quiz Complete!</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-5xl font-extrabold text-primary tracking-tight">
                            {score} <span className="text-2xl text-muted-foreground">/ {TOTAL_QUESTIONS}</span>
                        </p>
                        <p className="text-muted-foreground font-medium">
                            {score === TOTAL_QUESTIONS
                                ? "Perfect score! 🎉"
                                : score >= TOTAL_QUESTIONS / 2
                                    ? "Good effort! Keep learning."
                                    : "Keep practicing, you'll improve!"}
                        </p>
                        <p className="text-muted-foreground text-xs pt-4">
                            Results synchronized securely with your server.
                        </p>
                        <div className="flex gap-3 justify-center pt-4">
                            <Button variant="outline" onClick={() => navigate("/select")} className="gap-2">
                                <ArrowLeft className="h-4 w-4" /> Dashboard
                            </Button>
                            {!isTrial &&
                                <Button onClick={() => {
                                    setCurrentIndex(0);
                                    setScore(0);
                                    setSelected(null);
                                    setShowResult(false);
                                    setFinished(false);
                                    loadNewQuestion();
                                }}>
                                    Retry Quiz
                                </Button>
                            }
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const progress = (currentIndex / TOTAL_QUESTIONS) * 100;

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 relative">

            {/* Modal Overlay for Missing Downgrades */}
            {showNoDowngradeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <Card className="w-full max-w-sm shadow-2xl border-none animate-in zoom-in-95 duration-200">
                        <CardHeader className="text-center pb-4">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 mb-2">
                                <AlertCircle className="h-6 w-6 text-orange-600" />
                            </div>
                            <CardTitle className="text-lg">No Review Available</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center text-sm text-muted-foreground pb-6">
                            A simpler version of this concept was not found in the database. We will proceed to your next question instead.
                        </CardContent>
                        <div className="p-4 pt-0">
                            <Button
                                className="w-full"
                                onClick={() => {
                                    setShowNoDowngradeModal(false);
                                    proceedToNextMainQuestion(pendingScores || knowledgeScores);
                                }}
                            >
                                Continue
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Main Quiz Card */}
            <Card className="w-full max-w-2xl shadow-xl border-border/50 overflow-hidden bg-white">
                <div className="bg-zinc-100 p-2 text-center text-[10px] uppercase tracking-widest text-muted-foreground border-b">
                    Connected to: {backendUrl}
                </div>

                <CardHeader className="space-y-4 pb-4">
                    <div className="flex items-center justify-between text-sm text-muted-foreground font-medium">
                        <span>
                            {isReviewMode ? (
                                <span className="font-bold flex items-center gap-2 text-orange-500 animate-pulse">
                                    <RotateCcw className="h-4 w-4" /> Remediation Active
                                </span>
                            ) : (
                                `Question ${currentIndex + 1} of ${TOTAL_QUESTIONS}`
                            )}
                        </span>
                        {!isReviewMode && <span className="font-semibold text-primary">Score: {score}</span>}
                    </div>

                    {!isReviewMode && <Progress value={progress} className="h-2 rounded-full" />}

                    {question?.description && (
                        <p className="text-sm text-muted-foreground italic border-l-2 border-primary/40 pl-3 py-1 bg-zinc-50 rounded-r-md">
                            {question.description}
                        </p>
                    )}

                    {question?.image && question.image.length > 0 && (
                        <div className="py-2">
                            <QuizImageViewer images={question.image.split(",")} />
                        </div>
                    )}

                    <CardTitle className="text-xl md:text-2xl font-bold text-foreground leading-relaxed">
                        {isReviewMode ? question?.downgraded_question : question?.original_question}
                    </CardTitle>

                    {/* Meta Badges */}
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                        {question?.subtopic && (
                            <Badge variant="secondary" className="text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-800">
                                {question.subtopic}
                            </Badge>
                        )}
                        {question?.difficulty && (
                            <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${getDifficultyStyle(question.difficulty)}`}>
                                {question.difficulty}
                            </Badge>
                        )}
                        {question?.bloom_taxonomy && (
                            <Badge variant="outline" className={`text-xs font-bold ${getTaxonomyStyle(question.bloom_taxonomy)}`}>
                                {question.bloom_taxonomy}
                            </Badge>
                        )}
                    </div>
                </CardHeader>

                <CardContent>
                    <div className="grid grid-cols-1 gap-3">
                        {question?.options.map((option, i) => {
                            let variant: "outline" | "default" | "destructive" | "secondary" = "outline";
                            let icon = null;

                            if (showResult) {
                                const correctIndex = isReviewMode
                                    ? question.options.indexOf(question.downgraded_answer)
                                    : question.options.indexOf(question.answer);

                                if (i === correctIndex) {
                                    variant = "default";
                                    icon = <CheckCircle2 className="h-5 w-5" />;
                                } else if (i === selected) {
                                    variant = "destructive";
                                    icon = <XCircle className="h-5 w-5" />;
                                }
                            }

                            return (
                                <Button
                                    key={i}
                                    variant={variant}
                                    className={`h-auto py-4 px-5 justify-start text-left gap-4 text-base whitespace-normal shadow-sm transition-all ${!showResult && "hover:border-primary/50 hover:bg-blue-500"}`}
                                    onClick={() => handleAnswer(i)}
                                    disabled={showResult}
                                >
                                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${variant === "outline" ? "border-zinc-300 text-zinc-500 bg-zinc-100" : "border-current/30"}`}>
                                        {String.fromCharCode(65 + i)}
                                    </span>
                                    <span className="flex-1 leading-relaxed">{option}</span>
                                    {icon && <span className="ml-auto shrink-0">{icon}</span>}
                                </Button>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
