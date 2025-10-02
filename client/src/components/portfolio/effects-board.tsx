import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePortfolio } from "@/hooks/use-portfolio";

interface EffectsBoardProps {
  onStartEffectA: () => void;
  onStartEffectB: () => void;
}

export function EffectsBoard({ onStartEffectA, onStartEffectB }: EffectsBoardProps) {
  const { portfolio } = usePortfolio();

  const canStartEffects = (portfolio?.selectedNonprofits?.length ?? 0) > 0;

  const effectAButton = (
    <Button
      onClick={onStartEffectA}
      disabled={!canStartEffects}
      className="w-full"
      data-testid="start-effect-a-btn"
    >
      Start Effect A
    </Button>
  );

  const effectBButton = (
    <Button
      onClick={onStartEffectB}
      disabled={!canStartEffects}
      className="w-full"
      data-testid="start-effect-b-btn"
    >
      Start Effect B
    </Button>
  );

  return (
    <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
      {/* Effect B - Aptos (Beginner) */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Buy Your First Token</h3>
              <p className="text-xs text-muted-foreground mt-1">Powered by Aptos</p>
            </div>
            <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
              Beginner
            </Badge>
          </div>
          
          <p className="text-sm font-medium text-foreground mb-2">
            Start your crypto journey
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Learn how to purchase your first cryptocurrency token (APT) using credits. Understand pricing, fees, and how to hold digital assets.
          </p>
          
          {canStartEffects ? (
            effectBButton
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                {effectBButton}
              </TooltipTrigger>
              <TooltipContent>
                <p>Select a nonprofit first</p>
              </TooltipContent>
            </Tooltip>
          )}
        </CardContent>
      </Card>

      {/* Effect A - Aave (Intermediate) */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Collateralized Borrowing</h3>
              <p className="text-xs text-muted-foreground mt-1">Powered by Aave</p>
            </div>
            <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
              Intermediate
            </Badge>
          </div>
          
          <p className="text-sm font-medium text-foreground mb-2">
            Donate now. Let your asset grow.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Buy a crypto asset you expect to rise. Borrow against it today. Donate the borrowed amount now while your asset keeps growing.
          </p>
          
          {canStartEffects ? (
            effectAButton
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                {effectAButton}
              </TooltipTrigger>
              <TooltipContent>
                <p>Select a nonprofit first</p>
              </TooltipContent>
            </Tooltip>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
