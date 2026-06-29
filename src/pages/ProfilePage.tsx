import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toPng } from 'html-to-image';
import jsPDF from "jspdf";
import { useToast } from "@/hooks/use-toast";
import { useConfigStore } from "@/stores/useConfigStore"; // <-- Using our Zustand store

// UI Components
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
    type ChartConfig,
} from "@/components/ui/chart";

// Icons & Charts
import { LineChart, Line, XAxis, YAxis, ReferenceLine } from "recharts";
import {
    User, BookOpen, FlaskConical, Atom, Globe, ArrowLeft,
    ChevronLeft, ChevronRight, RefreshCw, Download,
    CheckCircle2, XCircle, Target
} from "lucide-react";

// --- CONFIGURATION & HELPERS ---

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

function getMasteryLabel(score: number) {
    if (score < 0.2) return { text: "Very Poor", textClass: "text-red-500", bgClass: "bg-red-500" };
    if (score < 0.4) return { text: "Poor", textClass: "text-orange-500", bgClass: "bg-orange-500" };
    if (score < 0.6) return { text: "Good", textClass: "text-primary", bgClass: "bg-primary" };
    if (score < 0.8) return { text: "Great", textClass: "text-emerald-400", bgClass: "bg-emerald-400" };
    return { text: "Excellent", textClass: "text-emerald-600", bgClass: "bg-emerald-600" };
}

function getDifficultyStyle(difficulty: string) {
    switch (difficulty) {
        case "Easy": return "bg-green-600 hover:bg-green-600 text-white font-bold";
        case "Medium": return "bg-orange-500 hover:bg-orange-500 text-white font-bold";
        case "Hard": return "bg-red-500 hover:bg-red-500 text-white font-bold";
        default: return "text-muted-foreground";
    }
}

function getTaxonomyStyle(taxonomy: string) {
    switch (taxonomy) {
        case "Remembering": return "text-green-600";
        case "Understanding": return "text-orange-500";
        case "Applying": return "text-destructive";
        default: return "text-muted-foreground";
    }
}

// --- MAIN COMPONENT ---

