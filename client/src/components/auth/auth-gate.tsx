import LoginScreen from "@/components/auth/login-screen";
import { useKeyless } from "@/contexts/keyless-context";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useKeyless();

  if (loading) return null; // blank screen during bootstrap
  if (!isAuthenticated) return <LoginScreen />;

  return <>{children}</>;
}

