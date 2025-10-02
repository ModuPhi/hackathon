import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Portfolio } from "@shared/schema";

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  portfolio: Portfolio | null;
}

export function NotificationPanel({ isOpen, onClose, portfolio }: NotificationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const notifications = [];

  if (portfolio?.healthFactor && portfolio.healthFactor < 1.25) {
    notifications.push({
      id: 'low-health',
      message: 'Your safety buffer is thin. Learn how to add collateral or repay a little.',
      action: 'Open micro-lesson'
    });
  }

  if (portfolio?.healthFactor && portfolio.healthFactor > 1.8 && portfolio.apt > 0) {
    notifications.push({
      id: 'high-apt',
      message: 'APT is up 25 percent. You can borrow an extra amount and donate more.',
      action: 'Open micro-lesson'
    });
  }

  return (
    <Card 
      ref={panelRef}
      className="fixed top-16 right-4 w-80 max-w-[calc(100vw-2rem)] z-50 animate-in slide-in-from-top-2 shadow-xl"
      data-testid="notification-panel"
    >
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
      </div>
      
      <div className="p-4 space-y-3">
        {notifications.length > 0 ? (
          notifications.map(notification => (
            <div key={notification.id} className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm text-foreground mb-2">{notification.message}</p>
              <Button
                variant="link"
                className="text-xs text-primary hover:underline font-medium p-0 h-auto"
                data-testid={`micro-lesson-${notification.id}`}
              >
                {notification.action}
              </Button>
            </div>
          ))
        ) : (
          <div className="text-sm text-muted-foreground text-center py-2">
            No notifications at this time.
          </div>
        )}
      </div>
    </Card>
  );
}
