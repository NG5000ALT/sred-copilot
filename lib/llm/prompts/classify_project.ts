import { sourceItem, type Prompt } from "../client";
import { ClassifyOutput } from "../schemas";
import { CRITERIA, EXCLUSIONS } from "@/lib/sred/rules";
import type { EvidenceForPrompt } from "./types";

type Input = { project: { title: string; summary: string }; evidence: EvidenceForPrompt[]; canLookUp?: boolean };

export const classifyProject: Prompt<Input, ClassifyOutput> = {
  name: "classify_project",
  version: 1,
  model: "main",
  maxTokens: 4000,
  toolName: "submit_assessment",
  toolDescription: "Submit the criterion scores for this project.",
  schema: ClassifyOutput,
  system: `Assess one candidate project against the SR&ED criteria a CRA reviewer uses.
Score each criterion 0 (no evidence), 1 (weak), 2 (clear) and cite the evidence ids that support the score.
Criteria:
${CRITERIA.map((c) => `- ${c.key}: ${c.question}`).join("\n")}
Statutory exclusions (list one only if the project's core work is excluded, not because of a side task):
${EXCLUSIONS.value.map((e) => `- ${e}`).join("\n")}
Routine engineering with known solutions, style or UX changes, data migrations and routine
testing do not show technological uncertainty. Failed experiments support eligibility.
You do not decide eligibility; code applies the thresholds. Score only what the evidence shows.`,
  buildUser: ({ project, evidence, canLookUp }) =>
    `Project: ${project.title}\n${project.summary}\n\nEvidence (${evidence.length} items):\n\n` +
    evidence.map((e) => sourceItem({ id: e.id, kind: e.kind, date: e.date, author: e.author ?? undefined, tags: e.tags.join(",") }, e.excerpt)).join("\n\n") +
    (canLookUp ? "\n\nIf a criterion would score 1, you may look up related items (at most 5 lookups) before submitting." : ""),
};
