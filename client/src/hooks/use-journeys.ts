import { useQuery } from "@tanstack/react-query";
import { journeyManifestSchema, type JourneyManifestEntry } from "@/types/journeys";

async function fetchJourneys(): Promise<JourneyManifestEntry[]> {
  const res = await fetch("/api/journeys", { credentials: "include" });
  if (!res.ok) {
    throw new Error("Failed to load journeys");
  }

  const parsed = journeyManifestSchema.parse(await res.json());
  return parsed.filter((journey) => journey.enabled !== false);
}

export function useJourneys() {
  return useQuery({
    queryKey: ["/api/journeys"],
    queryFn: fetchJourneys,
  });
}
