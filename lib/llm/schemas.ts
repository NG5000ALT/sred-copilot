import { z } from "zod";
import { TAGS } from "@/lib/sred/rules";

export const TagOutput = z.object({
  items: z.array(z.object({
    id: z.string(),
    relevant: z.boolean().describe("true if the item says anything about technical work, experiments, uncertainty, results or decisions on a product or process"),
    tags: z.array(z.enum(TAGS)),
    excerpt: z.string().describe("A verbatim substring of the item body, copied exactly, max 500 characters. Empty string if not relevant."),
    confidence: z.number().min(0).max(1),
  })),
});
export type TagOutput = z.infer<typeof TagOutput>;

export const AssignOutput = z.object({
  assignments: z.array(z.object({
    evidence_id: z.string(),
    project_id: z.string().describe('A candidate project id exactly as given, or "none"'),
  })),
});

const Score = z.object({
  score: z.number().int().min(0).max(2).describe("0 no evidence, 1 weak, 2 clear"),
  rationale: z.string().describe("Two sentences, grounded in the cited evidence"),
  evidence_ids: z.array(z.string()),
});
export const ClassifyOutput = z.object({
  uncertainty: Score,
  hypothesis: Score,
  systematic: Score,
  advancement: Score,
  records: Score,
  exclusions_hit: z.array(z.string()).describe("Statutory exclusions this project's work falls under, copied from the list given. Empty if none."),
  summary: z.string().describe("One or two plain sentences describing the project"),
});
export type ClassifyOutput = z.infer<typeof ClassifyOutput>;

export const DraftOutput = z.object({
  sentences: z.array(z.object({
    text: z.string(),
    evidence_ids: z.array(z.string()).min(1),
  })),
});
export type DraftOutput = z.infer<typeof DraftOutput>;

export const ReviewerOutput = z.object({
  flags: z.array(z.object({
    severity: z.enum(["high", "medium", "low"]),
    kind: z.string().describe("short slug, e.g. routine_work, unsupported_advancement, thin_records"),
    target: z.string().describe("The sentence or criterion at risk"),
    message: z.string(),
    fix: z.string().describe('A concrete fix, e.g. "add the benchmark results from LV-131 to line 246"'),
    evidence_ids: z.array(z.string()),
  })).max(6),
});
export type ReviewerOutput = z.infer<typeof ReviewerOutput>;
