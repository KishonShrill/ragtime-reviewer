import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

import LandingPage from "./pages/LandingPage";
import SelectionPage from "./pages/SelectionPage";
import QuizPage from "./pages/QuizPage";
import NotFoundPage from "./pages/NotFoundPage";
import ProfilePage from "./pages/ProfilePage";
import KnowledgeBasePage from "./pages/KnowledgeBase";
import SmeValidationPrintPage from "./pages/SmeValidationPrintPage";
import LatencyAnalyticsPage from "./pages/LatencyAnalytics";

const queryClient = new QueryClient();

const App = () => (
    <QueryClientProvider client={queryClient}>
        <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/select" element={<SelectionPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/quiz" element={<QuizPage />} />
                    <Route path="/knowledge_base" element={<KnowledgeBasePage />} />
                    <Route path="/sme-validation" element={<SmeValidationPrintPage />} />
                    <Route path="/latency" element={<LatencyAnalyticsPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </BrowserRouter>
        </TooltipProvider>
        <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
);

export default App;

