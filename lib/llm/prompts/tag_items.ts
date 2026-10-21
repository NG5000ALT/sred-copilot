import { sourceItem, type Prompt } from "../client";
import { TagOutput } from "../schemas";
import { TAGS } from "@/lib/sred/rules";

type Input = { items: { id: string; kind: string; date: string; title?: string; body: string }[] };

export const tagItems: Prompt<Input, TagOutput> = {
  name: "tag_items",
  version: 1,
  model: "fast",
  maxTokens: 8000,
  toolName: "submit_tags",
  toolDescription: "Submit one tag result per source item.",
  schema: TagOutput,
  system: `Tag each source item from a company's work tools for SR&ED evidence.
Return one entry per item id. Mark relevant=true only for items about technical work: problems,
unknowns, hypotheses, experiments, measurements, failures, results or technical decisions.
Sales, support, hiring, admin and social chatter are not relevant.
Tags come only from: ${TAGS.join(", ")}. Use "routine" for standard engineering with a known solution.
The excerpt must be copied character for character from the body (no paraphrase, no ellipsis),
choosing the most informative span up to 500 characters. Excerpts that are not exact are discarded.`,
  buildUser: ({ items }) =>
    `Tag these ${items.length} items:\n\n` +
    items.map((i) => sourceItem({ id: i.id, kind: i.kind, date: i.date, title: i.title }, i.body)).join("\n\n"),
};
