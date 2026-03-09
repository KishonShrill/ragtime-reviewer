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
    if (!token) return null;

    const canStartQuiz = role === "admin" || role === "regular";
    const canFreeTrial = role === "admin" || role === "regular" || role === "free_trial";
    const canAccessFilters = canFreeTrial; // Admin only can use the bottom 3 dropdowns

    const handleStartQuiz = () => {
        if (!canStartQuiz) return;
        toast({ title: "Starting Quiz!", description: "Loading your customized questions..." });
        navigate("/quiz", {
            state: { started: true },
        });
    };

    const handleFreeTrial = () => {
        if (!canFreeTrial) return;

        // 1. Figure out which difficulty and subject the user picked
        let selectedDifficulty = "";
        let selectedSubject = "";

        if (easy) {
            selectedDifficulty = "Easy";
            selectedSubject = easy;
        } else if (medium) {
            selectedDifficulty = "Medium";
            selectedSubject = medium;
        } else if (hard) {
            selectedDifficulty = "Hard";
            selectedSubject = hard;
        }

        // Optional: Stop the user if they didn't pick anything
        if (!selectedSubject) {
            toast({
                title: "Selection Required",
                description: "Please select a subject and difficulty for the trial.",
                variant: "destructive"
            });
            return;
        }

        toast({
            title: "Free Trial",
            description: `Loading ${selectedDifficulty} ${selectedSubject} questions...`
        });

        // 2. Build the dynamic URL query string safely
        const queryParams = new URLSearchParams({
            mode: "trial",
            difficulty: selectedDifficulty,
            subject: selectedSubject
        }).toString();

        // Result looks like: /quiz?mode=trial&difficulty=easy&subject=chemistry
        navigate(`/quiz?${queryParams}`, {
            state: {
                started: true,
                difficulty: selectedDifficulty,
                subject: selectedSubject
            },
        });
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
                    {/* Difficulty Dropdowns - Locked for non-admins */}
                    <div className={`grid grid-cols-3 gap-3 transition-opacity ${!canAccessFilters ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                        {[
                            {
                                label: "Easy",
                                value: easy,
                                onChange: (val: string) => {
                                    setEasy(val === "null" ? "" : val);
                                    setMedium("");
                                    setHard("");
                                }
                            },
                            {
                                label: "Medium",
                                value: medium,
                                onChange: (val: string) => {
                                    setMedium(val === "null" ? "" : val);
                                    setEasy("");
                                    setHard("");
                                }
                            },
                            {
                                label: "Hard",
                                value: hard,
                                onChange: (val: string) => {
                                    setHard(val === "null" ? "" : val);
                                    setEasy("");
                                    setMedium("");
                                }
                            },
                        ].map(({ label, value, onChange }) => (
                            <div key={label} className="space-y-2">
                                {/* ... rest of your label mapping remains exactly the same ... */}
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
                                        <SelectItem key="Subject" value="null">Subject</SelectItem>
                                        {subjects.map((s) => (
                                            <SelectItem key={s} value={s}>
                                                {s}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ))}
                    </div>

                </CardContent>
            </Card>
        </div>
    );
};

export default SelectionPage;

