import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePortfolio } from "@/hooks/use-portfolio";
import { formatNumber } from "@/lib/portfolio-calculations";

interface EffectsBoardProps {
  onStartEffectA: (amount: number) => void;
  onStartEffectB: () => void;
}

export function EffectsBoard({ onStartEffectA, onStartEffectB }: EffectsBoardProps) {
  const [effectAAmount, setEffectAAmount] = useState("");
  const { portfolio } = usePortfolio();

  const amount = parseFloat(effectAAmount) || 0;
  const hasValidAmount = amount > 0 && amount <= (portfolio?.credits || 0);
  const canStartEffects = !!portfolio?.selectedCause;

  const handleQuickChip = (chipAmount: string) => {
    if (chipAmount === "max") {
      setEffectAAmount(portfolio?.credits.toString() || "0");
    } else {
      setEffectAAmount(chipAmount);
    }
  };

  const effectAButton = (
    <Button
      onClick={() => onStartEffectA(amount)}
      disabled={!canStartEffects || !hasValidAmount}
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
          <p className="text-sm text-muted-foreground mb-4">
            Buy a crypto asset you expect to rise. Borrow against it today. Donate the borrowed amount now while your asset keeps growing.
          </p>
          
          <div className="mb-4">
            <Label htmlFor="effect-a-amount" className="text-sm font-medium text-foreground mb-2">
              Amount to allocate
            </Label>
            <Input
              id="effect-a-amount"
              type="number"
              placeholder="Enter amount"
              value={effectAAmount}
              onChange={(e) => setEffectAAmount(e.target.value)}
              className="mb-2"
              data-testid="effect-a-amount"
            />
            
            <div className="flex items-center space-x-2 mb-2">
              {["100", "250", "500", "max"].map((chipAmount) => (
                <Button
                  key={chipAmount}
                  variant="secondary"
                  size="sm"
                  onClick={() => handleQuickChip(chipAmount)}
                  className="px-3 py-1 text-xs"
                  data-testid={`quick-chip-${chipAmount}`}
                >
                  {chipAmount === "max" ? "Max" : chipAmount}
                </Button>
              ))}
            </div>
            
            <p className="text-xs text-muted-foreground" data-testid="credits-available">
              You have <span data-testid="credits-helper">
                {formatNumber(portfolio?.credits || 0)}
              </span> credits available.
            </p>
          </div>
          
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
