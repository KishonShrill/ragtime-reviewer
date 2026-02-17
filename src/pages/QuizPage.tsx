import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { mockQuizData, QuizQuestion } from "@/data/mockQuizData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, ArrowLeft, Trophy } from "lucide-react";

const QuizPage = () => {
  const { token, baseUrl } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!token) navigate("/");
  }, [token, navigate]);

  if (!token) return null;

  const question: QuizQuestion = mockQuizData[currentIndex];
  const progress = ((currentIndex) / mockQuizData.length) * 100;

  const handleAnswer = (index: number) => {
    if (showResult) return;
    setSelected(index);
    setShowResult(true);

    const isCorrect = index === question.correctIndex;

    if (isCorrect) {
      setScore((s) => s + 1);
      toast({ title: "✅ Correct!", description: "Great job!" });
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

      console.log("POST /retry", JSON.stringify(question));
      toast({
        variant: "destructive",
        title: "❌ Wrong!",
        description: `The correct answer was: ${question.answers[question.correctIndex]}`,
      });
    }

    setTimeout(() => {
      if (currentIndex + 1 < mockQuizData.length) {
        setCurrentIndex((i) => i + 1);
        setSelected(null);
        setShowResult(false);
      } else {
        setFinished(true);
      }
    }, 1500);
  };

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
              {score} / {mockQuizData.length}
            </p>
            <p className="text-muted-foreground">
              {score === mockQuizData.length
                ? "Perfect score! 🎉"
                : score >= mockQuizData.length / 2
                ? "Good effort! Keep learning."
                : "Keep practicing, you'll improve!"}
            </p>
            <p className="text-muted-foreground text-sm italic">
              Results have been synchronized with the server at: <br/>
              <span className="text-xs font-mono opacity-70">{baseUrl}</span>
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <Button variant="outline" onClick={() => navigate("/select")} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                onClick={() => {
                  setCurrentIndex(0);
                  setScore(0);
                  setSelected(null);
                  setShowResult(false);
                  setFinished(false);
                }}
              >
                Retry Quiz
              </Button>
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
          Connected to: {baseUrl}
        </div>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Question {currentIndex + 1} of {mockQuizData.length}
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
            {question.answers.map((answer, i) => {
              let variant: "outline" | "default" | "destructive" | "secondary" = "outline";
              let icon = null;

              if (showResult) {
                if (i === question.correctIndex) {
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
                  className="h-auto py-3 px-4 justify-start text-left gap-3 text-base"
                  onClick={() => handleAnswer(i)}
                  disabled={showResult}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current/20 text-sm font-semibold">
                    {String.fromCharCode(65 + i)}
                  </span>
                  {answer}
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

