import { z } from "zod";
import { sourceItem, type Prompt } from "../client";
import { AssignOutput } from "../schemas";
import type { EvidenceForPrompt } from "./types";

type Input = { candidates: { id: string; title: string; summary: string }[]; evidence: EvidenceForPrompt[] };

export const assignEvidence: Prompt<Input, z.infer<typeof AssignOutput>> = {
  name: "assign_evidence",
  version: 1,
  model: "fast",
  maxTokens: 16000,
  toolName: "submit_assignments",
  toolDescription: "Assign each evidence item to one candidate project or none.",
  schema: AssignOutput,
  system: `Assign each evidence item (Slack messages, documents) to the candidate project it is about.
Use "none" when it does not clearly belong to one project. Do not guess from a shared author alone.`,
  buildUser: ({ candidates, evidence }) =>
    `Candidate projects:\n${candidates.map((c) => `- ${c.id}: ${c.title}. ${c.summary}`).join("\n")}\n\nEvidence:\n\n` +
    evidence.map((e) => sourceItem({ id: e.id, kind: e.kind, date: e.date, title: e.title }, e.excerpt)).join("\n\n"),
};
