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
import { Zap, PlayCircle, LogOut, Database, Shield, BookOpen, UserCircle, FileText, QrCode, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

const subjects = ["General Science", "Chemistry", "Physics", "Biology"];

const SelectionPage = () => {
    const { user, role, logout, token } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    // Dropdown states for Admin testing
    const [easy, setEasy] = useState("");
    const [medium, setMedium] = useState("");
    const [hard, setHard] = useState("");
    const [width] = useState(() => window.innerWidth);

    useEffect(() => {
        if (!token) {
            toast({
                title: "Illegal Entry",
                description: `Please sign in first!`,
            });
            navigate("/");
        }
    }, [token, navigate, toast]);

    if (!token) return null;

    const isAdmin = role === "admin";
    // We assume any logged-in user who reaches here can take the normal quiz
    const canStartQuiz = role === "admin" || role === "regular";

    const handleStartQuiz = () => {
        if (!canStartQuiz) return;
        toast({ title: "Starting Quiz!", description: "Loading your customized questions..." });
        navigate("/quiz", {
            state: { started: true },
        });
    };

    // Previously "handleFreeTrial" - now strictly an Admin testing tool
    const handleAdminTestQuiz = () => {
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

        if (!selectedSubject) {
            toast({
                title: "Selection Required",
                description: "Please select a subject and difficulty to run a test.",
                variant: "destructive"
            });
            return;
        }

        toast({
            title: "Admin Test Run",
            description: `Loading ${selectedDifficulty} ${selectedSubject} questions...`
        });

        const queryParams = new URLSearchParams({
            mode: "trial",
            difficulty: selectedDifficulty,
            subject: selectedSubject
        }).toString();

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

    const handleProfile = () => navigate("/profile");

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4 py-8">
            <Card className="w-full max-w-lg shadow-xl border-border/50">

                {/* --- HEADER (Visible to Everyone) --- */}
                <CardHeader className="text-center space-y-2 pb-4">
                    <div className="flex items-center justify-between">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleProfile}
                            className="text-sm text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600 transition-colors"
                        >{width > 600
                            ? (
                                <>
                                    Hi, <span className="font-semibold text-foreground uppercase mx-1">{user}</span>
                                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${isAdmin ? 'bg-destructive/15 text-destructive' : 'bg-accent/15 text-accent'}`}>
                                        {role?.replace("_", " ")}
                                    </span>
                                </>
                            ) : (
                                <><UserCircle className="h-3.5 w-3.5" />Profile</>
                            )}
                        </Button>
                        {width <= 600 && (
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${isAdmin ? 'bg-destructive/15 text-destructive' : 'bg-accent/15 text-accent'}`}>
                                {role?.replace("_", " ")}
                            </span>
                        )}
                        <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1 text-muted-foreground">
                            Logout <LogOut className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="space-y-8">

                    {/* --- STUDENT CONSOLE (Visible to Everyone) --- */}
                    <div className="space-y-6">
                        <div className="text-center space-y-1">
                            <CardTitle className="text-2xl font-bold text-foreground">Adaptive Reviewer</CardTitle>
                            <p className="text-sm text-muted-foreground">Ready to test your knowledge?</p>
                        </div>

                        <Button
                            className="w-full h-20 text-lg gap-3 shadow-md transition-transform active:scale-[0.98]"
                            disabled={!canStartQuiz}
                            onClick={handleStartQuiz}
                        >
                            <PlayCircle className="h-6 w-6" />
                            Start Adaptive Quiz
                        </Button>
                    </div>

                    {/* --- EVALUATION FORM (Visible to Everyone) --- */}
                    <div className="pt-6 border-t border-border/60 flex flex-col items-center text-center space-y-4">
                        <div className="space-y-1">
                            <h3 className="font-bold text-foreground flex items-center justify-center gap-2">
                                <QrCode className="h-4 w-4 text-primary" />
                                App Evaluation Form
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Scan the QR code or click the link below to provide your feedback after testing.
                            </p>
                        </div>

                        <img
                            src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://docs.google.com/forms/d/e/1FAIpQLSc9BRsQwIjl-AfXLy3mGLaf1NsjTK5v_4iBtZe9qLimw67h5Q/viewform?usp=publish-editor"
                            alt="Google Form QR Code"
                            className="h-36 w-36 rounded-md shadow-sm border border-border/50 p-1 bg-white"
                        />

                        <Button variant="outline" size="sm" asChild className="w-full">
                            <a
                                href="https://docs.google.com/forms/d/e/1FAIpQLSc9BRsQwIjl-AfXLy3mGLaf1NsjTK5v_4iBtZe9qLimw67h5Q/viewform?usp=publish-editor"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Open Form in Browser
                            </a>
                        </Button>
                    </div>

                    {/* --- ADMIN CONSOLE (Visible only to Admins) --- */}
                    {isAdmin && (
                        <div className="pt-6 border-t border-border/60 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-destructive" />
                                <h3 className="text-lg font-bold text-foreground tracking-tight">Admin Console</h3>
                            </div>

                            {/* Admin Actions */}
                            <div className="flex gap-4">
                                <Button
                                    variant="outline"
                                    className="w-full h-12 gap-2 justify-start px-4"
                                    onClick={() => navigate("/knowledge_base")}
                                >
                                    <Database className="h-4 w-4 text-primary" />
                                    Knowledge Base Explorer
                                </Button>

                                {/* SME Validation Generator Button */}
                                <Button
                                    variant="outline"
                                    className="w-full h-12 gap-2 justify-start px-4"
                                    onClick={() => navigate("/sme-validation")}
                                >
                                    <FileText className="h-4 w-4 text-primary" />
                                    SME Validation Generator
                                </Button>
                            </div>

                            {/* Test Configuration */}
                            <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border/50">
                                <div className="flex items-center gap-2 mb-2">
                                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                                    <Label className="font-semibold text-foreground">Test Specific Configuration</Label>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { label: "Easy", value: easy, setter: setEasy, clear: [setMedium, setHard] },
                                        { label: "Medium", value: medium, setter: setMedium, clear: [setEasy, setHard] },
                                        { label: "Hard", value: hard, setter: setHard, clear: [setEasy, setMedium] },
                                    ].map(({ label, value, setter, clear }) => (
                                        <div key={label} className="space-y-2">
                                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                {label}
                                            </Label>
                                            <Select
                                                value={value}
                                                onValueChange={(val) => {
                                                    setter(val === "null" ? "" : val);
                                                    clear[0]("");
                                                    clear[1]("");
                                                }}
                                            >
                                                <SelectTrigger className="h-9 bg-background">
                                                    <SelectValue placeholder="Subject" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="null">Subject</SelectItem>
                                                    {subjects.map((s) => (
                                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ))}
                                </div>

                                <Button
                                    variant="secondary"
                                    className="w-full mt-4 gap-2 border border-border/50"
                                    onClick={handleAdminTestQuiz}
                                >
                                    <Zap className="h-4 w-4" />
                                    Run Trial Quiz
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default SelectionPage;
