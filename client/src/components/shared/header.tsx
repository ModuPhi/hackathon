import { Bell, User, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { NotificationPanel } from "./notification-panel";
import { usePortfolio } from "@/hooks/use-portfolio";

export function Header() {
  const [showNotifications, setShowNotifications] = useState(false);
  const { portfolio } = usePortfolio();

  const hasNotifications = portfolio && (
    (portfolio.healthFactor && portfolio.healthFactor < 1.25) ||
    (portfolio.healthFactor && portfolio.healthFactor > 1.8)
  );

  return (
    <header className="bg-card border-b border-border sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">DeFi Giving</h1>
            <Badge 
              variant="secondary" 
              className="hidden sm:inline-flex bg-muted text-muted-foreground border-border"
              data-testid="mock-mode-badge"
            >
              Mock Mode
            </Badge>
          </div>
          
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-muted text-sm">
              <CheckCircle className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground font-medium">
                Effects completed: <span data-testid="effects-count">{portfolio?.effectsCompleted || 0}</span>
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
            
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-muted">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground hidden sm:inline" data-testid="demo-user">
                Demo User
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
