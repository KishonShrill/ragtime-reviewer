import { useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
    type ChartConfig,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { User, BookOpen, FlaskConical, Atom, Globe, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";


const progressData = [
    { quiz: "Quiz 1", Biology: 0.3, Chemistry: 0.2, Physics: 0.5, "General Science": 0.6 },
    { quiz: "Quiz 2", Biology: 0.35, Chemistry: 0.25, Physics: 0.55, "General Science": 0.65 },
    { quiz: "Quiz 3", Biology: 0.4, Chemistry: 0.28, Physics: 0.6, "General Science": 0.72 },
    { quiz: "Quiz 4", Biology: 0.42, Chemistry: 0.3, Physics: 0.65, "General Science": 0.78 },
    { quiz: "Quiz 5", Biology: 0.48, Chemistry: 0.3, Physics: 0.68, "General Science": 0.85 },
    { quiz: "Quiz 6", Biology: 0.5, Chemistry: 0.3, Physics: 0.7, "General Science": 0.9 },
];

const chartConfig: ChartConfig = {
    Biology: { label: "Biology", color: "hsl(142 71% 45%)" },
    Chemistry: { label: "Chemistry", color: "hsl(25 95% 53%)" },
    Physics: { label: "Physics", color: "hsl(217 91% 60%)" },
    "General Science": { label: "General Science", color: "hsl(262 83% 58%)" },
};

const subjectIcons: Record<string, React.ReactNode> = {
    Biology: <BookOpen className="h-5 w-5" />,
    Chemistry: <FlaskConical className="h-5 w-5" />,
    Physics: <Atom className="h-5 w-5" />,
    "General Science": <Globe className="h-5 w-5" />,
};

function getMasteryLabel(score: number): { text: string; className: string } {
    if (score < 0.2) return { text: "Very Poor", className: "text-danger" };
    if (score < 0.4) return { text: "Poor", className: "text-[hsl(25_95%_53%)]" };
    if (score < 0.6) return { text: "Good", className: "text-primary" };
    if (score < 0.8) return { text: "Great", className: "text-success" };
    return { text: "Excellent", className: "text-[hsl(142_71%_35%)]" };
}

const ProfilePage = () => {
    const navigate = useNavigate();
    const { user, email, knowledgeScores, token } = useAuth();
    const { toast } = useToast()

    useEffect(() => {
        if (!token) {
            toast({
                title: "Illegal Entry",
                description: `Please sign in first!`,
            });
            navigate("/");
        }

    }, [token, navigate]);
    if (!token) return null;

    console.log({ knowledgeScores })
    console.log(email)

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="mx-auto max-w-5xl space-y-6 flex flex-col">
                {/* Back Button */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(token ? "/select" : "/")}
                    className="text-muted-foreground self-end"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>

                {/* Header Card */}
                <Card>
                    <CardContent className="flex flex-col sm:flex-row items-center gap-5 p-6 ">
                        <Avatar className="h-20 w-20 border-2 border-primary">
                            <AvatarImage src="" />
                            <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                                <User className="h-8 w-8" />
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-center sm:items-start">
                            <h1 className="text-2xl font-bold text-foreground">
                                {user}
                            </h1>
                            <p className="text-muted-foreground">{email}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Knowledge Score Cards */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {Object.entries(knowledgeScores).map(([subject, data]) => {
                        const label = getMasteryLabel(data.mastery_score);
                        return (
                            <Card key={subject}>
                                <CardHeader className="flex flex-row items-center gap-2 pb-2">
                                    <span className="text-primary">{subjectIcons[subject]}</span>
                                    <CardTitle className="text-base">{subject}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex items-baseline justify-between">
                                        <span className={`text-2xl font-bold ${label.className}`}>
                                            {Math.round(data.mastery_score * 100)}%
                                        </span>
                                        <span className={`text-sm font-medium ${label.className}`}>
                                            {label.text}
                                        </span>
                                    </div>
                                    <Progress value={data.mastery_score * 100} className="h-2" />
                                    <div className="pt-1">
                                        {data.weak_concepts.length > 0 ? (
                                            <div className="flex flex-wrap gap-1.5">
                                                {data.weak_concepts.map((c) => (
                                                    <Badge key={c} variant="secondary" className="text-xs">
                                                        {c}
                                                    </Badge>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-muted-foreground">
                                                No weak concepts identified yet.
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Progress Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Progress Over Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="h-[350px] w-full">
                            <LineChart data={progressData}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                <XAxis dataKey="quiz" tick={{ fontSize: 12 }} />
                                <YAxis domain={[0, 1]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                                <ChartTooltip
                                    content={
                                        <ChartTooltipContent
                                            formatter={(value) =>
                                                `${Math.round(Number(value) * 100)}%`
                                            }
                                        />
                                    }
                                />
                                <ChartLegend content={<ChartLegendContent />} />
                                <Line type="monotone" dataKey="Biology" stroke="var(--color-Biology)" strokeWidth={2} dot={{ r: 3 }} />
                                <Line type="monotone" dataKey="Chemistry" stroke="var(--color-Chemistry)" strokeWidth={2} dot={{ r: 3 }} />
                                <Line type="monotone" dataKey="Physics" stroke="var(--color-Physics)" strokeWidth={2} dot={{ r: 3 }} />
                                <Line type="monotone" dataKey="General Science" stroke="var(--color-General Science)" strokeWidth={2} dot={{ r: 3 }} />
                            </LineChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ProfilePage;
