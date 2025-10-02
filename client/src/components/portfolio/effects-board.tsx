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

  const canStartEffects = !!portfolio?.selectedCause;

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
      {/* Effect A Card */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-lg font-semibold text-foreground">Effect A</h3>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">
                Medium Risk
              </Badge>
              <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                Instant
              </Badge>
            </div>
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

      {/* Effect B Card */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-lg font-semibold text-foreground">Effect B</h3>
            <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
              Low Risk
            </Badge>
          </div>
          
          <p className="text-sm font-medium text-foreground mb-2">Buy and hold</p>
          <p className="text-sm text-muted-foreground mb-20">
            Convert credits to APT and hold. Learn how price moves change your portfolio.
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
    </div>
  );
}
