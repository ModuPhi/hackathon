import { useQuery } from "@tanstack/react-query";
import { useKeyless } from "@/contexts/keyless-context";
import { journeyRunsSchema, type JourneyRun } from "@/types/journeys";

async function fetchJourneyRuns(userId: string, tenantId: string): Promise<JourneyRun[]> {
  const res = await fetch("/api/journey-runs", {
    credentials: "include",
    headers: {
      "x-user-id": userId,
      "x-tenant-id": tenantId,
    },
  });

  if (res.status === 401) {
    return [];
  }

  if (!res.ok) {
    throw new Error("Failed to load journey runs");
  }

  return journeyRunsSchema.parse(await res.json());
}

export function useJourneyRuns() {
  const { user, tenant, isAuthenticated } = useKeyless();

  const query = useQuery({
    queryKey: ["/api/journey-runs", user?.sub, tenant?.id],
    enabled: Boolean(isAuthenticated && user?.sub && tenant?.id),
    queryFn: () => fetchJourneyRuns(user!.sub, tenant!.id),
  });

  const completedCount = query.data?.filter((run) => run.completed_at).length ?? 0;

  return {
    ...query,
    completedCount,
  };
}
