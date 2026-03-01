import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Brain, LogIn, UserPlus } from "lucide-react";

const LandingPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState("");
    const [backendUrl, setBackendUrl] = useState("");
    const [password, setPassword] = useState("");
    const [secret, setSecret] = useState("");
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const res = await login(username, backendUrl, password, secret);
        res.match(
            (success) => {
                toast({
                    title: isLogin ? "Welcome back!" : "Account created!",
                    description: `Logged in as ${success.username}`,
                });
                navigate("/select");
            }, (error) => {
                toast({
                    variant: "destructive",
                    title: error?.title || "Login Failed",
                    description: error.reason,
                });
                setLoading(false);
            })
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md shadow-xl border-border/50">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-2">
                        <Brain className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold">
                        {isLogin ? "Welcome Back" : "Create Account"}
                    </CardTitle>
                    <CardDescription>
                        {isLogin
                            ? "Enter your details to access your quizzes"
                            : "Fill in the information below to get started"}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                placeholder="johndoe"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="backendUrl">Backend URL</Label>
                            <Input
                                id="backendUrl"
                                placeholder="https://api.quizapp.com"
                                value={backendUrl}
                                onChange={(e) => setBackendUrl(e.target.value)}
                                required
                            />
                        </div>

                        {/* 3. Conditional Fields for Sign Up only */}
                        {!isLogin && (
                            <div className="space-y-2">
                                <Label htmlFor="secret">Secret Password</Label>
                                <Input
                                    id="secret"
                                    type="password"
                                    placeholder="Master secret"
                                    value={secret}
                                    onChange={(e) => setSecret(e.target.value)}
                                    required
                                />
                            </div>
                        )}

                        <Button type="submit" className="w-full gap-2 mt-2" disabled={loading}>
                            {isLogin ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                            {loading ? "Processing..." : (isLogin ? "Login" : "Sign Up")}
                        </Button>
                    </form>
                </CardContent>

                <CardFooter className="flex flex-col space-y-2">
                    <div className="text-sm text-center">
                        <span className="text-muted-foreground">
                            {isLogin ? "Don't have an account?" : "Already have an account?"}
                        </span>
                        {" "}
                        <button
                            type="button"
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-primary font-medium hover:underline underline-offset-4"
                        >
                            {isLogin ? "Sign up" : "Login"}
                        </button>
                    </div>

                    {!isLogin && (
                        <div className="text-[10px] text-center text-muted-foreground bg-muted/30 p-2 rounded-lg">
                            <p className="text-xs text-center text-muted-foreground">
                                Hint: URL is <code className="bg-muted px-1 rounded">https://api.quizapp.com</code>
                                <br />
                                Secret Passwords: <code className="bg-muted px-1 rounded">admin123</code>,{" "}
                                <code className="bg-muted px-1 rounded">regular123</code>,{" "}
                                <code className="bg-muted px-1 rounded">trial123</code>
                            </p>
                        </div>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
};

export default LandingPage;

