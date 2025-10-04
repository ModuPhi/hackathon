import { randomUUID } from "crypto";

export type JourneyRun = {
  id: string;
  slug: string;
  userId: string;
  tenantId: string;
  started_at: Date;
  completed_at: Date | null;
};

export type CreateJourneyRunInput = {
  slug: string;
  userId: string;
  tenantId: string;
};

export type CompleteJourneyRunInput = {
  slug: string;
  userId: string;
  tenantId: string;
};

export class JourneyRunsRepo {
  private runs: JourneyRun[] = [];

  startRun({ slug, userId, tenantId }: CreateJourneyRunInput): JourneyRun {
    const run: JourneyRun = {
      id: randomUUID(),
      slug,
      userId,
      tenantId,
      started_at: new Date(),
      completed_at: null,
    };

    this.runs.push(run);
    return run;
  }

  completeRun({ slug, userId, tenantId }: CompleteJourneyRunInput): JourneyRun {
    for (let i = this.runs.length - 1; i >= 0; i -= 1) {
      const run = this.runs[i];
      if (
        run.slug === slug &&
        run.userId === userId &&
        run.tenantId === tenantId &&
        run.completed_at === null
      ) {
        run.completed_at = new Date();
        return run;
      }
    }

    throw Object.assign(new Error("No open journey run found to complete"), {
      status: 404,
    });
  }

  getRuns(userId: string, tenantId: string): JourneyRun[] {
    return this.runs
      .filter((run) => run.userId === userId && run.tenantId === tenantId)
      .map((run) => ({ ...run }));
  }

  clearAll(): void {
    this.runs = [];
  }
}

export const journeyRunsRepo = new JourneyRunsRepo();
