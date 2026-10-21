import { sourceItem, type Prompt } from "../client";
import { DraftOutput } from "../schemas";
import { LINE_LIMITS, type Line } from "@/lib/sred/rules";
import type { EvidenceForPrompt } from "./types";

export type DraftInput = {
  project: { title: string; summary: string };
  criteria: string;
  evidence: EvidenceForPrompt[];
  taxYear: number;
  failures?: { text: string; reasons: string[] }[];
};

const STYLE = `Write in plain technical language, past tense, as the company ("the team").
Return the section as sentences, each citing the evidence ids it relies on. Every sentence needs at least one id.
Use a specific number only if that exact number appears in a cited excerpt. No marketing words, no claims of
novelty beyond what the evidence shows. Describe failed experiments openly; failures support eligibility.
If evidence is thin, write fewer sentences rather than filling gaps.`;

function draftPrompt(line: Line, focus: string): Prompt<DraftInput, DraftOutput> {
  return {
    name: `draft_line_${line}`,
    version: 2,
    model: "main",
    maxTokens: 16000,
    toolName: "submit_section",
    toolDescription: `Submit T661 line ${line} as cited sentences.`,
    schema: DraftOutput,
    system: `Draft Form T661 line ${line}: "${LINE_LIMITS[line].prompt}"
Limit: ${LINE_LIMITS[line].words} words. ${focus}
${STYLE}`,
    buildUser: (i) =>
      `Tax year ${i.taxYear}. Project: ${i.project.title}\n${i.project.summary}\n\nCriteria assessment:\n${i.criteria}\n\nEvidence:\n\n` +
      i.evidence.map((e) => sourceItem({ id: e.id, kind: e.kind, date: e.date, title: e.title, tags: e.tags.join(",") }, e.excerpt)).join("\n\n"),
  };
}

export const draftLine: Record<Line, Prompt<DraftInput, DraftOutput>> = {
  "242": draftPrompt("242", "State the technological uncertainties: what was not known and why standard practice or published methods could not resolve it."),
  "244": draftPrompt("244", "Describe the work done in the tax year: hypotheses, experiments, results, including failures, in order."),
  "246": draftPrompt("246", "State the advancement achieved or attempted: the new knowledge gained, with measured results where the evidence has them."),
};

export function regenerateWithFailures(line: Line): Prompt<DraftInput, DraftOutput> {
  const base = draftLine[line];
  return {
    ...base,
    name: "regenerate_with_failures",
    system: base.system + "\nA checker rejected some sentences of your previous draft. Fix each one: cite the right evidence, remove numbers not in the cited excerpts, or drop the sentence.",
    buildUser: (i) => base.buildUser(i) + "\n\nRejected sentences:\n" + (i.failures ?? []).map((f) => `- "${f.text}" (${f.reasons.join(", ")})`).join("\n"),
  };
}
