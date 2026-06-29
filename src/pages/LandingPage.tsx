import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Brain, LogIn, UserPlus, Sparkles, Shield, Server, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConfigStore } from "@/stores/useConfigStore";

export default function LandingPage() {
    const [isLogin, setIsLogin] = useState<boolean>(true);
    const [loading, setLoading] = useState<boolean>(false);
    const [showSettings, setShowSettings] = useState<boolean>(false);

    const navigate = useNavigate();
    const { toast } = useToast();

    const token = localStorage.getItem("reviewer_token");
    const backendUrl = useConfigStore((state) => state.backendUrl);
    const setBackendUrl = useConfigStore((state) => state.setBackendUrl)

    useEffect(() => {
        if (token) {
            // Use replace: true so the user can't use the browser's back button to return to the login screen
            navigate("/select", { replace: true });
        }
    }, [navigate]);

    // Form State
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        secret: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const endpoint = isLogin ? "/api/auth/login" : "/api/auth/signup";
            const response = await fetch(`${backendUrl}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            // 1. Catch backend errors (e.g., wrong password, user exists)
            if (!response.ok) {
                // Adjust data.detail depending on how your FastAPI backend formats errors
                setIsLogin(false)
                throw new Error(data?.detail?.reason || data?.detail || "Authentication failed");
            }

            // 2. THE FIX: Save everything to localStorage so other pages know you are logged in
            localStorage.setItem('reviewer_token', data.access_token);
            localStorage.setItem('reviewer_role', data.role ?? '');
            localStorage.setItem('reviewer_email', data.email ?? '');
            localStorage.setItem('reviewer_user', data.username);

            // Safely store knowledge scores or an empty object if undefined
            localStorage.setItem(
                'reviewer_knowledge_scores',
                JSON.stringify(data.knowledge_scores?.subtopic || {})
            );

            toast({
                title: isLogin ? "Welcome back!" : "Account created!",
                description: `Successfully logged in as ${data.username}`,
            });

            navigate("/select");
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Authentication Failed",
                description: error.message || `Could not connect to ${backendUrl}. Check your server settings.`,
            });
        } finally {
            setLoading(false);
        }
    };

    if (token) return null;

    return (
        <div className="flex min-h-screen bg-background">
            {/* Left Panel - Branding & Visuals (Hidden on mobile) */}
            <div className="hidden w-1/2 flex-col justify-between bg-zinc-900 p-12 text-white lg:flex relative overflow-hidden">
                {/* Decorative background elements */}
                <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
                    <div className="absolute top-[25%] left-[10%] w-96 h-96 rounded-full bg-primary blur-[128px]" />
                    <div className="absolute top-[60%] right-[10%] w-96 h-96 rounded-full bg-purple-500 blur-[128px]" />
                </div>

                <div className="relative z-10 flex items-center gap-2 font-bold text-2xl">
                    <Brain className="h-8 w-8 text-primary" />
                    <span>Ragtime Review App</span>
                </div>

                <div className="relative z-10 space-y-6 max-w-md">
                    <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
                        Master any topic with intelligent quizzes.
                    </h1>
                    <p className="text-zinc-400 text-lg">
                        Join thousands of learners challenging themselves daily. Create, share, and track your progress all in one place.
                    </p>
                    <div className="flex gap-4 text-sm font-medium text-zinc-300">
                        <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
                            <Sparkles className="h-4 w-4 text-yellow-400" /> Smart Analytics
                        </div>
                        <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
                            <Shield className="h-4 w-4 text-green-400" /> Secure Data
                        </div>
                    </div>
                </div>

                <div className="relative z-10 text-sm text-zinc-500">
                    © 2026 Ragtime Review. All rights reserved.
                </div>
            </div>

            {/* Right Panel - Auth Form */}
            <div className="flex w-full items-center justify-center p-8 lg:w-1/2">
                <div className="w-full max-w-sm space-y-8 relative">

                    {/* Mobile Header (Hidden on Desktop) */}
                    <div className="flex items-center gap-2 font-bold text-2xl lg:hidden mb-8 justify-center">
                        <Brain className="h-8 w-8 text-primary" />
                        <span>Ragtime Reviewer</span>
                    </div>

                    <div className="absolute -top-4 -right-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-primary"
                            onClick={() => setShowSettings(!showSettings)}
                        >
                            <Settings2 className="h-5 w-5" />
                        </Button>
                    </div>

                    <div className="space-y-2 text-center lg:text-left">
                        <h2 className="text-3xl font-bold tracking-tight">
                            {isLogin ? "Welcome back" : "Create an account"}
                        </h2>
                        <p className="text-muted-foreground">
                            {isLogin
                                ? "Enter your credentials to access your dashboard"
                                : "Enter your details to get started on your journey"}
                        </p>
                    </div>

                    {/* Expandable Server Settings Menu */}
                    {showSettings && (
                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3 animate-in slide-in-from-top-2">
                            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                                <Server className="h-4 w-4" />
                                Connection Settings
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="server-url" className="text-xs">Active Backend URL</Label>
                                <Input
                                    id="server-url"
                                    type="url"
                                    value={backendUrl}
                                    onChange={(e) => setBackendUrl(e.target.value)}
                                    className="h-9 text-xs bg-background"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="w-full text-xs h-8"
                                    onClick={() => setBackendUrl("http://localhost:8000")}
                                >
                                    Local
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="w-full text-xs h-8"
                                    onClick={() => setBackendUrl("https://api.yourdomain.com")}
                                >
                                    Online
                                </Button>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder="johndoe"
                                    value={formData.username}
                                    onChange={handleChange}
                                    required
                                    className="h-11"
                                />
                            </div>

                            {!isLogin && (
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@example.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        className="h-11"
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    className="h-11"
                                />
                            </div>

                            {!isLogin && (
                                <div className="space-y-2">
                                    <Label htmlFor="secret">Secret Registration Key</Label>
                                    <Input
                                        id="secret"
                                        type="password"
                                        placeholder="Provided by admin"
                                        value={formData.secret}
                                        onChange={handleChange}
                                        required
                                        className="h-11"
                                    />
                                </div>
                            )}
                        </div>

                        <Button type="submit" className="w-full h-11 text-md" disabled={loading}>
                            {loading ? (
                                "Processing..."
                            ) : (
                                <>
                                    {isLogin ? "Sign In" : "Sign Up"}
                                    {isLogin ? <LogIn className="ml-2 h-4 w-4" /> : <UserPlus className="ml-2 h-4 w-4" />}
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="text-center text-sm">
                        <span className="text-muted-foreground">
                            {isLogin ? "Don't have an account? " : "Already have an account? "}
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setFormData({ username: "", email: "", password: "", secret: "" });
                            }}
                            className="font-medium text-primary hover:underline"
                        >
                            {isLogin ? "Sign up now" : "Log in instead"}
                        </button>
                    </div>

                    {!isLogin && (
                        <div className="mt-8 rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground shadow-sm">
                            <p className="font-semibold mb-1 text-foreground">Developer Hints:</p>
                            <ul className="space-y-1 ml-4 list-disc">
                                <li>API: <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">https://api.quizapp.com</code></li>
                                <li>Valid secrets: <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">admin123</code>, <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">trial123</code></li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
