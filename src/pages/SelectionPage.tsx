import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Zap, PlayCircle, LogOut, Database, Shield,
    UserCircle, FileText, QrCode, ExternalLink, FileCode,
    Download, Activity, Settings2
} from "lucide-react";

const subjects = ["General Science", "Chemistry", "Physics", "Biology"];
const difficulties = ["Easy", "Medium", "Hard"];

export default function SelectionPage() {
    const navigate = useNavigate();
    const { toast } = useToast();

    // Fetch auth data directly from localStorage instead of useAuth
    const user = localStorage.getItem('reviewer_user');
    const role = localStorage.getItem('reviewer_role');
    const token = localStorage.getItem('reviewer_token');

    // Simplified Admin Test states
    const [testSubject, setTestSubject] = useState("");
    const [testDifficulty, setTestDifficulty] = useState("");

    useEffect(() => {
        if (!token) {
            toast({
                title: "Authentication Required",
                description: `Please sign in to access the dashboard.`,
                variant: "destructive"
            });
            navigate("/");
        }
    }, [token, navigate, toast]);

    if (!token) return null;

    const isAdmin = role === "admin";
    const canStartQuiz = role === "admin" || role === "regular";

    const handleLogout = () => {
        // Clear everything from localStorage
        localStorage.removeItem('reviewer_token');
        localStorage.removeItem('reviewer_role');
        localStorage.removeItem('reviewer_email');
        localStorage.removeItem('reviewer_user');
        localStorage.removeItem('reviewer_backend_url');
        localStorage.removeItem('reviewer_knowledge_scores');
        localStorage.removeItem(`reviewer_quizLogs_${user}`);

        navigate("/");
    };

    const handleStartQuiz = () => {
        if (!canStartQuiz) return;
        toast({ title: "Starting Quiz!", description: "Loading your customized questions..." });
        navigate("/quiz", { state: { started: true } });
    };

    const handleAdminTestQuiz = () => {
        if (!testSubject || !testDifficulty) {
            toast({
                title: "Selection Required",
                description: "Please select both a subject and difficulty to run a test.",
                variant: "destructive"
            });
            return;
        }

        toast({
            title: "Admin Test Run",
            description: `Loading ${testDifficulty} ${testSubject} questions...`
        });

        const queryParams = new URLSearchParams({
            mode: "trial",
            difficulty: testDifficulty,
            subject: testSubject
        }).toString();

        navigate(`/quiz?${queryParams}`, {
            state: {
                started: true,
                difficulty: testDifficulty,
                subject: testSubject
            },
        });
    };

    return (
        <div className="min-h-screen bg-zinc-50/50 p-4 md:p-8">
            <div className="mx-auto max-w-4xl space-y-6">

                {/* --- DASHBOARD HEADER --- */}
                <header className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm border border-border/50">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <UserCircle className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="font-semibold text-lg leading-none uppercase">{user}</h1>
                                <Badge variant={isAdmin ? "destructive" : "secondary"} className="h-5 capitalize">
                                    {role?.replace("_", " ")}
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">Welcome to your dashboard</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button variant="outline" size="sm" onClick={() => navigate("/profile")} className="w-full sm:w-auto">
                            <UserCircle className="h-4 w-4 mr-2" /> Profile
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-destructive font-bold w-full sm:w-auto">
                            <LogOut className="h-4 w-4 mr-2" /> Logout
                        </Button>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                    {/* --- MAIN ACTION AREA (Left Column on Desktop) --- */}
                    <div className={`${role === "regular" ? 'md:col-span-12' : 'md:col-span-7'} space-y-6`}>

                        {/* Student Console */}
                        <Card className="border-primary/20 shadow-md">
                            <CardHeader>
                                <CardTitle className="text-2xl flex items-center gap-2">
                                    <PlayCircle className="h-6 w-6 text-primary" />
                                    Adaptive Reviewer
                                </CardTitle>
                                <CardDescription>Start your personalized learning session based on your current knowledge scores.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button
                                    className="w-full h-16 text-lg gap-3 shadow-sm transition-transform active:scale-[0.98]"
                                    disabled={!canStartQuiz}
                                    onClick={handleStartQuiz}
                                >
                                    <Zap className="h-5 w-5" />
                                    Start Adaptive Quiz
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Resources & Feedback */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Card>
                                <CardContent className="pt-6 text-center space-y-4">
                                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                                        <FileCode className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="font-semibold">Offline Materials</h3>
                                        <p className="text-xs text-muted-foreground leading-tight">Get the required Google Colab files for offline review sessions.</p>
                                    </div>
                                    <Button variant="outline" className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200" asChild>
                                        <a href="https://we.tl/t-8BJ273u8Toz01Bx1" target="_blank" rel="noopener noreferrer">
                                            <Download className="h-4 w-4 mr-2" /> Download
                                        </a>
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-6 text-center space-y-4">
                                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
                                        <QrCode className="h-6 w-6 text-zinc-600" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="font-semibold">App Evaluation</h3>
                                        <p className="text-xs text-muted-foreground leading-tight">Provide your feedback after testing the adaptive features.</p>
                                    </div>
                                    <Button variant="outline" className="w-full" asChild>
                                        <a href="https://docs.google.com/forms/d/e/1FAIpQLSc9BRsQwIjl-AfXLy3mGLaf1NsjTK5v_4iBtZe9qLimw67h5Q/viewform?usp=publish-editor" target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="h-4 w-4 mr-2" /> Open Form
                                        </a>
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* --- ADMIN CONSOLE (Right Column on Desktop) --- */}
                    {isAdmin && (
                        <div className="md:col-span-5 space-y-6">
                            <Card className="border-destructive/20 bg-destructive/5 shadow-none h-full">
                                <CardHeader className="pb-4 border-b border-destructive/10">
                                    <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                                        <Shield className="h-5 w-5" /> Admin Console
                                    </CardTitle>
                                    <CardDescription>Manage knowledge bases and system latency.</CardDescription>
                                </CardHeader>

                                <CardContent className="pt-6 space-y-6">
                                    {/* Admin Actions */}
                                    <div className="space-y-3">
                                        <Button variant="secondary" className="text-black w-full justify-start bg-white hover:bg-zinc-100 border shadow-sm" onClick={() => navigate("/knowledge_base")}>
                                            <Database className="h-4 w-4 mr-3 text-muted-foreground" /> Knowledge Base
                                        </Button>
                                        <Button variant="secondary" className="text-black w-full justify-start bg-white hover:bg-zinc-100 border shadow-sm" onClick={() => navigate("/sme-validation")}>
                                            <FileText className="h-4 w-4 mr-3 text-muted-foreground" /> SME Validation
                                        </Button>
                                        <Button variant="secondary" className="text-black w-full justify-start bg-white hover:bg-zinc-100 border shadow-sm" onClick={() => navigate("/latency")}>
                                            <Activity className="h-4 w-4 mr-3 text-muted-foreground" /> Latency Analytics
                                        </Button>
                                    </div>

                                    {/* Test Configurator */}
                                    <div className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
                                        <div className="flex items-center gap-2 border-b pb-2">
                                            <Settings2 className="h-4 w-4 text-muted-foreground" />
                                            <h4 className="font-semibold text-sm">Test Specific Config</h4>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs text-muted-foreground">Subject</Label>
                                                <Select value={testSubject} onValueChange={setTestSubject}>
                                                    <SelectTrigger className="h-9">
                                                        <SelectValue placeholder="Select topic" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {subjects.map((s) => (
                                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label className="text-xs text-muted-foreground">Difficulty</Label>
                                                <Select value={testDifficulty} onValueChange={setTestDifficulty}>
                                                    <SelectTrigger className="h-9">
                                                        <SelectValue placeholder="Select level" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {difficulties.map((d) => (
                                                            <SelectItem key={d} value={d}>{d}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <Button
                                                className="w-full mt-2 bg-zinc-900 hover:bg-zinc-800"
                                                onClick={handleAdminTestQuiz}
                                            >
                                                <PlayCircle className="h-4 w-4 mr-2" /> Run Trial
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
