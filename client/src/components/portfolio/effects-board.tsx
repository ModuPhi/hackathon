import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  const hasSelectedNonprofit = !!portfolio?.selectedNonprofit;
  const completedEffects = portfolio?.completedEffects || [];
  
  const isIntroComplete = completedEffects.includes('intro');
  const isEffectBComplete = completedEffects.includes('effect-b');
  const isEffectAComplete = completedEffects.includes('effect-a');

  const canStartEffects = hasSelectedNonprofit && isIntroComplete;

  const getDisabledMessage = () => {
    if (!hasSelectedNonprofit) return 'Select a nonprofit first';
    if (!isIntroComplete) return 'Complete introduction first';
    return '';
  };

  const effectAButton = (
    <Button
      onClick={onStartEffectA}
      disabled={!canStartEffects}
      className="w-full"
      variant={isEffectAComplete ? "outline" : "default"}
      data-testid="start-effect-a-btn"
    >
      {isEffectAComplete ? 'Completed ✓' : !canStartEffects ? getDisabledMessage() : 'Start Journey A'}
    </Button>
  );

  const effectBButton = (
    <Button
      onClick={onStartEffectB}
      disabled={!canStartEffects}
      className="w-full"
      variant={isEffectBComplete ? "outline" : "default"}
      data-testid="start-effect-b-btn"
    >
      {isEffectBComplete ? 'Completed ✓' : !canStartEffects ? getDisabledMessage() : 'Start Journey B'}
    </Button>
  );

  const introButton = (
    <Button
      onClick={onStartIntro}
      className="w-full"
      variant={isIntroComplete ? "outline" : "default"}
      data-testid="start-intro-btn"
    >
      {isIntroComplete ? 'Completed ✓' : 'Start Introduction'}
    </Button>
  );

  return (
    <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
      {/* Intro Journey */}
      <Card className={isIntroComplete ? 'bg-success/5 border-success' : ''}>
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">
                Welcome & Getting Started
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
            Learn about this crypto education platform, how it works, and what you'll accomplish through the lessons.
          </p>
          
          {introButton}
        </CardContent>
      </Card>

      {/* Journey B - Aptos (Beginner) */}
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
          
          {effectBButton}
        </CardContent>
      </Card>

      {/* Journey A - Aave (Intermediate) */}
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
          
          {effectAButton}
        </CardContent>
      </Card>
    </div>
  );
}
