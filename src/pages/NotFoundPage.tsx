import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Compass, ArrowLeft, Home } from "lucide-react";

export default function NotFoundPage() {
    const navigate = useNavigate();

    // Direct localStorage check, no context required
    const token = localStorage.getItem("reviewer_token");

    const handleGoBack = () => {
        // Use replace to prevent getting stuck in a back-button loop
        navigate(token ? "/select" : "/", { replace: true });
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50/50 p-4 relative overflow-hidden">

            {/* Subtle Background Elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center text-center max-w-md w-full animate-in fade-in zoom-in-95 duration-500">

                {/* Icon */}
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-sm border border-border/50 mb-8 relative">
                    <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping opacity-20" />
                    <Compass className="h-12 w-12 text-primary/80" />
                </div>

                {/* 404 Text */}
                <h1 className="text-[120px] leading-none font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-zinc-800 to-zinc-400 mb-2">
                    404
                </h1>

                <h2 className="text-2xl font-bold text-foreground mb-3">
                    Looks like you're lost
                </h2>

                <p className="text-muted-foreground mb-8 text-base leading-relaxed">
                    We can't seem to find the page you're looking for. It might have been moved, deleted, or perhaps the URL is incorrect.
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                    <Button
                        variant="outline"
                        className="gap-2 bg-white hover:bg-zinc-50"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Go Back
                    </Button>
                    <Button
                        variant="default"
                        className="gap-2"
                        onClick={handleGoBack}
                    >
                        <Home className="h-4 w-4" />
                        {token ? "Return to Dashboard" : "Return to Login"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
