import { Bell, User, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { NotificationPanel } from "./notification-panel";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useKeyless } from "@/contexts/keyless-context";
import { shortAptosAddress } from "@/lib/utils";
import { useJourneyRuns } from "@/hooks/use-journey-runs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const [showNotifications, setShowNotifications] = useState(false);
  const { portfolio } = usePortfolio();
  const { aptosAddress, isAuthenticated, login, logout, loading } = useKeyless();
  const { completedCount } = useJourneyRuns();

  const hasNotifications = portfolio && (
    (portfolio.healthFactor && portfolio.healthFactor < 1.25) ||
    (portfolio.healthFactor && portfolio.healthFactor > 1.8 && portfolio.apt > 0)
  );

  const formattedAddress = shortAptosAddress(aptosAddress);

  return (
    <header className="bg-card border-b border-border sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Meridian Wealth Partners</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Crypto Education Portal</p>
          </div>
          
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-muted text-sm">
              <CheckCircle className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground font-medium">
                Journeys completed: <span data-testid="effects-count">{completedCount}</span>
              </span>
            </div>
            
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 hover:bg-muted"
                data-testid="notification-bell"
              >
                <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
                {hasNotifications && (
                  <div 
                    className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full"
                    data-testid="notification-badge"
                  />
                )}
              </Button>
              
              <NotificationPanel 
                isOpen={showNotifications}
                onClose={() => setShowNotifications(false)}
                portfolio={portfolio}
              />
            </div>
            
            <div className="flex items-center">
              {!isAuthenticated ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={login}
                  disabled={loading}
                >
                  Sign in with Google
                </Button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted"
                    >
                      <User className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground hidden sm:inline" data-testid="aptos-address">
                        {formattedAddress}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={(event) => {
                        event.preventDefault();
                        logout();
                      }}
                    >
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
