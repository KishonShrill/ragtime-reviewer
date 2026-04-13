import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ResultAsync, errAsync, okAsync } from "neverthrow";
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
import { Database, Image as ImageIcon, AlignLeft, Play, ArrowLeft, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

// Define the shape of your knowledge base items
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

const KnowledgeBasePage = () => {
    const { token, backendUrl } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Helper for difficulty badge colors
    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty.toLowerCase()) {
            case "easy": return "text-success border-success/30 bg-success/10";
            case "medium": return "text-[#f97415] border-[#f97415]/30 bg-[#f97415]/10";
            case "hard": return "text-destructive border-destructive/30 bg-destructive/10";
            default: return "text-muted-foreground";
        }
    };

    useEffect(() => {
        if (!token) {
            toast({ title: "Illegal Entry", description: "Please sign in first!" });
            navigate("/");
            return;
        }
    }, [token, navigate, toast]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm]);

    const {
        data: questions = [], // Default to empty array
        isLoading,
        isError,
        error
    } = useQuery({
        queryKey: ["knowledge_base"],
        enabled: !!token, // Only run the fetch if the token exists!
        queryFn: async () => {
            const result = await ResultAsync.fromPromise(
                fetch(`${backendUrl}/api/knowledge_base`, {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }),
                (error) => ({ title: "Unreachable Server", reason: `Network Error: ${String(error)}` })
            ).andThen((response) => {
                if (response.status === 404)
                    return errAsync({ title: "Endpoint Not Found", reason: "Check your backend URL." });

                return ResultAsync.fromPromise(
                    response.json(),
                    () => ({ title: "Parsing Error", reason: "Failed to parse JSON response." })
                ).andThen((data) => {
                    if (!response.ok) {
                        return errAsync({
                            title: data?.detail?.title || "Error",
                            reason: data?.detail?.reason || "An unknown error occurred",
                        });
                    }
                    // Clean up the data shape right here
                    const items = data.data || data;
                    return okAsync(items as KnowledgeBaseItem[]);
                });
            });

            // UNWRAP THE RESULT FOR REACT QUERY
            return result.match(
                (data) => data,
                (err) => {
                    // We MUST throw here so React Query knows the query failed!
                    throw err;
                }
            );
        },
        gcTime: 1000 * 60 * 5,// int - keeps the data longer
        staleTime: 1000 * 60 * 1, // staleTime: int - default is 0 sec
        refetchOnWindowFocus: false,//boolean or 'always' - self explanatory
        select: (res) => res,

    });

    useEffect(() => {
        // Set a timer to update the debounced term after 2000ms (2 seconds)
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 400);

        // Cleanup: If the user types again BEFORE 2 seconds pass, clear the timer and restart
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        if (isError && error) {
            // Type assertion because we threw our custom Neverthrow object
            const err = error as { title: string; reason: string };
            toast({
                variant: "destructive",
                title: err.title || "Error",
                description: err.reason || "Failed to load knowledge base."
            });
        }
    }, [isError, error, toast]);

    // Simple client-side search filter
    const filteredQuestions = useMemo(() => {
        if (!debouncedSearchTerm) return questions;
        const lowerCaseSearch = debouncedSearchTerm.toLowerCase();
        return questions.filter(q =>
            q.question.toLowerCase().includes(lowerCaseSearch) ||
            q.subtopic.toLowerCase().includes(lowerCaseSearch)
        );
    }, [questions, debouncedSearchTerm]);

    const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / itemsPerPage));

    // 3. NEW: Slice the filtered array to only show the current page's items
    const paginatedQuestions = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredQuestions.slice(startIndex, endIndex);
    }, [filteredQuestions, currentPage, itemsPerPage]);

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="mx-auto max-w-7xl space-y-6 flex flex-col">

                {/* Header Actions */}
                <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={() => navigate("/select")} className="text-muted-foreground">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                    </Button>
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search questions or topics..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <Card className="shadow-xl border-border/50">
                    <CardHeader className="border-b border-border/40 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                <Database className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl">Knowledge Base Explorer</CardTitle>
                                <CardDescription>
                                    View and test the raw seed questions used by the RAG generation engine.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="flex h-64 items-center justify-center text-muted-foreground animate-pulse">
                                Loading knowledge base...
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-muted/30">
                                            <TableRow>
                                                <TableHead className="w-[80px]">Meta</TableHead>
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
                                                    <TableRow key={item.question_id}>
                                                        {/* Icons for Image/Description */}
                                                        <TableCell className="flex gap-2">
                                                            {item.image && <ImageIcon className="h-4 w-4 text-primary" title="Contains Image" />}
                                                            {item.description && <AlignLeft className="h-4 w-4 text-muted-foreground" title="Contains Description" />}
                                                        </TableCell>

                                                        {/* Question Text */}
                                                        <TableCell>
                                                            <p className="font-medium text-foreground line-clamp-2">
                                                                {item.question}
                                                            </p>
                                                            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                                                <span className="font-semibold">Ans:</span> {item.answer}
                                                            </p>
                                                        </TableCell>

                                                        {/* Tags */}
                                                        <TableCell>
                                                            <Badge variant="secondary">{item.subtopic}</Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{item.bloom_taxonomy}</Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className={getDifficultyColor(item.difficulty)}>
                                                                {item.difficulty}
                                                            </Badge>
                                                        </TableCell>

                                                        {/* Actions */}
                                                        <TableCell className="text-right">
                                                            <Button
                                                                size="sm"
                                                                variant="default"
                                                                className="gap-2"
                                                                onClick={() => {
                                                                    navigate(`/quiz?mode=trial&question_id=${encodeURIComponent(item.question_id)}`, {
                                                                        state: { started: true }
                                                                    });
                                                                }}
                                                            >
                                                                <Play className="h-3 w-3" /> Test
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                                        No questions found matching "{searchTerm}"
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>

                                <div className="flex items-center justify-between px-4 py-4 border-t border-border/40 bg-muted/10">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm text-muted-foreground font-medium">Rows per page</p>
                                        <Select
                                            value={itemsPerPage.toString()}
                                            onValueChange={(val) => {
                                                setItemsPerPage(Number(val));
                                                setCurrentPage(1); // Reset to page 1 when changing row count
                                            }}
                                        >
                                            <SelectTrigger className="h-8 w-[70px]">
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
                                                className="h-8 w-8 p-0"
                                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 w-8 p-0"
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
};

export default KnowledgeBasePage;
