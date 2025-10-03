import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PortfolioProvider } from "./contexts/portfolio-context";
import { KeylessProvider } from "./contexts/keyless-context";
import AuthGate from "@/components/auth/auth-gate";
import PortfolioDashboard from "@/pages/portfolio-dashboard";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={PortfolioDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <KeylessProvider>
          <PortfolioProvider>
            <Toaster />
            <AuthGate>
              <Router />
            </AuthGate>
          </PortfolioProvider>
        </KeylessProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
