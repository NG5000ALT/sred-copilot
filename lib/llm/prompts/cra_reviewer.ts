import { sourceItem, type Prompt } from "../client";
import { ReviewerOutput } from "../schemas";
import type { EvidenceForPrompt } from "./types";

type Input = { project: { title: string; status: string }; criteria: string; sections: { line: string; text: string }[]; evidence: EvidenceForPrompt[] };

export const craReviewer: Prompt<Input, ReviewerOutput> = {
  name: "cra_reviewer",
  version: 1,
  model: "main",
  maxTokens: 16000,
  toolName: "submit_flags",
  toolDescription: "Submit up to 6 risk flags. Do not rewrite the draft.",
  schema: ReviewerOutput,
  system: `Act as a skeptical CRA research and technology advisor reviewing a draft SR&ED project description
and its evidence. Find the weakest points a reviewer would challenge: routine work presented as
uncertainty, advancement without a measured result, gaps between the narrative and the records,
work outside the tax year. Return at most 6 flags with severity, the sentence or criterion at risk,
the evidence ids involved and one concrete fix. Only flag; never rewrite the draft.`,
  buildUser: (i) =>
    `Project: ${i.project.title} (status: ${i.project.status})\n\nCriteria:\n${i.criteria}\n\nDraft:\n` +
    i.sections.map((s) => `Line ${s.line}:\n${s.text}`).join("\n\n") + "\n\nEvidence:\n\n" +
    i.evidence.map((e) => sourceItem({ id: e.id, kind: e.kind, date: e.date }, e.excerpt)).join("\n\n"),
};
