import { useEffect, useState } from "react";
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
import { LineChart, Line, XAxis, YAxis, ReferenceLine } from "recharts";
import { User, BookOpen, FlaskConical, Atom, Globe, ArrowLeft, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ResultAsync, errAsync, okAsync } from "neverthrow";

// Chart configuration and icons remain unchanged
const chartConfig: ChartConfig = {
    Biology: { label: "Biology", color: "hsl(142 71% 45%)" },
    Chemistry: { label: "Chemistry", color: "hsl(25 95% 53%)" },
    Physics: { label: "Physics", color: "hsl(217 91% 60%)" },
    generalScience: { label: "General Science", color: "hsl(262 83% 58%)" },
};

const subjectIcons: Record<string, React.ReactNode> = {
    Biology: <BookOpen className="h-5 w-5" />,
    Chemistry: <FlaskConical className="h-5 w-5" />,
    Physics: <Atom className="h-5 w-5" />,
    generalScience: <Globe className="h-5 w-5" />,
    "General Science": <Globe className="h-5 w-5" />,
};

function getMasteryLabel(score: number): { text: string; textClass: string; bgClass: string } {
    if (score < 0.2) return { text: "Very Poor", textClass: "text-red-500", bgClass: "bg-red-500" };
    if (score < 0.4) return { text: "Poor", textClass: "text-[#f97415]", bgClass: "bg-[#f97415]" };
    if (score < 0.6) return { text: "Good", textClass: "text-primary", bgClass: "bg-primary" };
    if (score < 0.8) return { text: "Great", textClass: "text-[#88E788]", bgClass: "bg-[#88E788]" };
    return { text: "Excellent", textClass: "text-[#1a9948]", bgClass: "bg-[#1a9948]" };
}

