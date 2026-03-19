import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface QuizImageViewerProps {
    images: string[];
}

const QuizImageViewer = ({ images }: QuizImageViewerProps) => {
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    const goNext = () => setActiveIndex((i) => (i + 1) % images.length);
    const goPrev = () => setActiveIndex((i) => (i - 1 + images.length) % images.length);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowLeft") goPrev();
        if (e.key === "ArrowRight") goNext();
    };

    return (
        <>
            {/* Thumbnail strip */}
            <div className="flex gap-2 overflow-x-auto">
                {images.map((src, i) => (
                    <button
                        key={i}
                        onClick={() => { setActiveIndex(i); setOpen(true); }}
                        className="relative group shrink-0 rounded-lg overflow-hidden border border-border/50 hover:border-primary/50 transition-colors"
                    >
                        <img
                            src={src}
                            alt={`Question image ${i + 1}`}
                            className="h-36 w-auto max-w-[16rem] object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-foreground/0 group-hover:bg-foreground/20 transition-colors">
                            <ZoomIn className="h-5 w-5 text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                        </div>
                    </button>
                ))}
            </div>

            {/* Fullscreen modal */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent
                    className="max-w-[95vw] max-h-[95vh] p-0 border-none bg-background/95 backdrop-blur-sm flex items-center justify-center"
                    onKeyDown={handleKeyDown}
                >
                    <VisuallyHidden>
                        <DialogTitle>Image viewer</DialogTitle>
                    </VisuallyHidden>

                    <img
                        src={images[activeIndex]}
                        alt={`Full view ${activeIndex + 1}`}
                        className="max-w-full max-h-[85vh] object-contain rounded-md"
                    />

                    {images.length > 1 && (
                        <>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/60 hover:bg-background/80"
                                onClick={goPrev}
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-10 top-1/2 -translate-y-1/2 rounded-full bg-background/60 hover:bg-background/80"
                                onClick={goNext}
                            >
                                <ChevronRight className="h-5 w-5" />
                            </Button>
                            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-sm text-muted-foreground bg-background/60 px-3 py-1 rounded-full">
                                {activeIndex + 1} / {images.length}
                            </span>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
};

export default QuizImageViewer;

