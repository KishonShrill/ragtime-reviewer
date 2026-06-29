import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Activity, BarChart2, LineChart, Calculator } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { ResultAsync, okAsync, errAsync } from "neverthrow";
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

const LatencyAnalytics = () => {
    const navigate = useNavigate();
    const { token, backendUrl } = useAuth();
    const { toast } = useToast();

    const [viewMode, setViewMode] = useState<"individual" | "distribution">("individual");
    const [distributionData, setDistributionData] = useState<any[]>([]);
    const [individualData, setIndividualData] = useState<any[]>([]);
    const [stats, setStats] = useState({
        mean: "0.00", stdDev: "0.00", count: 0,
        min: "0.00", max: "0.00", median: "0.00", mode: "None"
    });

    useEffect(() => {
        const fetchMockData = () => {
            return [
                4.2, 4.5, 4.5, 4.8, 5.1, 5.1, 5.1, 5.2, 5.5, 5.5,
                4.9, 5.1, 5.8, 6.0, 6.0, 5.9, 6.1, 6.1, 6.5, 6.8,
                7.2, 7.5, 6.9, 7.1, 8.0, 8.2, 8.5, 7.8, 9.2, 9.5
            ];
        };

        ResultAsync.fromPromise(
            axios.get(`${backendUrl}/api/metrics/latency`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            (error) => new Error(`Network Error: ${String(error)}`)
        )
            .andThen((response) => {
                const responseData = response.data;
                if (responseData?.status === "success" && Array.isArray(responseData?.data) && responseData.data.length > 0) {
                    return okAsync(responseData.data);
                }
                return errAsync(new Error("Invalid response format or empty dataset"));
            })
            .map((realTimes: number[]) => {
                processData(realTimes);
            })
            .mapErr((error) => {
                console.warn("Falling back to mock data. Reason:", error.message);
                toast({
                    variant: "destructive",
                    title: "Offline Mode",
                    description: "Could not fetch real execution times. Showing sample data.",
                });
                processData(fetchMockData());
            });

    }, [backendUrl, token, toast]);

    const processData = (rawData: number[]) => {
        if (rawData.length === 0) return;

        // 1. SAFE DATA NORMALIZATION & TRASH TRACKING
        const validData: number[] = [];
        const trashData: any[] = [];

        rawData.forEach(t => {
            // Check for nulls, undefined, or strings
            if (typeof t !== 'number' || t <= 0) {
                trashData.push({ rawValue: t, reason: "Invalid format or <= 0" });
                return;
            }

            // Normalize (if > 50, it's likely milliseconds being passed from DB)
            const normalizedTime = t;

            // Enforce True LLM Filter (Llama 3.1 8B shouldn't be under 1s)
            if (normalizedTime < 1.0) {
                trashData.push({
                    rawValue: t,
                    normalized: normalizedTime,
                    reason: "Too fast (< 1.0s), likely a cache hit or fallback."
                });
            } else {
                validData.push(normalizedTime);
            }
        });

        // --- CONSOLE LOGGING THE TRASH ---
        if (trashData.length > 0) {
            console.groupCollapsed("🗑️ Filtered Out Latency Data (Click to expand)");
            console.log(`Total items filtered: ${trashData.length}`);
            console.table(trashData);
            console.groupEnd();
        } else {
            console.log("✅ No trash data found! All execution times were valid LLM inferences.");
        }

        // Overwrite 'data' with only the valid ones for the chart
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

        // Grouped Mode
        const individualCounts: Record<string, number> = {};
        data.forEach(time => {
            const key = time.toFixed(1);
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
        const range = (maxVal - minVal) || 1;
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
                time: Number(x.toFixed(2)),
                density: density,
                count: countInBin
            });
        }
        setDistributionData(distData);

        // Update State
        setStats({
            mean: mean.toFixed(2), stdDev: stdDev.toFixed(2), count: n,
            min: minVal.toFixed(2), max: maxVal.toFixed(2),
            median: median.toFixed(2), mode: modeStr
        });
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-8">
            <Card className="w-full max-w-5xl shadow-xl border-border/50">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/50">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
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

                    <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border border-border/50">
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
                        <div className="p-4 bg-muted/30 rounded-lg border border-border/50 text-center">
                            <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Total Queries</p>
                            <p className="text-3xl font-bold text-foreground mt-1">{stats.count}</p>
                        </div>
                        <div className="p-4 bg-muted/30 rounded-lg border border-border/50 text-center">
                            <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Mean Time</p>
                            <p className="text-3xl font-bold text-primary mt-1">{stats.mean} s</p>
                        </div>
                        <div className="p-4 bg-muted/30 rounded-lg border border-border/50 text-center">
                            <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Std Deviation</p>
                            <p className="text-3xl font-bold text-accent mt-1">±{stats.stdDev} s</p>
                        </div>
                    </div>

                    {/* DYNAMIC CHART RENDERING */}
                    <div className="h-[400px] w-full mt-6">
                        <ResponsiveContainer width="100%" height="100%">
                            {viewMode === "individual" ? (
                                <BarChart data={individualData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                                    <XAxis
                                        dataKey="time"
                                        tick={{ fontSize: 12 }}
                                        tickFormatter={(val) => val.toFixed(1)}
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
                                        labelFormatter={(label) => `${label} seconds`}
                                    />
                                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                                </BarChart>
                            ) : (
                                <ComposedChart data={distributionData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                    <XAxis
                                        dataKey="time"
                                        tick={{ fontSize: 12 }}
                                        tickFormatter={(val) => val.toFixed(1)}
                                        label={{ value: 'Execution Time (Seconds)', position: 'insideBottom', offset: -10 }}
                                    />
                                    <YAxis
                                        yAxisId="left"
                                        tick={{ fontSize: 12 }}
                                        allowDecimals={false}
                                        label={{ value: 'Grouped Frequency', angle: -90, position: 'insideLeft' }}
                                    />
                                    <YAxis yAxisId="right" orientation="right" tick={false} axisLine={false} />
                                    /<Tooltip
                                        formatter={(value: ValueType | undefined, name: NameType | undefined) => {
                                            if (name === "density") {
                                                const density =
                                                    typeof value === "number" ? value.toFixed(4) : String(value ?? "");
                                                return [density, "Probability Density"];
                                            }

                                            return [value ?? 0, "Queries Generated"];
                                        }}
                                        labelFormatter={(label) => `Around ${label} s`}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: "20px" }} />
                                    <Bar yAxisId="left" dataKey="count" name="Grouped Frequency" fill="hsl(var(--accent))" opacity={0.5} radius={[4, 4, 0, 0]} />
                                    <Line yAxisId="right" type="monotone" dataKey="density" name="Bell Curve" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                                </ComposedChart>
                            )}
                        </ResponsiveContainer>
                    </div>

                    {/* DETAILED STATISTICAL BREAKDOWN */}
                    <div className="mt-8 pt-6 border-t border-border/60">
                        <div className="flex items-center gap-2 mb-4">
                            <Calculator className="h-5 w-5 text-muted-foreground" />
                            <h3 className="text-lg font-bold text-foreground">Detailed Statistical Breakdown</h3>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="p-4 bg-muted/20 rounded-lg border border-border/50 text-center">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Fastest (Min)</p>
                                <p className="text-xl font-bold text-emerald-500 mt-1">{stats.min} s</p>
                            </div>
                            <div className="p-4 bg-muted/20 rounded-lg border border-border/50 text-center">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Slowest (Max)</p>
                                <p className="text-xl font-bold text-destructive mt-1">{stats.max} s</p>
                            </div>
                            <div className="p-4 bg-muted/20 rounded-lg border border-border/50 text-center">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Median (Middle)</p>
                                <p className="text-xl font-bold text-foreground mt-1">{stats.median} s</p>
                            </div>
                            <div className="p-4 bg-muted/20 rounded-lg border border-border/50 text-center">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Mode (Most Freq.)</p>
                                <p className="text-xl font-bold text-foreground mt-1">{stats.mode}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default LatencyAnalytics;
