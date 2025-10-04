import { z } from "zod";

export const journeyManifestEntrySchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  level: z.string().min(1),
  enabled: z.boolean().default(true),
  importPath: z.string().min(1),
});

export const journeyManifestSchema = z.array(journeyManifestEntrySchema);

export type JourneyManifestEntry = z.infer<typeof journeyManifestEntrySchema>;

export const journeyRunSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  started_at: z.string().min(1),
  completed_at: z.string().nullable(),
});

export const journeyRunsSchema = z.array(journeyRunSchema);

export type JourneyRun = z.infer<typeof journeyRunSchema>;
