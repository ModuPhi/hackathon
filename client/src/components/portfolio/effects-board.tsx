import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePortfolio } from "@/hooks/use-portfolio";
import aptosLogo from "@assets/Aptos_Primary_BLK_1759458032595.png";
import aaveLogo from "@assets/aave_1759458032595.png";

interface EffectsBoardProps {
  onStartIntro: () => void;
  onStartEffectA: () => void;
  onStartEffectB: () => void;
}

export function EffectsBoard({ onStartIntro, onStartEffectA, onStartEffectB }: EffectsBoardProps) {
  const { portfolio } = usePortfolio();

  const canStartEffects = (portfolio?.selectedNonprofits?.length ?? 0) > 0;
  const completedEffects = portfolio?.completedEffects || [];
  
  const isIntroComplete = completedEffects.includes('intro');
  const isEffectBComplete = completedEffects.includes('effect-b');
  const isEffectAComplete = completedEffects.includes('effect-a');

  const effectAButton = (
    <Button
      onClick={onStartEffectA}
      disabled={!canStartEffects || isEffectAComplete}
      className="w-full"
      variant={isEffectAComplete ? "secondary" : "default"}
      data-testid="start-effect-a-btn"
    >
      {isEffectAComplete ? 'Completed ✓' : 'Start Effect A'}
    </Button>
  );

  const effectBButton = (
    <Button
      onClick={onStartEffectB}
      disabled={!canStartEffects || isEffectBComplete}
      className="w-full"
      variant={isEffectBComplete ? "secondary" : "default"}
      data-testid="start-effect-b-btn"
    >
      {isEffectBComplete ? 'Completed ✓' : 'Start Effect B'}
    </Button>
  );

  const introButton = (
    <Button
      onClick={onStartIntro}
      disabled={isIntroComplete}
      className="w-full"
      variant={isIntroComplete ? "secondary" : "default"}
      data-testid="start-intro-btn"
    >
      {isIntroComplete ? 'Completed ✓' : 'Start Introduction'}
    </Button>
  );

  return (
    <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
      {/* Intro Effect */}
      <Card className={isIntroComplete ? 'bg-success/5 border-success' : ''}>
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">
                Welcome to DeFi Giving
              </h3>
            </div>
            <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
              Introduction
            </Badge>
          </div>
          
          <p className="text-sm font-medium text-foreground mb-2">
            Start your learning journey
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Learn what DeFi Giving is, how this platform works, and what you'll accomplish through the Effects.
          </p>
          
          {introButton}
        </CardContent>
      </Card>

      {/* Effect B - Aptos (Beginner) */}
      <Card className={isEffectBComplete ? 'bg-success/5 border-success' : ''}>
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">
                Buy Your First Token
              </h3>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground">Powered by</span>
                <img src={aptosLogo} alt="Aptos" className="h-4" data-testid="aptos-logo" />
              </div>
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
      <Card className={isEffectAComplete ? 'bg-success/5 border-success' : ''}>
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">
                Collateralized Borrowing
              </h3>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground">Powered by</span>
                <img src={aaveLogo} alt="Aave" className="h-4" data-testid="aave-logo" />
              </div>
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
