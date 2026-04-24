import { useState } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, Printer, FileText, CheckCircle2 } from "lucide-react";

const SmeValidationPrintPage = () => {
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const validData = results.data.filter((r: any) => r["Question ID"]);
                setParsedData(validData);
                toast({ title: "Success", description: `Loaded ${validData.length} questions.` });
                setIsProcessing(false);
            },
            error: (error) => {
                console.error(error);
                toast({ variant: "destructive", title: "Parsing Error", description: "Could not read the CSV." });
                setIsProcessing(false);
            }
        });
    };

    const handlePrint = () => {
        window.print();
    };

    const getDifficultyColor = (difficulty: string) => {
        const diff = difficulty?.toLowerCase();
        if (diff === 'easy') return 'bg-green-100 text-green-800 border-green-300';
        if (diff === 'medium') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        if (diff === 'hard') return 'bg-red-100 text-red-800 border-red-300';
        return 'bg-gray-100 text-gray-800 border-gray-300';
    };

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="mx-auto max-w-5xl space-y-6">

                {/* ADMIN CONTROLS */}
                <Card className="print:hidden border-primary/20 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <FileText className="h-6 w-6 text-primary" />
                            SME Validation Form Generator
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-md cursor-pointer hover:bg-primary/90 transition shadow-sm">
                                <Upload className="h-4 w-4" />
                                {isProcessing ? "Processing CSV..." : "Upload SME CSV"}
                                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                            </label>
                        </div>

                        {parsedData.length > 0 && (
                            <Button onClick={handlePrint} className="gap-2 shadow-sm">
                                <Printer className="h-4 w-4" /> Print Document
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* THE GENERATED DOCUMENT */}
                {parsedData.length > 0 && (
                    <div className="bg-white text-black p-0 print:p-0">

                        {/* Document Header */}
                        <div className="mb-6 border-b-2 border-gray-300 pb-4 print:break-after-avoid">
                            <h1 className="text-[13px] font-bold mb-1 uppercase">SME Content Validation Sheet</h1>
                            <p className="text-[11px] text-gray-700"><strong>Researcher:</strong> Chriscent Louis June M. Pingol</p>
                            <p className="text-[11px] text-gray-700"><strong>System:</strong> Adaptive Science Quiz Generation (RAG LLM)</p>
                        </div>

                        {parsedData.map((row, index) => {
                            const optionsArray = row["RAG Generated Options"]?.split('\n') || [];

                            return (
                                <div key={index}>
                                    <div className="mb-8 print:break-inside-avoid">

                                        {/* Header & Badges */}
                                        <div className="flex items-center gap-3 mb-3">
                                            {/* IMPORTANT: 13px Bold */}
                                            <h3 className="text-[13px] font-bold">
                                                {index + 1}. (ID: {row["Question ID"]})
                                            </h3>

                                            {/* DESCRIPTIONS: 10px */}
                                            <div className="flex gap-1.5 text-[10px] font-semibold tracking-tight">
                                                <span className="px-2 py-0.5 rounded-full border bg-slate-100 text-slate-700 border-slate-300">
                                                    {row["Subtopic"]}
                                                </span>
                                                <span className="px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                                                    {row["Bloom's"]}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-full border ${getDifficultyColor(row["Difficulty"])}`}>
                                                    {row["Difficulty"]}
                                                </span>
                                            </div>
                                        </div>

                                        {/* DESCRIPTION SECTION */}
                                        {row["Description"] && row["Description"].trim() !== "" && (
                                            <div className="mb-3 bg-gray-50 border border-gray-200 rounded p-2.5">
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Scenario / Context</p>
                                                <p className="text-[11px] text-gray-800 leading-snug">{row["Description"]}</p>
                                            </div>
                                        )}

                                        {/* IMAGE SECTION */}
                                        {row["Image"] && row["Image"].trim() !== "" && (() => {
                                            const images = row["Image"].split(",").map(i => i.trim()).filter(i => i !== "");

                                            return images.map((imgUrl: string, index: number) => (
                                                <div key={index} className="mb-3 flex justify-center bg-gray-50 border border-gray-200 rounded p-1.5">
                                                    <img
                                                        src={imgUrl}
                                                        alt={`Question Context Diagram ${index + 1}`}
                                                        className="max-h-40 object-contain rounded"
                                                    />
                                                </div>
                                            ));
                                        })()}

                                        {/* QUESTION TEXTS */}
                                        <div className="grid grid-cols-1 gap-3 mb-3">
                                            <div className="bg-gray-50 border border-gray-200 rounded p-2.5">
                                                {/* DESCRIPTION: 10px */}
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Original Seed Question</p>
                                                {/* BASE: 11px */}
                                                <p className="text-[11px] text-gray-800 italic leading-snug">{row["Original Seed Question"]}</p>
                                            </div>
                                            <div className="bg-white border-2 border-slate-200 rounded p-2.5 shadow-sm">
                                                {/* DESCRIPTION: 10px */}
                                                <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">RAG Generated Question</p>
                                                {/* IMPORTANT: 13px Bold - This is the main thing they are grading! */}
                                                <p className="text-[13px] font-bold text-black leading-snug">{row["RAG Generated Question"]}</p>
                                            </div>
                                        </div>

                                        {/* OPTIONS & ANSWER */}
                                        <div className="mb-4 ml-1">
                                            {/* BASE: 11px */}
                                            <p className="text-[11px] font-bold text-gray-700 mb-1">Generated Options:</p>
                                            <ul className="list-disc list-inside space-y-0.5 mb-2 text-[11px] text-gray-800 ml-1">
                                                {optionsArray.map((opt: string, i: number) => (
                                                    <li key={i}>{opt.replace(/^- /, '')}</li>
                                                ))}
                                            </ul>

                                            <div className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 px-2 py-1 rounded">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                                <span className="text-[10px] font-bold text-gray-700 uppercase">Correct Answer:</span>
                                                <span className="text-[11px] font-bold text-green-700">{row["Real Answer"]}</span>
                                            </div>
                                        </div>

                                        {/* SME EVALUATION BOX */}
                                        <div className="border-t border-dashed border-gray-300 pt-3 mt-3">
                                            {/* IMPORTANT: 13px Bold */}
                                            <p className="text-[13px] font-bold text-gray-800 mb-3 uppercase tracking-widest">SME Evaluation</p>
                                            <div className="flex gap-8 mb-4">
                                                <div className="flex items-end gap-2">
                                                    {/* BASE: 11px */}
                                                    <span className="text-[11px] font-semibold text-gray-700">Accuracy (1-5):</span>
                                                    <div className="border-b border-black w-12"></div>
                                                </div>
                                                <div className="flex items-end gap-2">
                                                    {/* BASE: 11px */}
                                                    <span className="text-[11px] font-semibold text-gray-700">Clarity (1-5):</span>
                                                    <div className="border-b border-black w-12"></div>
                                                </div>
                                            </div>
                                            <div className="space-y-5">
                                                <div className="flex items-end gap-2">
                                                    {/* BASE: 11px */}
                                                    <span className="text-[11px] font-semibold text-gray-700">Remarks:</span>
                                                    <div className="border-b border-black flex-grow"></div>
                                                </div>
                                                <div className="border-b border-black w-full"></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* PAGE BREAK: Now breaks every 3 questions instead of 2! */}
                                    {(index + 1) % 3 === 0 && (
                                        <div style={{ pageBreakAfter: 'always' }} className="print:block hidden" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SmeValidationPrintPage;
