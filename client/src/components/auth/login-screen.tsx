import { Button } from "@/components/ui/button";
import { useKeyless } from "@/contexts/keyless-context";

export default function LoginScreen() {
  const { login, loading } = useKeyless();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Button size="lg" onClick={login} disabled={loading} data-testid="login-button">
        Sign in with Google
      </Button>
    </div>
  );
}

