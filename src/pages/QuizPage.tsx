import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, ArrowLeft, Trophy, RotateCcw, AlertCircle } from "lucide-react";
import { ResultAsync, errAsync, okAsync } from "neverthrow";
import QuizImageViewer from "@/components/QuizImageViewer";
import type { Question } from "@/types/question";

type ScoringMatrixType = Record<string, Record<string, Record<string, number>>>;
const SCORING_MATRIX: ScoringMatrixType = {
    "correct": {
        Remembering: { Easy: 0.04, Medium: 0.05, Hard: 0.06 },
        Understanding: { Easy: 0.06, Medium: 0.08, Hard: 0.10 },
        Applying: { Easy: 0.00, Medium: 0.12, Hard: 0.15 } // Easy is 0.00 as a fallback
    },
    "incorrect": {
        Remembering: { Easy: 0.08, Medium: 0.07, Hard: 0.06 },
        Understanding: { Easy: 0.07, Medium: 0.06, Hard: 0.05 },
        Applying: { Easy: 0.00, Medium: 0.05, Hard: 0.03 } // Easy is 0.00 as a fallback
    }
};

function calculateNewMasteryScore(currentScore: number, isCorrect: boolean, bloomLevel: string, difficulty: string) {
    const resultType: string = isCorrect ? "correct" : "incorrect";
    const delta: number = SCORING_MATRIX[resultType][bloomLevel]?.[difficulty] || 0.0;
    let newScore = isCorrect ? currentScore + delta : currentScore - delta;
    newScore = Math.max(0.0, Math.min(1.0, newScore));
    return Math.round(newScore * 100) / 100;
};

