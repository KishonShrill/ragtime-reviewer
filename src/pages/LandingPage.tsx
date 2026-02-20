import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Brain, LogIn } from "lucide-react";

const LandingPage = () => {
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
                    title: "Welcome!",
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
                <CardHeader className="text-center space-y-3">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                        <Brain className="h-7 w-7 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-foreground">Quiz Generator</CardTitle>
                    <CardDescription className="text-muted-foreground">
                        Enter your credentials to get started
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                placeholder="Enter your username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="username"
                                type="password"
                                placeholder="User password"
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
                        <Button type="submit" className="w-full gap-2" disabled={loading}>
                            <LogIn className="h-4 w-4" />
                            {loading ? "Validating..." : "Sign In"}
                        </Button>
                        <p className="text-xs text-center text-muted-foreground mt-3">
                            Hint: URL is <code className="bg-muted px-1 rounded">https://api.quizapp.com</code>
                            <br />
                            Secret Passwords: <code className="bg-muted px-1 rounded">admin123</code>,{" "}
                            <code className="bg-muted px-1 rounded">regular123</code>,{" "}
                            <code className="bg-muted px-1 rounded">trial123</code>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default LandingPage;

