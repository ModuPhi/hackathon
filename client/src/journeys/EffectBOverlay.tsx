import { EffectBOverlay } from "@/components/effects/effect-b-overlay";
import type { JourneyComponentProps } from "@/components/journeys/journey-loader";

const SLUG = "buy-and-hold";

export default function EffectBJourney({ isOpen, onClose, telemetry }: JourneyComponentProps) {
  return (
    <EffectBOverlay
      isOpen={isOpen}
      onClose={onClose}
      onJourneyStart={() => telemetry.onStart(SLUG)}
      onJourneyComplete={() => telemetry.onComplete(SLUG)}
      onJourneyAbort={(reason) => telemetry.onAbort(SLUG, reason)}
    />
  );
}
