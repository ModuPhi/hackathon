import { useState } from "react";
import { Header } from "@/components/shared/header";
import { BalanceCards } from "@/components/portfolio/balance-cards";
import { CauseSelector } from "@/components/portfolio/cause-selector";
import { SelectedNonprofits } from "@/components/portfolio/selected-nonprofits";
import { EffectsBoard } from "@/components/portfolio/effects-board";
import { ReceiptsTimeline } from "@/components/portfolio/receipts-timeline";
import { IntroEffectOverlay } from "@/components/effects/intro-effect-overlay";
import { EffectAOverlay } from "@/components/effects/effect-a-overlay";
import { EffectBOverlay } from "@/components/effects/effect-b-overlay";
import { usePortfolio } from "@/hooks/use-portfolio";

export default function PortfolioDashboard() {
  const [introOverlayOpen, setIntroOverlayOpen] = useState(false);
  const [effectAOverlayOpen, setEffectAOverlayOpen] = useState(false);
  const [effectBOverlayOpen, setEffectBOverlayOpen] = useState(false);
  
  const { isLoading } = usePortfolio();

  const handleStartIntro = () => {
    setIntroOverlayOpen(true);
  };

  const handleStartEffectA = () => {
    setEffectAOverlayOpen(true);
  };

  const handleStartEffectB = () => {
    setEffectBOverlayOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-muted rounded w-48"></div>
            <BalanceCards />
            <div className="h-12 bg-muted rounded w-64"></div>
            <div className="h-8 bg-muted rounded w-48"></div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="h-96 bg-muted rounded"></div>
              <div className="h-96 bg-muted rounded"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="portfolio-dashboard">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Balance Cards */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Your Portfolio</h2>
          <BalanceCards />
        </section>

        {/* Effects Board */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Choose an Effect</h2>
          <EffectsBoard
            onStartIntro={handleStartIntro}
            onStartEffectA={handleStartEffectA}
            onStartEffectB={handleStartEffectB}
          />
        </section>

        {/* Cause Selection */}
        <section className="mb-6">
          <CauseSelector />
        </section>

        {/* Selected Nonprofit & Donation Receipts */}
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-2">This is who you're playing for</h2>
          <p className="text-sm text-muted-foreground mb-6">
            See this as a challenge to maximize returns for your chosen nonprofit. Every strategy you learn can help make a bigger impact.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Left: Selected Nonprofit Card (1/3) */}
            <div className="md:col-span-1">
              <SelectedNonprofits />
            </div>
            
            {/* Right: Donation Receipts (2/3) */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-semibold text-foreground mb-4">Donation Receipts</h3>
              <ReceiptsTimeline />
            </div>
          </div>
        </section>
      </main>

      {/* Effect Overlays */}
      <IntroEffectOverlay
        isOpen={introOverlayOpen}
        onClose={() => setIntroOverlayOpen(false)}
      />

      <EffectAOverlay
        isOpen={effectAOverlayOpen}
        onClose={() => setEffectAOverlayOpen(false)}
      />

      <EffectBOverlay
        isOpen={effectBOverlayOpen}
        onClose={() => setEffectBOverlayOpen(false)}
      />
    </div>
  );
}
