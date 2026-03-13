import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, ArrowLeft, Trophy } from "lucide-react";
import { ResultAsync, errAsync, okAsync } from "neverthrow";
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
    // 1. Determine if we are looking at the reward or penalty matrix
    const resultType: string = isCorrect ? "correct" : "incorrect";

    // 2. Fetch the exact modifier. (The '?.' safely handles any weird unexpected inputs)
    const delta: number = SCORING_MATRIX[resultType][bloomLevel]?.[difficulty] || 0.0;

    // 3. Apply the math
    let newScore = isCorrect ? currentScore + delta : currentScore - delta;

    // 4. Bound the score between 0.0 and 1.0
    newScore = Math.max(0.0, Math.min(1.0, newScore));

    // 5. Clean up JavaScript floating point errors (e.g., returns 0.62 instead of 0.6200000001)
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
    const isTrial = mode === "trial";

    const [showFallback, setShowFallback] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selected, setSelected] = useState<number | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [fetchError, setFetchError] = useState<{ title: string, reason: string } | null>(null);

    const [score, setScore] = useState(0);
    const [finished, setFinished] = useState(false);
    const TOTAL_QUESTIONS = isTrial ? 1 : 10;
    const [question, setQuestion] = useState<Question>({
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

    useEffect(() => {
        if (!token) {
            toast({
                title: "Illegal Entry",
                description: `Please sign in first!`,
            });
            navigate("/");
        }

        // If they didn't click the start button (state is null/undefined)
        if (!location.state?.started) {
            toast({
                variant: "destructive",
                title: "Unaccessible",
                description: "Please start the quiz on selection page",
            });
            // Use replace: true so they don't get stuck in a back-button loop
            navigate("/select", { replace: true });
        }
    }, [token, navigate, location]);
    if (!token || !location.state?.started) return null;

    useEffect(() => {
        if (token) loadNewQuestion();
    }, [token]);

    useEffect(() => {
        let timer: number; // Browser setTimeout returns a number ID
        if (isLoading || !question) {
            timer = window.setTimeout(() => {
                setShowFallback(true);
            }, 7000);
        }

        return () => clearTimeout(timer);
    }, [isLoading, question]);

    // const question: QuizQuestion = mockQuizData[currentIndex];
    const progress = ((currentIndex) / TOTAL_QUESTIONS) * 100;

    const fetchQuestion = (overrideScores?: typeof knowledgeScores) => {
        const scoresToUse = overrideScores || knowledgeScores;
        console.log("Fetching with scores:", JSON.stringify(scoresToUse));

        const requestPayload = isTrial
            ? {
                subject: trialSubject,
                difficulty: trialDifficulty,
                is_trial: true
            }
            : {
                scores: scoresToUse,
                subject: "Chemistry" // Or wherever you plan to get the normal subject from!
            };

        return ResultAsync.fromPromise(
            fetch(`${backendUrl}/api/ai/question`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

                // initializeSetup(data as AuthResponseData, cleanUrl);
                console.log(`Raw: ${JSON.stringify(data)}`)

                // 1. Extract the actual generated question data
                const aiQuestion = data.result.response;
                aiQuestion.original_question_id = data.queries.question_id;
                aiQuestion.original_question = data.queries.question;

                if (typeof aiQuestion === 'string') {
                    return errAsync({
                        title: "Backend Generation Error",
                        reason: data.result.error // Shows the Python error in your toast notification
                    });
                }

                // 2. Attach the image from the original seed query
                aiQuestion.image = data.queries?.image || null;

                // 3. Check for the mock fallback error and pass it to the component
                if (data.result.error) {
                    aiQuestion.isMock = true;
                    aiQuestion.mockMessage = data.result.error;
                }

                console.log({ aiQuestion })
                return okAsync(aiQuestion);
            });
        }).mapErr((err) => {
            // Ensure loading is off on error
            return err;
        }).map((val) => {
            // Ensure loading is off on success
            return val;
        });
    }

    const loadNewQuestion = async (overrideScores?: typeof knowledgeScores) => {
        setIsLoading(true);
        setFetchError(null);

        const result = await fetchQuestion(overrideScores);
        result.match(
            (data) => {
                console.log(`New Question: ${JSON.stringify(data)}`)
                setQuestion(data);
                setIsLoading(false);

                // Warn the user if they are receiving the mock fallback
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

    const handleAnswer = (index: number) => {
        if (showResult) return;
        setSelected(index);
        setShowResult(true);

        const isCorrect = question.options[index].toLowerCase() === question.answer.toLowerCase();

        // Calculate the new adaptive score
        const updatedMasteryScore = calculateNewMasteryScore(
            knowledgeScores?.[question.subtopic]?.mastery_score,       // Current score (e.g., 0.5)
            isCorrect,                                                 // True or False
            question.bloom_taxonomy,                                   // e.g., "Understanding"
            question.difficulty                                        // e.g., "Medium"
        );
        updateKnowledgeScores(question.subtopic, updatedMasteryScore);

        let latestScores = knowledgeScores;
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

            ResultAsync.fromPromise(
                fetch(`${backendUrl}/api/logs`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        data: question,
                        isCorrect,
                        latestScores
                    }),
                }),
                (error) => ({ title: "Unreachable Server", reason: `Network Error: ${String(error)}` })
            ).mapErr(() => {
                toast({
                    variant: "destructive",
                    title: "Unreachable Server",
                    description: `Network Error: Logging did not go through...`
                })
            })

        } else {
            // Simulate POST to /retry

            // remake this later using the mongodb for prod
            //await fetch(`${baseUrl}/retry`, {
            //  method: "POST",
            //  headers: {
            //    "Content-Type": "application/json",
            //    "Authorization": `Bearer ${token}`
            //  },
            //  body: JSON.stringify(question),
            //});

            toast({
                variant: "destructive",
                title: "❌ Wrong!",
                description: `Score dropped to ${updatedMasteryScore}`,
            });
        }

        setTimeout(() => {
            if (currentIndex + 1 < TOTAL_QUESTIONS) {
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
                        Loading your next challenge...
                    </div>

                    {/* Conditional Rendering based on the 15s timer */}
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
                        <p className="text-muted-foreground text-sm italic">
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
                            Question {currentIndex + 1} of {TOTAL_QUESTIONS}
                        </span>
                        <span className="font-semibold text-primary">Score: {score}</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    {question.description && (
                        <p className="text-sm text-muted-foreground italic">{question.description}</p>
                    )}
                    {question.image && (
                        <img
                            src={question.image}
                            alt="Question illustration"
                            className="w-full h-48 object-cover rounded-lg"
                        />
                    )}
                    <CardTitle className="text-xl font-bold text-foreground">{question.question}</CardTitle>
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
        </div>
    );
};

export default QuizPage;

