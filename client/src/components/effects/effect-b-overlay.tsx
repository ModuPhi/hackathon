import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

interface EffectBOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EffectBOverlay({ isOpen, onClose }: EffectBOverlayProps) {
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
                onClick={onClose}
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
                onClick={onClose}
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
