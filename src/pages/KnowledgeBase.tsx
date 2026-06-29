import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useConfigStore } from "@/stores/useConfigStore"; // <-- Using our Zustand store
import { useQuery, useQueryClient } from "@tanstack/react-query";

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// Icons
import { Database, Image as ImageIcon, AlignLeft, Play, Upload, ArrowLeft, Search, ChevronLeft, ChevronRight } from "lucide-react";

// --- TYPES & HELPERS ---

interface KnowledgeBaseItem {
    question_id: string;
    question: string;
    answer: string;
    difficulty: string;
    subtopic: string;
    bloom_taxonomy: string;
    image?: string | null;
    description?: string | null;
}

function getDifficultyStyle(difficulty: string) {
    switch (difficulty.toLowerCase()) {
        case "easy": return "text-green-600 border-green-600/30 bg-green-500/10";
        case "medium": return "text-orange-500 border-orange-500/30 bg-orange-500/10";
        case "hard": return "text-destructive border-destructive/30 bg-destructive/10";
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

export default function KnowledgeBasePage() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const queryClient = useQueryClient(); // Used to force table refreshes

    // Auth & Config
    const backendUrl = useConfigStore((state) => state.backendUrl);
    const token = localStorage.getItem('reviewer_token');

    // State
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial Auth Check
    useEffect(() => {
        if (!token) {
            toast({ title: "Authentication Required", description: "Please sign in first!", variant: "destructive" });
            navigate("/");
        }
    }, [token, navigate, toast]);

    // Search Debounce Effect
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        setCurrentPage(1); // Reset to page 1 when search term changes
    }, [debouncedSearchTerm]);

    // --- DATA FETCHING (TanStack Query) ---
    const {
        data: questions = [],
        isLoading,
        isError,
        error
    } = useQuery({
        queryKey: ["knowledge_base"],
        enabled: !!token,
        queryFn: async () => {
            const response = await fetch(`${backendUrl}/api/knowledge_base`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => null);
                throw new Error(errData?.detail?.reason || errData?.detail || "Failed to load knowledge base.");
            }

            const data = await response.json();
            return (data.data || data) as KnowledgeBaseItem[];
        },
        gcTime: 1000 * 60 * 5,
        staleTime: 1000 * 60 * 1,
        refetchOnWindowFocus: false,
    });

    // Error handling effect for the query
    useEffect(() => {
        if (isError && error) {
            toast({
                variant: "destructive",
                title: "Error Loading Data",
                description: error.message
            });
        }
    }, [isError, error, toast]);

    // --- FILE UPLOAD HANDLER ---
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                let jsonPayload = JSON.parse(e.target?.result as string);

                // Safety check: ensure we are sending an array
                if (!Array.isArray(jsonPayload)) {
                    const extractedArray = Object.values(jsonPayload).find(val => Array.isArray(val as any));
                    if (extractedArray) {
                        jsonPayload = extractedArray;
                    } else {
                        throw new Error("JSON must contain an array of questions.");
                    }
                }

                const response = await fetch(`${backendUrl}/api/knowledge_base/upload`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(jsonPayload)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || "Failed to upload data.");
                }

                const result = await response.json();
                toast({ title: "Upload Successful", description: result.message });

                // NEW: Force the table to refresh with the newly uploaded data
                queryClient.invalidateQueries({ queryKey: ["knowledge_base"] });

            } catch (error: any) {
                toast({
                    title: "Upload Failed",
                    description: error.message || "Invalid JSON format or server error.",
                    variant: "destructive"
                });
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        reader.readAsText(file);
    };

    // --- CLIENT-SIDE FILTERING & PAGINATION ---
    const filteredQuestions = useMemo(() => {
        if (!debouncedSearchTerm) return questions;
        const lowerCaseSearch = debouncedSearchTerm.toLowerCase();
        return questions.filter(q =>
            q.question.toLowerCase().includes(lowerCaseSearch) ||
            q.subtopic.toLowerCase().includes(lowerCaseSearch)
        );
    }, [questions, debouncedSearchTerm]);

    const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / itemsPerPage));

    const paginatedQuestions = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredQuestions.slice(startIndex, endIndex);
    }, [filteredQuestions, currentPage, itemsPerPage]);

    if (!token) return null;

    return (
        <div className="min-h-screen bg-zinc-50/50 p-4 md:p-8">
            <div className="mx-auto max-w-7xl space-y-6 flex flex-col">

                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate("/select")} className="text-muted-foreground w-full sm:w-auto justify-start">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                    </Button>

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                        <div className="relative w-full sm:w-64 md:w-80">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search questions or topics..."
                                className="pl-9 bg-white"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <input
                            type="file"
                            accept=".json"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                        <Button onClick={() => fileInputRef.current?.click()} variant="default" className="w-full sm:w-auto">
                            <Upload className="mr-2 h-4 w-4" />
                            Upload JSON
                        </Button>
                    </div>
                </div>

                {/* Main Table Card */}
                <Card className="shadow-sm border-border/50">
                    <CardHeader className="border-b border-border/40 pb-4 bg-white rounded-t-xl">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                <Database className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-bold">Knowledge Base Explorer</CardTitle>
                                <CardDescription>
                                    View and test the raw seed questions used by the RAG generation engine.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0 bg-white">
                        {isLoading ? (
                            <div className="flex h-64 items-center justify-center text-muted-foreground animate-pulse">
                                Loading knowledge base...
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-zinc-50">
                                            <TableRow>
                                                <TableHead className="w-[60px]"></TableHead>
                                                <TableHead className="min-w-[300px]">Question & Answer</TableHead>
                                                <TableHead>Subtopic</TableHead>
                                                <TableHead>Bloom's Level</TableHead>
                                                <TableHead>Difficulty</TableHead>
                                                <TableHead className="text-right">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedQuestions.length > 0 ? (
                                                paginatedQuestions.map((item) => (
                                                    <TableRow key={item.question_id} className="hover:bg-zinc-50/50">
                                                        {/* Icons for Image/Description */}
                                                        <TableCell className="flex flex-col gap-2 justify-center h-full pt-4">
                                                            {item.image && (
                                                                <span title="Contains Image">
                                                                    <ImageIcon className="h-4 w-4 text-primary" />
                                                                </span>
                                                            )}

                                                            {item.description && (
                                                                <span title="Contains Description">
                                                                    <AlignLeft className="h-4 w-4 text-muted-foreground" />
                                                                </span>
                                                            )}
                                                        </TableCell>

                                                        {/* Question Text */}
                                                        <TableCell className="max-w-md">
                                                            <p className="font-medium text-foreground line-clamp-2">
                                                                {item.question}
                                                            </p>
                                                            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                                                <span className="font-semibold text-foreground/80">Ans:</span> {item.answer}
                                                            </p>
                                                        </TableCell>

                                                        {/* Tags */}
                                                        <TableCell>
                                                            <Badge variant="secondary" className="bg-zinc-100 text-zinc-700 hover:bg-zinc-200">
                                                                {item.subtopic}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className={`border bg-white shadow-sm ${getTaxonomyStyle(item.bloom_taxonomy)}`}>
                                                                {item.bloom_taxonomy}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className={getDifficultyStyle(item.difficulty)}>
                                                                {item.difficulty}
                                                            </Badge>
                                                        </TableCell>

                                                        {/* Actions */}
                                                        <TableCell className="text-right">
                                                            <Button
                                                                size="sm"
                                                                variant="secondary"
                                                                className="gap-2 bg-white text-black shadow-sm border hover:bg-zinc-100"
                                                                onClick={() => {
                                                                    navigate(`/quiz?mode=trial&question_id=${encodeURIComponent(item.question_id)}`, {
                                                                        state: { started: true }
                                                                    });
                                                                }}
                                                            >
                                                                <Play className="h-3 w-3 text-primary" /> Test
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                                        {debouncedSearchTerm
                                                            ? `No questions found matching "${searchTerm}"`
                                                            : "No questions available in the knowledge base."}
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Pagination Footer */}
                                <div className="flex items-center justify-between px-4 py-4 border-t border-border/40 bg-zinc-50 rounded-b-xl">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm text-muted-foreground font-medium hidden sm:block">Rows per page</p>
                                        <Select
                                            value={itemsPerPage.toString()}
                                            onValueChange={(val) => {
                                                setItemsPerPage(Number(val));
                                                setCurrentPage(1);
                                            }}
                                        >
                                            <SelectTrigger className="h-8 w-[70px] bg-white">
                                                <SelectValue placeholder={itemsPerPage} />
                                            </SelectTrigger>
                                            <SelectContent side="top">
                                                {[10, 25, 50, 100].map((size) => (
                                                    <SelectItem key={size} value={size.toString()}>
                                                        {size}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex items-center gap-4 text-sm font-medium">
                                        <span className="text-muted-foreground">
                                            Page {currentPage} of {totalPages}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 w-8 p-0 bg-white"
                                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 w-8 p-0 bg-white"
                                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                                disabled={currentPage === totalPages}
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
