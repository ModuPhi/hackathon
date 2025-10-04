import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useJourneys } from "@/hooks/use-journeys";
import { useJourneyRuns } from "@/hooks/use-journey-runs";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useKeyless } from "@/contexts/keyless-context";
import type { JourneyManifestEntry } from "@/types/journeys";
import nexachainLogo from "@assets/nexachain.png";
import blockleadLogo from "@assets/blocklead.png";

const JOURNEY_METADATA: Record<string, {
  subtitle: string;
  description: string;
  poweredBy?: { label: string; logo: string; alt: string };
  badgeClassName: string;
  badgeLabel: string;
  testId: string;
  startLabel: string;
}> = {
  "buy-and-hold": {
    subtitle: "Start your crypto journey",
    description: "Learn how to purchase your first digital asset using credits. Understand pricing, fees, and how to hold long-term positions.",
    poweredBy: { label: "Powered by", logo: nexachainLogo, alt: "NexaChain" },
    badgeClassName: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    badgeLabel: "Beginner",
    testId: "start-effect-b-btn",
    startLabel: "Start Simple Start",
  },
  "lend-and-donate": {
    subtitle: "Donate now. Let your asset grow.",
    description: "Acquire a growth asset, post it as collateral, unlock stable value today, then donate the borrowed amount while your position keeps working for you.",
    poweredBy: { label: "Powered by", logo: blockleadLogo, alt: "Blocklead" },
    badgeClassName: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    badgeLabel: "Intermediate",
    testId: "start-effect-a-btn",
    startLabel: "Start Collateral Giving",
  },
};

type JourneysBoardProps = {
  onStartIntro: () => void;
  onSelectJourney: (journey: JourneyManifestEntry) => void;
};

export function JourneysBoard({ onStartIntro, onSelectJourney }: JourneysBoardProps) {
  const { data: journeys = [], isLoading } = useJourneys();
  const journeyRuns = useJourneyRuns();
  const runs = journeyRuns.data ?? [];
  const { portfolio } = usePortfolio();
  const { isAuthenticated } = useKeyless();

  const hasSelectedNonprofit = !!portfolio?.selectedNonprofit;
  const completedEffects = portfolio?.completedEffects || [];
  const isIntroComplete = completedEffects.includes('intro');

  const canStartJourneys = isAuthenticated && hasSelectedNonprofit && isIntroComplete;

  const getDisabledMessage = () => {
    if (!isAuthenticated) return 'Sign in to begin a Journey';
    if (!hasSelectedNonprofit) return 'Select a nonprofit first';
    if (!isIntroComplete) return 'Complete introduction first';
    return '';
  };

  const introButtonLabel = isIntroComplete ? 'Completed ✓' : 'Start Introduction';

  return (
    <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
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

          <Button
            onClick={onStartIntro}
            className="w-full"
            variant={isIntroComplete ? "outline" : "default"}
            data-testid="start-intro-btn"
          >
            {introButtonLabel}
          </Button>
        </CardContent>
      </Card>

      {isLoading && (
        <Card className="md:col-span-2">
          <CardContent className="p-6">
            <div className="animate-pulse text-sm text-muted-foreground">Loading journeys…</div>
          </CardContent>
        </Card>
      )}

      {!isLoading && journeys.map((journey) => {
        const metadata = JOURNEY_METADATA[journey.slug];
        const isCompleted = runs.some((run) => run.slug === journey.slug && run.completed_at);
        const buttonTestId = metadata?.testId ?? `start-${journey.slug}-btn`;
        const buttonLabel = isCompleted
          ? 'Completed ✓'
          : canStartJourneys
            ? metadata?.startLabel ?? `Start ${journey.title}`
            : getDisabledMessage();

        return (
          <Card key={journey.slug} className={isCompleted ? 'bg-success/5 border-success' : ''}>
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">
                    {journey.title}
                  </h3>
                  {metadata?.poweredBy && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">{metadata.poweredBy.label}</span>
                      <img
                        src={metadata.poweredBy.logo}
                        alt={metadata.poweredBy.alt}
                        className="h-12 w-12 object-contain"
                        data-testid={`${journey.slug}-logo`}
                      />
                    </div>
                  )}
                </div>
                <Badge variant="secondary" className={metadata?.badgeClassName ?? 'bg-blue-500/10 text-blue-600 border-blue-500/20'}>
                  {metadata?.badgeLabel ?? journey.level}
                </Badge>
              </div>

              <p className="text-sm font-medium text-foreground mb-2">
                {metadata?.subtitle ?? journey.title}
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                {metadata?.description ?? 'Explore this journey to deepen your knowledge of decentralized finance.'}
              </p>

              <Button
                onClick={() => onSelectJourney(journey)}
                disabled={!canStartJourneys || isCompleted}
                className="w-full"
                variant={isCompleted ? "outline" : "default"}
                data-testid={buttonTestId}
              >
                {buttonLabel}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