export default function ProfilePage() {
    const navigate = useNavigate();
    const { toast } = useToast();

    // Auth & Config variables directly from storage
    const backendUrl = useConfigStore((state) => state.backendUrl);
    const user = localStorage.getItem('reviewer_user');
    const email = localStorage.getItem('reviewer_email');
    const token = localStorage.getItem('reviewer_token');

    // Parse knowledge scores safely
    const knowledgeScores = (() => {
        try {
            return JSON.parse(localStorage.getItem('reviewer_knowledge_scores') || '{}');
        } catch {
            return {};
        }
    })();

    // State
    const BATCH_SIZE = 50;
    const [progressData, setProgressData] = useState<any[]>([]);
    const [reviewData, setReviewData] = useState<any[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [isExporting, setIsExporting] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    // Initial Auth Check
    useEffect(() => {
        if (!token) {
            toast({ title: "Authentication Required", description: `Please sign in first!` });
            navigate("/");
            return;
        }
        fetchLogs(false);
    }, [token, navigate, toast, user, backendUrl]);

    const fetchLogs = async (forceRefresh = false) => {
        if (!user || !token) return;
        const cacheKey = `reviewer_quizLogs_${user}`;

        // 1. Check LocalStorage Cache
        if (!forceRefresh) {
            const cachedData = localStorage.getItem(cacheKey);
            if (cachedData) {
                try {
                    const parsedData = JSON.parse(cachedData) || {};
                    const cachedLogs = parsedData.logs || [];
                    const cachedReviews = parsedData.reviews || [];

                    setProgressData(cachedLogs);
                    setReviewData(cachedReviews);
                    setCurrentPage(Math.max(1, Math.ceil(cachedLogs.length / BATCH_SIZE)));
                    return;
                } catch (e) {
                    console.error("Failed to parse cached logs", e);
                }
            }
        }

        // 2. Fetch from API
        setIsRefreshing(true);
        try {
            const response = await fetch(`${backendUrl}/api/history`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => null);
                throw new Error(errData?.detail?.reason || "Failed to fetch logs");
            }

            const dataObj = await response.json();
            const rawLogs = dataObj.logs || [];
            const rawReviews = dataObj.reviews || [];

            const formattedChartData = rawLogs.map((log: any, index: number) => {
                const scores = log.updated_scores || {};
                return {
                    ...log,
                    quiz: `Q${index + 1}`,
                    Biology: scores.Biology?.mastery_score || 0,
                    Chemistry: scores.Chemistry?.mastery_score || 0,
                    Physics: scores.Physics?.mastery_score || 0,
                    generalScience: scores["General Science"]?.mastery_score || 0,
                };
            });

            setProgressData(formattedChartData);
            setReviewData(rawReviews);
            setCurrentPage(Math.max(1, Math.ceil(formattedChartData.length / BATCH_SIZE)));

            localStorage.setItem(cacheKey, JSON.stringify({ logs: formattedChartData, reviews: rawReviews }));

            if (forceRefresh) {
                toast({ title: "Synced!", description: "Your chart is up to date." });
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Sync Failed",
                description: error.message || "Could not connect to server."
            });
        } finally {
            setIsRefreshing(false);
        }
    };

    function getWeakTaxonomies(subject: string, allLogs: any[]) {
        const incorrectLogs = allLogs.filter(log => !log.isCorrect && log.augmented?.subtopic === subject);
        const taxonomyFreq: Record<string, number> = {};

        incorrectLogs.forEach((log) => {
            const taxonomy = log.augmented?.bloom_taxonomy;
            if (taxonomy) taxonomyFreq[taxonomy] = (taxonomyFreq[taxonomy] || 0) + 1;
        });

        return Object.entries(taxonomyFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map(([name]) => name);
    }

    function getAllWeakAreas(allLogs: any[]) {
        const incorrectLogs = allLogs.filter((log) => !log.isCorrect);
        const areaFreq: Record<string, number> = {};

        incorrectLogs.forEach((log) => {
            const area = log.knowledge_base?.area;
            if (area && area !== "null") {
                areaFreq[area] = (areaFreq[area] || 0) + 1;
            }
        });

        return Object.entries(areaFreq)
            .sort((a, b) => b[1] - a[1])
            .map(([name]) => name);
    }


    const handleExportPDF = async () => {
        if (!printRef.current) return;

        setIsExporting(true);
        toast({ title: "Generating PDF", description: "Please wait while we prepare your multi-page report..." });

        try {
            const dataUrl = await toPng(printRef.current, {
                quality: 1,
                pixelRatio: 2,
                backgroundColor: "#ffffff",
                fontEmbedCSS: '',
            });

            const pdf = new jsPDF("p", "mm", "a4");
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const margin = 25.4;
            const usableWidth = pdfWidth - (margin * 2);
            const usableHeight = pdfHeight - (margin * 2);

            const domElementHeight = printRef.current.offsetHeight;
            const domElementWidth = printRef.current.offsetWidth;
            const imgHeight = (domElementHeight * usableWidth) / domElementWidth;

            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(dataUrl, "PNG", margin, margin + position, usableWidth, imgHeight);
            pdf.setFillColor(255, 255, 255);
            pdf.rect(0, pdfHeight - margin, pdfWidth, margin, "F");

            heightLeft -= usableHeight;

            while (heightLeft > 0) {
                position -= usableHeight;
                pdf.addPage();
                pdf.addImage(dataUrl, "PNG", margin, margin + position, usableWidth, imgHeight);

                pdf.setFillColor(255, 255, 255);
                pdf.rect(0, 0, pdfWidth, margin, "F");
                pdf.rect(0, pdfHeight - margin, pdfWidth, margin, "F");

                heightLeft -= usableHeight;
            }

            pdf.save(`${user}_Reviewer_Progress.pdf`);
            toast({ title: "Success!", description: "Multi-page PDF downloaded successfully." });
        } catch (error) {
            console.error("PDF Export Error:", error);
            toast({ variant: "destructive", title: "Export Failed", description: "Could not generate PDF." });
        } finally {
            setIsExporting(false);
        }
    };

    if (!token) return null;

    const totalPages = Math.max(1, Math.ceil(progressData.length / BATCH_SIZE));
    const startIndex = (currentPage - 1) * BATCH_SIZE;
    const currentBatchData = progressData.slice(startIndex, startIndex + BATCH_SIZE);
    const allWeakAreas = getAllWeakAreas(progressData);
    const weakAreasWithCount = Object.entries(
        allWeakAreas.reduce((acc, area) => {
            acc[area] = (acc[area] || 0) + 1;
            return acc;
        }, {} as Record<string, number>)
    )
        .map(([area, count]) => ({ area, count }))
        .sort((a, b) => b.count - a.count);

    return (
        <div className="min-h-screen bg-zinc-50/50 p-4 md:p-8">
            <div className="mx-auto max-w-5xl space-y-6 flex flex-col">

                {/* Actions Header */}
                <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={() => navigate("/select")} className="text-muted-foreground">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                    </Button>
                    <Button variant="default" size="sm" onClick={handleExportPDF} disabled={isExporting} className="gap-2">
                        <Download className="h-4 w-4" />
                        {isExporting ? "Exporting..." : "Export as PDF"}
                    </Button>
                </div>

                {/* Main Content Area (Captured in PDF) */}
                <div ref={printRef} className="space-y-6 bg-transparent">

                    {/* User Profile Card */}
                    <Card className="shadow-sm">
                        <CardContent className="flex flex-col sm:flex-row items-center gap-5 p-6">
                            <Avatar className="h-20 w-20 border-2 border-primary/20">
                                <AvatarImage src="" />
                                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                                    <User className="h-8 w-8" />
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col items-center sm:items-start">
                                <h1 className="text-2xl font-bold text-foreground capitalize">{user}</h1>
                                <p className="text-muted-foreground">{email}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Mastery Subject Cards */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {Object.entries(knowledgeScores).map(([subject, data]: [string, any]) => {
                            const label = getMasteryLabel(data.mastery_score);
                            const topTaxonomies = getWeakTaxonomies(subject, progressData);

                            return (
                                <Card key={subject} className="shadow-sm">
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

                                        <div className="pt-2 space-y-3 border-t mt-2">
                                            {topTaxonomies.length === 0 ? (
                                                <p className="text-xs text-muted-foreground">No skill gaps identified.</p>
                                            ) : (
                                                <div className="space-y-1.5">
                                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Skill Gaps</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {topTaxonomies.map((tax: string) => (
                                                            <Badge key={tax} variant="outline" className="text-[10px] text-orange-600 border-orange-500/30 bg-orange-500/5">
                                                                {tax}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Line Chart */}
                    <Card className="shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle>Progress Over Time</CardTitle>
                            <Button variant="outline" size="sm" onClick={() => fetchLogs(true)} disabled={isRefreshing}>
                                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                                Sync Data
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {progressData.length > 0 ? (
                                <div className="space-y-4">
                                    <ChartContainer config={chartConfig} className="h-[350px] w-full">
                                        <LineChart data={currentBatchData}>
                                            {currentBatchData.map((dataPoint) => {
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
                                                                <span className="font-bold">{Math.round(Number(value) * 100)}%:</span>
                                                                <span className="font-medium text-foreground">
                                                                    {chartConfig[name as keyof typeof chartConfig]?.label || name}
                                                                </span>
                                                            </div>
                                                        )}
                                                    />
                                                }
                                            />
                                            <ChartLegend content={<ChartLegendContent />} />
                                            <Line isAnimationActive={false} type="monotone" dataKey="Biology" stroke="var(--color-Biology)" strokeWidth={2} dot={true} />
                                            <Line isAnimationActive={false} type="monotone" dataKey="Chemistry" stroke="var(--color-Chemistry)" strokeWidth={2} dot={true} />
                                            <Line isAnimationActive={false} type="monotone" dataKey="Physics" stroke="var(--color-Physics)" strokeWidth={2} dot={true} />
                                            <Line isAnimationActive={false} type="monotone" dataKey="generalScience" stroke="var(--color-generalScience)" strokeWidth={2} dot={true} />
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

                    {/* Question History Tabs */}
                    <Tabs defaultValue="main" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="main">Standard Quizzes</TabsTrigger>
                            <TabsTrigger value="reviews">Downgraded Reviews</TabsTrigger>
                        </TabsList>

                        <TabsContent value="main">
                            {allWeakAreas.length > 0 && (
                                <Card className="border-destructive/20 bg-destructive/5 shadow-sm mb-5">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-lg text-destructive flex items-center gap-2">
                                            <Target className="h-5 w-5" /> Overall Weak Concept Areas
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                            {weakAreasWithCount.map(({ area, count }) => (
                                                <Badge
                                                    key={area}
                                                    variant="secondary"
                                                    onClick={() =>
                                                        window.open(
                                                            `https://www.google.com/search?q=${encodeURIComponent(area)}`,
                                                            "_blank"
                                                        )
                                                    }
                                                    className="relative cursor-pointer justify-center text-center px-3 py-2 bg-white border border-destructive/20 text-destructive hover:bg-destructive/10 whitespace-normal shadow-sm"
                                                >
                                                    {area}

                                                    {count > 1 && (
                                                        <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white text-xs">
                                                            {count}
                                                        </span>
                                                    )}
                                                </Badge>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {currentBatchData.length > 0 ? (
                                <Card className="shadow-sm">
                                    <CardHeader>
                                        <CardTitle className="text-xl">Batch {currentPage} Assessment History</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {currentBatchData.map((log) => (
                                            <div key={log._id} className={`p-4 rounded-lg border-l-4 border transition-colors ${log.isCorrect ? 'border-l-success bg-success/5 border-success/20' : 'border-l-destructive bg-destructive/5 border-destructive/20'}`}>
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="space-y-2 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <Badge variant="outline" className="bg-background">{log.augmented?.subtopic}</Badge>
                                                            <Badge variant="secondary" className={`text-xs font-normal ${getDifficultyStyle(log.augmented?.difficulty)}`}>
                                                                {log.augmented?.difficulty}
                                                            </Badge>
                                                            <Badge variant="secondary" className={`text-xs font-bold bg-white hover:bg-white border shadow-sm ${getTaxonomyStyle(log.augmented?.bloom_taxonomy)}`}>
                                                                {log.augmented?.bloom_taxonomy}
                                                            </Badge>
                                                        </div>
                                                        <p className="font-medium text-foreground text-sm leading-relaxed">{log.augmented?.question}</p>
                                                        <div className="pt-2">
                                                            <p className="text-sm text-muted-foreground">
                                                                <span className="font-semibold text-foreground">Correct Answer: </span>
                                                                {log.augmented?.answer}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="shrink-0 mt-1">
                                                        {log.isCorrect ? (
                                                            <div className="flex items-center text-success gap-1.5 text-sm font-bold">
                                                                <CheckCircle2 className="h-5 w-5" />
                                                                <span className="hidden sm:inline">Correct</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center text-destructive gap-1.5 text-sm font-bold">
                                                                <XCircle className="h-5 w-5" />
                                                                <span className="hidden sm:inline">Incorrect</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="p-8 text-center text-muted-foreground border rounded-lg bg-white shadow-sm">
                                    No standard quizzes taken yet.
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="reviews">
                            <Card className="border-orange-500/20 shadow-sm">
                                <CardHeader className="bg-orange-500/5 border-b border-orange-500/10">
                                    <CardTitle className="text-xl text-orange-700">Review Sessions Taken</CardTitle>
                                    <CardDescription className="text-orange-700/70">Questions targeted specifically to patch your knowledge gaps.</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-4">
                                    {reviewData.length > 0 ? (
                                        reviewData.map((review, idx) => (
                                            <div key={idx} className="flex items-start gap-4 bg-white p-4 rounded-lg border border-orange-500/20 shadow-sm">
                                                <div className="shrink-0 mt-1">
                                                    {review.isCorrect ? (
                                                        <CheckCircle2 className="h-6 w-6 text-success" />
                                                    ) : (
                                                        <XCircle className="h-6 w-6 text-destructive" />
                                                    )}
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <Badge variant="outline" className="bg-background">{review.augmented?.subtopic}</Badge>
                                                        <Badge variant="secondary" className={`text-xs font-bold bg-white hover:bg-white shadow-sm border ${getTaxonomyStyle(review.augmented?.bloom_taxonomy)}`}>
                                                            {review.augmented?.bloom_taxonomy} (Review)
                                                        </Badge>
                                                    </div>
                                                    <p className="font-medium text-foreground text-sm">{review.augmented?.question}</p>
                                                    <p className="text-xs text-muted-foreground pt-1 border-t">
                                                        <span className="font-semibold text-foreground">Answered: </span>
                                                        {review.augmented?.answer}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center text-muted-foreground py-8">
                                            No review sessions have been taken yet.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
