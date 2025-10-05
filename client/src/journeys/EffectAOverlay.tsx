import { EffectAOverlay } from "@/components/effects/effect-a-overlay";
import type { JourneyComponentProps } from "@/components/journeys/journey-loader";

const SLUG = "lend-and-donate";

export default function EffectAJourney({
  isOpen,
  onClose,
  capabilities,
  telemetry,
  journeyId,
  keyless,
  aptosClient,
}: JourneyComponentProps) {
  return (
    <EffectAOverlay
      isOpen={isOpen}
      onClose={onClose}
      onJourneyStart={() => telemetry.onStart(SLUG)}
      onJourneyComplete={() => telemetry.onComplete(SLUG)}
      onJourneyAbort={(reason) => telemetry.onAbort(SLUG, reason)}
      updatePortfolioOverride={capabilities.portfolio.merge}
      createReceiptOverride={capabilities.receipts.create}
      journeyId={journeyId}
      keylessRuntime={keyless}
      aptosClient={aptosClient}
    />
  );
}
