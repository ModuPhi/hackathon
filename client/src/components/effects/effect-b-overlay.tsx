import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

interface EffectBOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onJourneyStart?: () => void;
  onJourneyComplete?: () => void;
  onJourneyAbort?: (reason?: string) => void;
}

export function EffectBOverlay({ isOpen, onClose, onJourneyStart, onJourneyComplete, onJourneyAbort }: EffectBOverlayProps) {
  const startedRef = useRef(false);
  const completedRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      if (!startedRef.current) {
        startedRef.current = true;
        onJourneyStart?.();
      }
    } else {
      if (startedRef.current && !completedRef.current) {
        onJourneyAbort?.('closed');
      }
      startedRef.current = false;
      completedRef.current = false;
    }
  }, [isOpen, onJourneyAbort, onJourneyStart]);

  const handleCancel = () => {
    if (startedRef.current && !completedRef.current) {
      onJourneyAbort?.('user-cancelled');
    }
    onClose();
  };

  const handleReturn = () => {
    if (startedRef.current && !completedRef.current) {
      completedRef.current = true;
      onJourneyComplete?.();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-y-auto" data-testid="effect-b-overlay">
      <div className="min-h-screen">
        {/* Header */}
        <div className="bg-card border-b border-border sticky top-0 z-10 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>Portfolio</span>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground font-medium">Journey B</span>
              </div>
              <Button
                variant="ghost"
                onClick={handleCancel}
                className="text-sm text-muted-foreground hover:text-foreground"
                data-testid="cancel-effect-b"
              >
                Cancel and return
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-foreground mb-4">Buy and hold - Coming Soon</h2>
              <p className="text-muted-foreground mb-6">
                You now hold APT. Come back later to see how price changes affect your portfolio.
              </p>
              <Button
                onClick={handleReturn}
                data-testid="return-from-effect-b"
              >
                Return to portfolio
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
