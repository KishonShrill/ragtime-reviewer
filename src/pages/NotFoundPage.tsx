import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft } from "lucide-react";

const NotFoundPage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(token ? "/select" : "/");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="text-8xl font-black text-foreground tracking-tight">404</h1>
        <p className="text-xl text-muted-foreground font-medium">You are lost</p>
        <p className="text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <Button onClick={handleGoBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </Button>
      </div>
    </div>
  );
};

export default NotFoundPage;

