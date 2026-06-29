import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useConfigStore } from "@/stores/useConfigStore";
import { useToast } from "@/hooks/use-toast";

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Icons
import { ArrowLeft, Activity, BarChart2, LineChart, Calculator } from "lucide-react";

// Recharts
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";
import {
    ComposedChart,
    Line,
    Bar,
    BarChart,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from "recharts";

// --- MOCK DATA FALLBACK (Now with higher precision) ---
const fetchMockData = () => [
    0.045, 0.082, 0.082, 0.105, 0.150, 0.150, 0.890, 1.050, 1.050, 1.200,
    4.215, 4.502, 4.502, 4.810, 5.100, 5.100, 5.100, 5.234, 5.512, 5.512,
    4.901, 5.100, 5.820, 6.015, 6.015, 5.910, 6.100, 6.100, 6.550, 6.812
];

export default function LatencyAnalyticsPage() {
    const navigate = useNavigate();
    const { toast } = useToast();

    // Auth & Config
    const backendUrl = useConfigStore((state) => state.backendUrl);
    const token = localStorage.getItem("reviewer_token");

    // State
    const [viewMode, setViewMode] = useState<"individual" | "distribution">("individual");
    const [distributionData, setDistributionData] = useState<any[]>([]);
    const [individualData, setIndividualData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({
        mean: "0.000", stdDev: "0.000", count: 0,
        min: "0.000", max: "0.000", median: "0.000", mode: "None"
    });

    // Initial Auth Check
    useEffect(() => {
        if (!token) {
            toast({ title: "Authentication Required", description: "Please sign in first!", variant: "destructive" });
            navigate("/", { replace: true });
        }
    }, [token, navigate, toast]);

    // Data Processing Function
    const processData = useCallback((rawData: number[]) => {
        if (rawData.length === 0) return;

        // 1. SAFE DATA NORMALIZATION & TRASH TRACKING
        const validData: number[] = [];
        const trashData: any[] = [];

        rawData.forEach(t => {
            // Only throw out absolute zeroes, negatives, or malformed data
            if (typeof t !== 'number' || t <= 0) {
                trashData.push({ rawValue: t, reason: "Invalid format or <= 0" });
                return;
            }
            validData.push(t);
        });

        if (trashData.length > 0) {
            console.groupCollapsed("🗑️ Filtered Out Latency Data (Click to expand)");
            console.log(`Total items filtered: ${trashData.length}`);
            console.table(trashData);
            console.groupEnd();
        }

        const data = validData;
        if (data.length === 0) return;

        const n = data.length;

        // --- STATISTICAL CALCULATIONS ---
        const mean = data.reduce((a, b) => a + b, 0) / n;
        const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
        const stdDev = Math.sqrt(variance);
        const minVal = Math.min(...data);
        const maxVal = Math.max(...data);

        // Median
        const sortedData = [...data].sort((a, b) => a - b);
        const mid = Math.floor(n / 2);
        const median = n % 2 !== 0 ? sortedData[mid] : (sortedData[mid - 1] + sortedData[mid]) / 2;

        // Grouped Mode (Now grouping by 3 decimal places)
        const individualCounts: Record<string, number> = {};
        data.forEach(time => {
            const key = time.toFixed(3);
            individualCounts[key] = (individualCounts[key] || 0) + 1;
        });

        const maxFreq = Math.max(...Object.values(individualCounts));
        const modeKeys = Object.keys(individualCounts).filter(k => individualCounts[k] === maxFreq);
        let modeStr = "None";
        if (maxFreq > 1) {
            modeStr = modeKeys.length > 3 ? "Multiple" : modeKeys.map(k => `${k} s`).join(", ");
        }

        // --- PREPARE EXACT FREQUENCY DATA ---
        const exactData = Object.entries(individualCounts).map(([time, count]) => ({
            time: Number(time),
            count: count
        })).sort((a, b) => a.time - b.time);

        setIndividualData(exactData);

        // --- PREPARE BELL CURVE DATA ---
        const range = (maxVal - minVal) || 0.001; // Prevent division by zero on flat data
        const binSize = range / 15;

        const distData = [];
        const mathStartX = mean - 3 * stdDev;
        const startX = Math.max(minVal - binSize, mathStartX);
        const endX = mean + 3 * stdDev;

        for (let x = startX; x <= endX; x += binSize / 2) {
            const exponent = Math.exp(-Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2)));
            const density = stdDev === 0 ? 0 : (1 / (stdDev * Math.sqrt(2 * Math.PI))) * exponent;
            const countInBin = data.filter(d => d >= x - (binSize / 2) && d < x + (binSize / 2)).length;

            distData.push({
                time: Number(x.toFixed(3)), // Increased precision for the distribution curve
                density: density,
                count: countInBin
            });
        }

        setDistributionData(distData);

        // Update State (All KPIs now use 3 decimal places)
        setStats({
            mean: mean.toFixed(3),
            stdDev: stdDev.toFixed(3),
            count: n,
            min: minVal.toFixed(3),
            max: maxVal.toFixed(3),
            median: median.toFixed(3),
            mode: modeStr
        });
    }, []);

    // Fetch Logic
    useEffect(() => {
        if (!token) return;

        const fetchMetrics = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`${backendUrl}/api/metrics/latency`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) throw new Error("Failed to fetch latency metrics");

                const responseData = await response.json();

                if (responseData?.status === "success" && Array.isArray(responseData?.data) && responseData.data.length > 0) {
                    processData(responseData.data);
                } else {
                    throw new Error("Invalid response format or empty dataset");
                }
            } catch (error: any) {
                console.warn("Falling back to mock data. Reason:", error.message);
                toast({
                    variant: "destructive",
                    title: "Offline Mode",
                    description: "Could not fetch real execution times. Showing sample data.",
                });
                processData(fetchMockData());
            } finally {
                setIsLoading(false);
            }
        };

        fetchMetrics();
    }, [backendUrl, token, toast, processData]);

    if (!token) return null;

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50/50 p-4 sm:p-8">
            <Card className="w-full max-w-5xl shadow-sm border-border/50 bg-white">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/50">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" onClick={() => navigate("/select")} className="bg-white">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <CardTitle className="text-2xl font-bold flex items-center gap-2">
                                <Activity className="h-6 w-6 text-primary" />
                                LLM Inference Latency
                            </CardTitle>
                            <CardDescription>
                                Track the execution time of the Llama 3.1 engine.
                            </CardDescription>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-zinc-100/50 p-1 rounded-lg border border-border/50">
                        <Button
                            variant={viewMode === "individual" ? "default" : "ghost"}
                            size="sm"
                            className="gap-2"
                            onClick={() => setViewMode("individual")}
                        >
                            <BarChart2 className="h-4 w-4" />
                            Exact Frequencies
                        </Button>
                        <Button
                            variant={viewMode === "distribution" ? "default" : "ghost"}
                            size="sm"
                            className="gap-2"
                            onClick={() => setViewMode("distribution")}
                        >
                            <LineChart className="h-4 w-4" />
                            Bell Curve
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="pt-6 space-y-6">
                    {/* TOP LEVEL KPIs */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 bg-zinc-50 rounded-lg border border-border/50 text-center shadow-sm">
                            <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Total Queries</p>
                            <p className="text-3xl font-bold text-foreground mt-1">
                                {isLoading ? "..." : stats.count}
                            </p>
                        </div>
                        <div className="p-4 bg-zinc-50 rounded-lg border border-border/50 text-center shadow-sm">
                            <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Mean Time</p>
                            <p className="text-3xl font-bold text-primary mt-1">
                                {isLoading ? "..." : `${stats.mean} s`}
                            </p>
                        </div>
                        <div className="p-4 bg-zinc-50 rounded-lg border border-border/50 text-center shadow-sm">
                            <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Std Deviation</p>
                            <p className="text-3xl font-bold text-orange-500 mt-1">
                                {isLoading ? "..." : `±${stats.stdDev} s`}
                            </p>
                        </div>
                    </div>

                    {/* DYNAMIC CHART RENDERING */}
                    <div className="h-[400px] w-full mt-6">
                        {isLoading ? (
                            <div className="h-full w-full flex items-center justify-center border rounded-lg bg-zinc-50/50">
                                <p className="text-muted-foreground animate-pulse flex items-center gap-2">
                                    <Activity className="h-5 w-5" /> Calculating telemetry...
                                </p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                {viewMode === "individual" ? (
                                    <BarChart data={individualData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                                        <XAxis
                                            dataKey="time"
                                            tick={{ fontSize: 12 }}
                                            tickFormatter={(val) => Number(val).toFixed(3)}
                                            label={{ value: 'Exact Execution Time (Seconds)', position: 'insideBottom', offset: -10 }}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 12 }}
                                            allowDecimals={false}
                                            label={{ value: 'Exact Count', angle: -90, position: 'insideLeft' }}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'var(--muted)', opacity: 0.2 }}
                                            formatter={(value: ValueType | undefined) => [value ?? 0, "Queries Generated"]}
                                            labelFormatter={(label) => `${Number(label).toFixed(3)} seconds`}
                                        />
                                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                                    </BarChart>
                                ) : (
                                    <ComposedChart data={distributionData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                        <XAxis
                                            dataKey="time"
                                            tick={{ fontSize: 12 }}
                                            tickFormatter={(val) => Number(val).toFixed(3)}
                                            label={{ value: 'Execution Time (Seconds)', position: 'insideBottom', offset: -10 }}
                                        />
                                        <YAxis
                                            yAxisId="left"
                                            tick={{ fontSize: 12 }}
                                            allowDecimals={false}
                                            label={{ value: 'Grouped Frequency', angle: -90, position: 'insideLeft' }}
                                        />
                                        <YAxis yAxisId="right" orientation="right" tick={false} axisLine={false} />
                                        <Tooltip
                                            formatter={(value: ValueType | undefined, name: NameType | undefined) => {
                                                if (name === "density") {
                                                    const density = typeof value === "number" ? value.toFixed(4) : String(value ?? "");
                                                    return [density, "Probability Density"];
                                                }
                                                return [value ?? 0, "Queries Generated"];
                                            }}
                                            labelFormatter={(label) => `Around ${Number(label).toFixed(3)} s`}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: "20px" }} />
                                        <Bar yAxisId="left" dataKey="count" name="Grouped Frequency" fill="hsl(25 95% 53%)" opacity={0.5} radius={[4, 4, 0, 0]} />
                                        <Line yAxisId="right" type="monotone" dataKey="density" name="Bell Curve" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                                    </ComposedChart>
                                )}
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* DETAILED STATISTICAL BREAKDOWN */}
                    <div className="mt-8 pt-6 border-t border-border/60">
                        <div className="flex items-center gap-2 mb-4">
                            <Calculator className="h-5 w-5 text-muted-foreground" />
                            <h3 className="text-lg font-bold text-foreground">Detailed Statistical Breakdown</h3>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="p-4 bg-zinc-50 rounded-lg border border-border/50 text-center shadow-sm">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Fastest (Min)</p>
                                <p className="text-xl font-bold text-emerald-500 mt-1">{isLoading ? "-" : `${stats.min} s`}</p>
                            </div>
                            <div className="p-4 bg-zinc-50 rounded-lg border border-border/50 text-center shadow-sm">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Slowest (Max)</p>
                                <p className="text-xl font-bold text-destructive mt-1">{isLoading ? "-" : `${stats.max} s`}</p>
                            </div>
                            <div className="p-4 bg-zinc-50 rounded-lg border border-border/50 text-center shadow-sm">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Median (Middle)</p>
                                <p className="text-xl font-bold text-foreground mt-1">{isLoading ? "-" : `${stats.median} s`}</p>
                            </div>
                            <div className="p-4 bg-zinc-50 rounded-lg border border-border/50 text-center shadow-sm">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Mode (Most Freq.)</p>
                                <p className="text-xl font-bold text-foreground mt-1">{isLoading ? "-" : stats.mode}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
