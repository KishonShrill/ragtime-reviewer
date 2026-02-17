import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Zap, PlayCircle, Lock, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

const subjects = ["General Science", "Chemistry", "Physics", "Biology"];

const SelectionPage = () => {
  const { user, role, logout, token } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [easy, setEasy] = useState("");
  const [medium, setMedium] = useState("");
  const [hard, setHard] = useState("");

  useEffect(() => {
    if (!token) navigate("/");
  }, [token, navigate]);

  const canStartQuiz = role === "admin" || role === "regular";
  const canFreeTrial = role === "admin" || role === "free-trial";
  const canAccessFilters = role === "admin"; // Admin only can use the bottom 3 dropdowns

  const handleStartQuiz = () => {
    if (!canStartQuiz) return;
    toast({ title: "Starting Quiz!", description: "Loading your customized questions..." });
    navigate("/quiz");
  };

  const handleFreeTrial = () => {
    if (!canFreeTrial) return;
    toast({ title: "Free Trial", description: "Entering trial mode..." });
    navigate("/quiz?mode=trial");
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (!token) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg shadow-xl border-border/50">
        <CardHeader className="text-center space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Hi, <span className="font-semibold text-foreground uppercase">{user}</span>{" "}
              <span className="inline-block rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent capitalize">
                {role?.replace("_", " ")}
              </span>
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1 text-muted-foreground">
              <LogOut className="h-3.5 w-3.5" /> Logout
            </Button>
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">Select Your Quiz</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="secondary"
              className="h-20 text-lg gap-2 relative"
              disabled={!canFreeTrial}
              onClick={handleFreeTrial}
            >
              {!canFreeTrial && <Lock className="absolute top-2 right-2 h-3.5 w-3.5 text-muted-foreground" />}
              <Zap className="h-5 w-5" />
              Free Trial
            </Button>
            <Button
              className="h-20 text-lg gap-2 relative"
              disabled={!canStartQuiz}
              onClick={handleStartQuiz}
            >
              {!canStartQuiz && <Lock className="absolute top-2 right-2 h-3.5 w-3.5 text-muted-foreground" />}
              <PlayCircle className="h-5 w-5" />
              Start Quiz
            </Button>
          </div>

          {/* Difficulty Dropdowns - Locked for non-admins */}
          <div className={`grid grid-cols-3 gap-3 transition-opacity ${!canAccessFilters ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            {[
              { label: "Easy", value: easy, onChange: setEasy },
              { label: "Medium", value: medium, onChange: setMedium },
              { label: "Hard", value: hard, onChange: setHard },
            ].map(({ label, value, onChange }) => (
              <div key={label} className="space-y-2">
                <div className="flex items-center gap-1">
                   <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {label}
                  </Label>
                  {!canAccessFilters && <Lock className="h-2.5 w-2.5 text-muted-foreground" />}
                </div>
                <Select value={value} onValueChange={onChange} disabled={!canAccessFilters}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s} value={s.toLowerCase()}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          
          {!canAccessFilters && (
            <p className="text-center text-xs text-muted-foreground italic">
              Difficulty selection is restricted to Admin accounts.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SelectionPage;