const QuizPage = () => {
    const { token, backendUrl, knowledgeScores, updateKnowledgeScores } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();

    const [searchParams] = useSearchParams();
    const mode = searchParams.get("mode")
    const trialDifficulty = searchParams.get("difficulty");
    const trialSubject = searchParams.get("subject");
    const trialQuestionId = searchParams.get("question_id");
    const isTrial = mode === "trial";

    const [showFallback, setShowFallback] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selected, setSelected] = useState<number | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [fetchError, setFetchError] = useState<{ title: string, reason: string } | null>(null);

    const [score, setScore] = useState(0);
    const [finished, setFinished] = useState(false);
    const TOTAL_QUESTIONS = isTrial ? 1 : 50;
    const [question, setQuestion] = useState<Question>({
        original_question_id: null,
        original_question: "",
        downgraded_answer: "",
        downgraded_question: "",
        description: "",
        options: [],
        answer: "",
        bloom_taxonomy: "",
        difficulty: "",
        subtopic: "",
        image: null,
        isMock: null,
        mockMessage: null
    });

    // Inline Remediation States
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [showNoDowngradeModal, setShowNoDowngradeModal] = useState(false);
    const [pendingScores, setPendingScores] = useState<typeof knowledgeScores | null>(null);

    useEffect(() => {
        if (!token) {
            toast({
                title: "Illegal Entry",
                description: `Please sign in first!`,
            });
            navigate("/");
        }

        if (!location.state?.started) {
            toast({
                variant: "destructive",
                title: "Unaccessible",
                description: "Please start the quiz on selection page",
            });
            navigate("/select", { replace: true });
        }
    }, [token, navigate, location]);


    useEffect(() => {
        if (token) loadNewQuestion();
    }, [token]);

    useEffect(() => {
        let timer: number;
        if (isLoading || !question) {
            timer = window.setTimeout(() => {
                setShowFallback(true);
            }, 7000);
        }
        return () => clearTimeout(timer);
    }, [isLoading, question]);

    const progress = ((currentIndex) / TOTAL_QUESTIONS) * 100;

    const fetchQuestion = (overrideScores?: typeof knowledgeScores) => {
        const scoresToUse = overrideScores || knowledgeScores;

        const requestPayload = isTrial
            ? {
                is_trial: true,
                question_id: trialQuestionId,
                subject: trialSubject,
                difficulty: trialDifficulty
            }
            : {
                scores: scoresToUse,
                current_index: currentIndex,
            };

        const endpoint = isTrial ? "/api/ai/trial" : "/api/ai/question";

        return ResultAsync.fromPromise(
            fetch(`${backendUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestPayload),
            }),
            (error) => ({ title: "Unreachable Server", reason: `Network Error: ${String(error)}` })
        ).andThen((response) => {
            if (response.status === 404)
                return errAsync({ title: "Unreachable Server", reason: "The backend link is wrong." });

            return ResultAsync.fromPromise(
                response.json(),
                () => ({ title: "Parsing Error", reason: "Failed to parse response..." })
            ).andThen((data) => {
                if (!response.ok) {
                    return errAsync({
                        title: data?.detail?.title || "Error",
                        reason: data?.detail?.reason || "An unknown error occurred"
                    });
                }

                const rawQuestion = data.query;
                rawQuestion.original_question_id = rawQuestion.question_id;
                rawQuestion.original_question = rawQuestion.question;
                rawQuestion.execution_time = data.execution_time_seconds;

                const questionIndex = data.log_count % TOTAL_QUESTIONS;
                if (questionIndex != 0) setCurrentIndex(questionIndex);

                return okAsync(rawQuestion);
            });
        }).mapErr((err) => err).map((val) => val);
    }

    const loadNewQuestion = async (overrideScores?: typeof knowledgeScores) => {
        setIsLoading(true);
        setFetchError(null);
        setShowFallback(false);

        const result = await fetchQuestion(overrideScores);
        result.match(
            (data) => {
                console.log(data)
                setQuestion(data);
                setIsLoading(false);
                if (data.isMock) {
                    toast({
                        variant: "destructive",
                        title: "Offline Mode",
                        description: data.mockMessage,
                    });
                }
            },
            (err) => {
                toast({ variant: "destructive", title: err.title, description: err.reason });
                setFetchError(err)
                setIsLoading(false);
            }
        );
    };

    // Helper to advance the main quiz flow
    const proceedToNextMainQuestion = (scoresToUse: typeof knowledgeScores) => {
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

    // NEW: Immediate Inline Downgrade Fetch
    const fetchDowngradedQuestion = async (originalId: string | null, scoresToUse: typeof knowledgeScores) => {
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
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });

            if (!response.ok) {
                throw new Error("No downgrade found");
            }

            const data = await response.json();

            console.log(data)
            // Map the response correctly based on your backend shape
            // Assuming it returns the question object directly or inside data.result.response
            const aiQuestion = data.result.response

            if (!aiQuestion || !aiQuestion.downgraded_question) {
                throw new Error("Invalid downgrade data");
            }

            aiQuestion.downgraded_question = data.result.response.question
            aiQuestion.downgraded_answer = data.result.response.answer
            aiQuestion.original_question_id = originalId; // Keep the tracker
            aiQuestion.execution_time = data.execution_time_seconds || 0;

            setQuestion(aiQuestion);
            setIsReviewMode(true);
            setIsLoading(false);

        } catch (error) {
            setIsLoading(false);
            setPendingScores(scoresToUse);
            setShowNoDowngradeModal(true);
        }
    };

    const handleAnswer = (index: number) => {
        if (showResult) return;
        setSelected(index);
        setShowResult(true);

        const isCorrect = question.options[index].toLowerCase() === question.answer.toLowerCase();
        let latestScores = knowledgeScores;

        // 1. SCORING LOGIC: Only update scores if it is the MAIN quiz
        if (!isReviewMode) {
            const updatedMasteryScore = calculateNewMasteryScore(
                knowledgeScores?.[question.subtopic]?.mastery_score,
                isCorrect,
                question.bloom_taxonomy,
                question.difficulty
            );
            updateKnowledgeScores(question.subtopic, updatedMasteryScore);

            if (knowledgeScores[question.subtopic]) {
                latestScores = {
                    ...knowledgeScores,
                    [question.subtopic]: {
                        ...knowledgeScores[question.subtopic],
                        mastery_score: updatedMasteryScore
                    }
                };
            }

            if (isCorrect) {
                setScore((s) => s + 1);
                toast({ title: "✅ Correct!", description: `Score updated to ${updatedMasteryScore}` });
            } else {
                toast({
                    variant: "destructive",
                    title: "❌ Wrong!",
                    description: `Score dropped to ${updatedMasteryScore}`,
                });
            }
        } else {
            // Custom toast for Review Mode (No score updates!)
            if (isCorrect) {
                toast({ title: "✅ Correct!", description: "Great job reviewing this concept!" });
            } else {
                toast({ variant: "destructive", title: "❌ Tricky Concept!", description: "Keep practicing, you'll get it." });
            }
        }

        // 2. DATABASE LOGGING
        const currentTime = new Date().toISOString();
        const endpoint = isReviewMode ? "/api/reviews" : "/api/logs";
        console.log(JSON.stringify({
            data: question,
            isCorrect,
            latestScores,
            timestamp: currentTime
        }))
        ResultAsync.fromPromise(
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
                    timestamp: currentTime
                }),
            }),
            (error) => ({ title: "Unreachable Server", reason: `Network Error: ${String(error)}` })
        ).mapErr(() => {
            toast({
                variant: "destructive",
                title: "Unreachable Server",
                description: `Network Error: Logging did not go through...`
            });
        });

        // 3. NEXT ACTION ROUTING
        setTimeout(() => {
            if (!isCorrect && !isReviewMode && question.bloom_taxonomy !== "Remembering") {
                // Inline Remediation: Attempt to fetch downgrade immediately
                fetchDowngradedQuestion(question.original_question_id, latestScores);
            } else {
                // If they got it right, OR if they just finished answering a downgraded review
                proceedToNextMainQuestion(latestScores);
            }
        }, 1500);
    };

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
                            <Button onClick={() => {
                                loadNewQuestion();
                                setShowFallback(false);
                            }}>
                                Get Another Question
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isLoading) {
        const handleGoBack = () => {
            navigate(token ? "/select" : "/");
        };

        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-6 text-center">
                    <div className="animate-pulse text-xl font-medium text-muted-foreground">
                        {isReviewMode ? "Generating a downgraded review question..." : "Loading your next challenge..."}
                    </div>
                    {showFallback && (
                        <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <p className="text-sm text-destructive max-w-75">
                                This is taking longer than usual. Check your backend connection or try again.
                            </p>
                            <Button onClick={handleGoBack} variant="default" className="gap-2">
                                <ArrowLeft className="h-4 w-4" />
                                Go Back
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (finished) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md shadow-xl border-border/50 text-center">
                    <CardHeader className="space-y-3">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
                            <Trophy className="h-8 w-8 text-success" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-foreground">Quiz Complete!</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-4xl font-bold text-primary">
                            {score} / {TOTAL_QUESTIONS}
                        </p>
                        <p className="text-muted-foreground">
                            {score === TOTAL_QUESTIONS
                                ? "Perfect score! 🎉"
                                : score >= TOTAL_QUESTIONS / 2
                                    ? "Good effort! Keep learning."
                                    : "Keep practicing, you'll improve!"}
                        </p>

                        <p className="text-muted-foreground text-sm italic pt-4">
                            Results have been synchronized with the server at: <br />
                            <span className="text-xs font-mono opacity-70">{backendUrl}</span>
                        </p>
                        <div className="flex gap-3 justify-center pt-2">
                            <Button variant="outline" onClick={() => navigate("/select")} className="gap-2">
                                <ArrowLeft className="h-4 w-4" /> Back
                            </Button>
                            {!isTrial &&
                                <Button
                                    onClick={() => {
                                        setCurrentIndex(0);
                                        setScore(0);
                                        setSelected(null);
                                        setShowResult(false);
                                        setFinished(false);
                                        setShowFallback(false);
                                        loadNewQuestion();
                                    }}
                                >
                                    Retry Quiz
                                </Button>
                            }
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4 relative">

            {/* NEW: No Downgrade Modal Overlay */}
            {showNoDowngradeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
                    <Card className="w-full max-w-sm shadow-2xl border-border animate-in zoom-in-95 duration-200">
                        <CardHeader className="text-center pb-4">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-2">
                                <AlertCircle className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <CardTitle className="text-lg">No Review Available</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center text-sm text-muted-foreground pb-6">
                            A downgraded version of this specific question was not found in the database. We will proceed to your next question.
                        </CardContent>
                        <div className="p-4 pt-0 flex justify-center">
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

            <Card className="w-full max-w-2xl shadow-xl border-border/50 overflow-hidden">
                <div className="bg-muted/30 p-2 text-center text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border/40">
                    Connected to: {backendUrl}
                </div>
                <CardHeader className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>
                            {isReviewMode ? (
                                <span className="font-bold flex items-center gap-2 text-[#f97415] animate-pulse">
                                    <RotateCcw className="h-4 w-4" /> Remediation Active
                                </span>
                            ) : (
                                `Question ${currentIndex + 1} of ${TOTAL_QUESTIONS}`
                            )}
                        </span>
                        {!isReviewMode && <span className="font-semibold text-primary">Score: {score}</span>}
                    </div>

                    {!isReviewMode && <Progress value={progress} className="h-2" />}

                    {question?.description && (
                        <p className="text-sm text-muted-foreground italic">{question.description}</p>
                    )}
                    {question?.image && question.image.length > 0 && (
                        <QuizImageViewer images={question.image.split(",")} />
                    )}
                    <CardTitle className="text-xl font-bold text-foreground">{isReviewMode ? question?.downgraded_question : question?.original_question}</CardTitle>

                    {/* Question Metadata Badges */}
                    <div id="metadata" className="flex flex-wrap items-center gap-2 pt-1">
                        {question?.subtopic && (
                            <Badge variant="secondary" className={`text-xs font-bold`}>
                                {question.subtopic}
                            </Badge>
                        )}
                        {question?.difficulty && (
                            <Badge variant="outline"
                                className={`text-xs font-normal ${question.difficulty === "Easy" ? "bg-green-600 text-white font-bold" :
                                    question.difficulty === "Medium" ? "bg-[#f97415] text-white font-bold" :
                                        question.difficulty === "Hard" ? "bg-red-500 text-white font-bold" :
                                            "text-muted-foreground"
                                    }`}
                            >
                                {question.difficulty}
                            </Badge>
                        )}
                        {question?.bloom_taxonomy && (
                            <Badge variant="outline"
                                className={`text-xs font-bold ${question.bloom_taxonomy === "Remembering" ? "text-green-600" :
                                    question.bloom_taxonomy === "Understanding" ? "text-[#f97415]" :
                                        question.bloom_taxonomy === "Applying" ? "text-destructive" :
                                            "text-muted-foreground"
                                    }`}
                            >
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
                                const correctIndex = isReviewMode ? question.options.indexOf(question.downgraded_answer) : question.options.indexOf(question.answer);

                                if (i === correctIndex) {
                                    variant = "default";
                                    icon = <CheckCircle2 className="h-4 w-4" />;
                                } else if (i === selected) {
                                    variant = "destructive";
                                    icon = <XCircle className="h-4 w-4" />;
                                }
                            }

                            return (
                                <Button
                                    key={i}
                                    variant={variant}
                                    className="h-auto py-3 px-4 justify-start text-left gap-3 text-base text-wrap!"
                                    onClick={() => handleAnswer(i)}
                                    disabled={showResult}
                                >
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current/20 text-sm font-semibold">
                                        {String.fromCharCode(65 + i)}
                                    </span>
                                    {option}
                                    {icon && <span className="ml-auto">{icon}</span>}
                                </Button>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div >
    );
};

export default QuizPage;
