import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, ArrowLeft, Trophy, RotateCcw } from "lucide-react";
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
        question: "",
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

    // NEW: Review Session States
    const [incorrectQuestions, setIncorrectQuestions] = useState<Question[]>([]);
    const [isReviewMode, setIsReviewMode] = useState(false);

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
                //console.log(data)
                const aiQuestion = data.result.response;
                aiQuestion.original_question_id = data.queries?.question_id;
                aiQuestion.original_question = data.queries?.question;
                aiQuestion.execution_time = data.execution_time_seconds;

                const questionIndex = data.log_count % TOTAL_QUESTIONS;
                if (questionIndex != 0) setCurrentIndex(questionIndex);

                if (typeof aiQuestion === 'string') {
                    return errAsync({
                        title: "Backend Generation Error",
                        reason: data.result.error
                    });
                }

                aiQuestion.image = data.queries?.image || null;
                aiQuestion.description = data.queries?.description || null;
                aiQuestion.area = data.queries?.area || null;

                if (data.result.error) {
                    aiQuestion.isMock = true;
                    aiQuestion.mockMessage = data.result.error;
                }
                //console.log(aiQuestion)
                return okAsync(aiQuestion);
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

    // NEW: Review Session Fetch Logic
    const startReview = async (q: Question) => {
        // 1. Calculate downgraded taxonomy
        const downgradedBloom = q.bloom_taxonomy === "Applying" ? "Understanding" : "Remembering";

        // 2. Remove it from the list so they can't review it twice
        setIncorrectQuestions(prev => prev.filter(item => item !== q));

        // 3. Setup UI states
        setIsReviewMode(true);
        setFinished(false);
        setIsLoading(true);
        setFetchError(null);
        setSelected(null);
        setShowResult(false);
        setShowFallback(false);

        // 4. Request the specific downgraded question using the trial endpoint
        const requestPayload = {
            question_id: q.original_question_id || null,
            question: q.question, // Send the text they got wrong
            answer: q.answer,     // Send the answer they missed
            subtopic: q.subtopic,
            difficulty: q.difficulty,
            current_bloom: q.bloom_taxonomy,
            target_bloom: downgradedBloom,
            image: q.image,
            description: q.description,
            is_review: true // Helpful flag for backend tracing
        };

        const result = await ResultAsync.fromPromise(
            fetch(`${backendUrl}/api/ai/review`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestPayload),
            }),
            (error) => ({ title: "Unreachable Server", reason: `Network Error: ${String(error)}` })
        ).andThen(response => {
            if (response.status === 404) return errAsync({ title: "Unreachable Server", reason: "The backend link is wrong." });
            return ResultAsync.fromPromise(response.json(), () => ({ title: "Parsing Error", reason: "Failed to parse response..." }))
                .andThen(data => {
                    if (!response.ok) return errAsync({ title: data?.detail?.title || "Error", reason: data?.detail?.reason || "An unknown error occurred" });

                    const aiQuestion = data.result.response;
                    aiQuestion.original_question_id = data.queries?.question_id;
                    aiQuestion.original_question = data.queries?.question;
                    aiQuestion.area = data.queries?.area;
                    aiQuestion.execution_time = data.execution_time_seconds;
                    aiQuestion.image = data.queries?.image || null;
                    aiQuestion.description = data.queries?.description || null;

                    if (data.result.error) {
                        aiQuestion.isMock = true;
                        aiQuestion.mockMessage = data.result.error;
                    }
                    return okAsync(aiQuestion);
                });
        });

        result.match(
            (data) => {
                setQuestion(data);
                setIsLoading(false);
                if (data.isMock) {
                    toast({ variant: "destructive", title: "Offline Mode", description: data.mockMessage });
                }
            },
            (err) => {
                toast({ variant: "destructive", title: err.title, description: err.reason });
                setFetchError(err);
                setIsLoading(false);
            }
        );
    };

    const handleAnswer = (index: number) => {
        if (showResult) return;
        setSelected(index);
        setShowResult(true);

        const isCorrect = question.options[index].toLowerCase() === question.answer.toLowerCase();

        // 1. Check if incorrect and NOT Remembering to add to review list (Only during Main Quiz)
        if (!isCorrect && !isReviewMode && question.bloom_taxonomy !== "Remembering") {
            setIncorrectQuestions(prev => {
                // Prevent duplicate entries
                if (!prev.some(q => q.original_question_id === question.original_question_id)) {
                    return [...prev, question];
                }
                return prev;
            });
        }

        let latestScores = knowledgeScores;

        // 2. SCORING LOGIC: Only update scores if it is the MAIN quiz
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

        // 3. DATABASE LOGGING: Route to the correct backend collection
        const currentTime = new Date().toISOString();
        const endpoint = isReviewMode ? "/api/reviews" : "/api/logs"; // <-- Routes to new collection!
        //console.log(question)
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
                    timestamp: currentTime,
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

        // 4. NEXT QUESTION TIMEOUT
        setTimeout(() => {
            if (isReviewMode) {
                // If reviewing, return to the finish screen after answering
                setFinished(true);
                setIsReviewMode(false);
                setSelected(null);
                setShowResult(false);
            } else if (currentIndex + 1 < TOTAL_QUESTIONS) {
                setCurrentIndex((i) => i + 1);
                setShowFallback(false);
                setSelected(null);
                setShowResult(false);
                loadNewQuestion(latestScores);
            } else {
                setFinished(true);
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

    if (isLoading || !question.question) {
        const handleGoBack = () => {
            navigate(token ? "/select" : "/");
        };

        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-6 text-center">
                    <div className="animate-pulse text-xl font-medium text-muted-foreground">
                        {isReviewMode ? "Downgrading difficulty logic..." : "Loading your next challenge..."}
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

                        {/* NEW: Review Section */}
                        {incorrectQuestions.length > 0 && (
                            <div className="mt-6 border-t pt-4 text-left">
                                <h4 className="text-sm font-bold text-foreground mb-1 flex items-center gap-2">
                                    <RotateCcw className="h-4 w-4" /> Review Incorrect Questions
                                </h4>
                                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                                    Retrying will test you on a downgraded Bloom's Taxonomy level to help build up your fundamentals.
                                </p>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                    {incorrectQuestions.map((iq, idx) => (
                                        <Button
                                            key={idx}
                                            variant="outline"
                                            className="cursor-pointer w-full justify-start text-left h-auto py-2 px-3 flex-col items-start gap-1.5"
                                            onClick={() => startReview(iq)}
                                        >
                                            <span className="text-xs font-semibold line-clamp-2 whitespace-normal">{iq.question}</span>
                                            <div className="flex items-center gap-2 w-full">
                                                <Badge variant="secondary" className="text-[9px] px-1.5">{iq.subtopic}</Badge>
                                                <Badge variant="outline" className="text-[9px] px-1.5 text-destructive ml-auto">
                                                    {iq.bloom_taxonomy} &rarr; {iq.bloom_taxonomy === 'Applying' ? 'Understanding' : 'Remembering'}
                                                </Badge>
                                            </div>
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}

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
                                        setIncorrectQuestions([]); // Clear reviews on a fresh start
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
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-2xl shadow-xl border-border/50 overflow-hidden">
                <div className="bg-muted/30 p-2 text-center text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border/40">
                    Connected to: {backendUrl}
                </div>
                <CardHeader className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>
                            {isReviewMode ? (
                                <span className="font-bold flex items-center gap-2 text-[#f97415]">
                                    <RotateCcw className="h-4 w-4" /> Review Session
                                </span>
                            ) : (
                                `Question ${currentIndex + 1} of ${TOTAL_QUESTIONS}`
                            )}
                        </span>
                        {!isReviewMode && <span className="font-semibold text-primary">Score: {score}</span>}
                    </div>

                    {!isReviewMode && <Progress value={progress} className="h-2" />}

                    {question.description && (
                        <p className="text-sm text-muted-foreground italic">{question.description}</p>
                    )}
                    {question.image && question.image.length > 0 && (
                        <QuizImageViewer images={question.image.split(",")} />
                    )}
                    <CardTitle className="text-xl font-bold text-foreground">{question.question}</CardTitle>

                    {/* Question Metadata Badges */}
                    <div id="metadata" className="flex flex-wrap items-center gap-2 pt-1">
                        {question.subtopic && (
                            <Badge variant="secondary" className={`text-xs font-bold`}>
                                {question.subtopic}
                            </Badge>
                        )}
                        {question.difficulty && (
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
                        {question.bloom_taxonomy && (
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
                        {question.options.map((option, i) => {
                            let variant: "outline" | "default" | "destructive" | "secondary" = "outline";
                            let icon = null;

                            if (showResult) {
                                const correctIndex = question.options.indexOf(question.answer);

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