const ProfilePage = () => {
    const navigate = useNavigate();
    const { user, email, knowledgeScores, token, backendUrl } = useAuth();
    const { toast } = useToast();

    // Pagination & Chart State
    const BATCH_SIZE = 50;
    const [progressData, setProgressData] = useState<any[]>([]);
    const [currentPage, setCurrentPage] = useState(1);

    // NEW: Loading state for the refresh button
    const [isRefreshing, setIsRefreshing] = useState(false);

    // NEW: Reusable Fetch Function
    const fetchLogs = (forceRefresh = false) => {
        if (!user) return;
        const cacheKey = `reviewer_quizLogs_${user}`;

        // 1. If not forcing a refresh, check LocalStorage first
        if (!forceRefresh) {
            const cachedData = localStorage.getItem(cacheKey);
            if (cachedData) {
                try {
                    const parsedData = JSON.parse(cachedData);
                    setProgressData(parsedData);
                    setCurrentPage(Math.max(1, Math.ceil(parsedData.length / BATCH_SIZE)));
                    return; // Exit early! No need to hit the database.
                } catch (e) {
                    console.error("Failed to parse cached logs", e);
                }
            }
        }

        // 2. If forcing refresh or no cache exists, hit the API
        setIsRefreshing(true);
        ResultAsync.fromPromise(
            fetch(`${backendUrl}/api/logs`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
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
                return okAsync(data.data);
            });
        }).mapErr((err) => {
            setIsRefreshing(false);
            toast({
                variant: "destructive",
                title: err.title,
                description: err.reason
            });
        }).map((dataArray) => {
            setIsRefreshing(false);
            if (!dataArray || dataArray.length === 0) return;

            const formattedChartData = dataArray.map((log: any, index: number) => {
                const scores = log.updated_scores;
                return {
                    quiz: `Q${index + 1}`,
                    Biology: scores.Biology?.mastery_score || 0,
                    Chemistry: scores.Chemistry?.mastery_score || 0,
                    Physics: scores.Physics?.mastery_score || 0,
                    generalScience: scores["General Science"]?.mastery_score || 0,
                };
            });

            setProgressData(formattedChartData);
            setCurrentPage(Math.max(1, Math.ceil(formattedChartData.length / BATCH_SIZE)));

            // 3. Save the newly fetched data to LocalStorage
            localStorage.setItem(cacheKey, JSON.stringify(formattedChartData));

            if (forceRefresh) {
                toast({ title: "Synced!", description: "Your chart is up to date." });
            }
        });
    };

    // Load data on initial mount
    useEffect(() => {
        if (!token) {
            toast({ title: "Illegal Entry", description: `Please sign in first!` });
            navigate("/");
            return;
        }
        fetchLogs(false); // Call with forceRefresh = false
    }, [token, navigate, backendUrl, toast, user]);

    if (!token) return null;

    // Pagination Math
    const totalPages = Math.max(1, Math.ceil(progressData.length / BATCH_SIZE));
    const startIndex = (currentPage - 1) * BATCH_SIZE;
    const endIndex = startIndex + BATCH_SIZE;
    const currentBatchData = progressData.slice(startIndex, endIndex);

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="mx-auto max-w-5xl space-y-6 flex flex-col">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(token ? "/select" : "/")}
                    className="text-muted-foreground self-end"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>

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

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {Object.entries(knowledgeScores || {}).map(([subject, data]: [string, any]) => {
                        const label = getMasteryLabel(data.mastery_score);
                        return (
                            <Card key={subject}>
                                <CardHeader className="flex flex-row items-center gap-2 pb-2">
                                    <span className="text-primary">{subjectIcons[subject]}</span>
                                    <CardTitle className="text-base">{subject}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex items-baseline justify-between">
                                        <span className={`text-2xl font-bold ${label.textClass}`}>
                                            {Math.round(data.mastery_score * 100)}%
                                        </span>
                                        <span className={`text-sm font-medium ${label.textClass}`}>
                                            {label.text}
                                        </span>
                                    </div>
                                    <Progress value={data.mastery_score * 100} color={label.bgClass} className="h-2" />
                                    <div className="pt-1">
                                        {data.weak_concepts && data.weak_concepts.length > 0 ? (
                                            <div className="flex flex-wrap gap-1.5">
                                                {data.weak_concepts.map((c: string) => (
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

                <Card>
                    {/* NEW: Refresh Button added to Header */}
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle>Progress Over Time</CardTitle>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchLogs(true)}
                            disabled={isRefreshing}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Sync Data
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {progressData.length > 0 ? (
                            <div className="space-y-4">
                                <ChartContainer config={chartConfig} className="h-[350px] w-full">
                                    <LineChart data={currentBatchData}>
                                        {/* <CartesianGrid strokeDasharray="3 3" className="stroke-border" /> */}

                                        {currentBatchData.map((dataPoint) => {
                                            // Extract the number from "Q10", "Q20", etc.
                                            const qNum = parseInt(dataPoint.quiz.replace("Q", ""));
                                            if (qNum % 10 === 0) {
                                                return (
                                                    <ReferenceLine
                                                        key={dataPoint.quiz}
                                                        x={dataPoint.quiz}
                                                        stroke="hsl(var(--muted-foreground))"
                                                        strokeDasharray="4 4"
                                                        opacity={0.5}
                                                    />
                                                );
                                            }
                                            return null;
                                        })}

                                        <XAxis dataKey="quiz" tick={{ fontSize: 12 }} />
                                        <YAxis domain={[0, 1]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                                        <ChartTooltip
                                            content={
                                                <ChartTooltipContent
                                                    indicator="dot"
                                                    hideLabel={false}
                                                    formatter={(value, name) => (
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold">
                                                                {Math.round(Number(value) * 100)}%:
                                                            </span>
                                                            <span className="font-medium text-foreground">
                                                                {chartConfig[name as keyof typeof chartConfig]?.label || name}
                                                            </span>
                                                        </div>
                                                    )}
                                                />
                                            }
                                        />
                                        <ChartLegend content={<ChartLegendContent />} />
                                        <Line type="monotone" dataKey="Biology" stroke="var(--color-Biology)" strokeWidth={2} dot={true} />
                                        <Line type="monotone" dataKey="Chemistry" stroke="var(--color-Chemistry)" strokeWidth={2} dot={true} />
                                        <Line type="monotone" dataKey="Physics" stroke="var(--color-Physics)" strokeWidth={2} dot={true} />
                                        <Line type="monotone" dataKey="generalScience" stroke="var(--color-generalScience)" strokeWidth={2} dot={true} />
                                    </LineChart>
                                </ChartContainer>

                                <div className="flex items-center justify-between pt-4 border-t">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4 mr-1" /> Prev Batch
                                    </Button>
                                    <span className="text-sm text-muted-foreground font-medium">
                                        Batch {currentPage} of {totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                    >
                                        Next Batch <ChevronRight className="h-4 w-4 ml-1" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                                No quiz history available yet.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ProfilePage;
