import { z } from "zod";
import { runAgentLoop, runPrompt, type LookupTool } from "@/lib/llm/client";
import { classifyProject } from "@/lib/llm/prompts/classify_project";
import type { ClassifyOutput } from "@/lib/llm/schemas";
import { CRITERIA } from "@/lib/sred/rules";
import type { NormalizedSourceItem } from "@/lib/connectors/types";
import { projectEvidence, toPrompt, type Ctx, type ProjectRow, type SourceItemRow } from "./context";
import { decide, type Scores } from "./decision";
import { toSourceRow } from "./ingest";
import { tagBatch } from "./tag";

export const MAX_TOOL_CALLS = 5;

const invalidIds = (out: ClassifyOutput, allowed: Set<string>) =>
  CRITERIA.flatMap((c) => out[c.key].evidence_ids).filter((id) => !allowed.has(id));

export function scoresOf(out: ClassifyOutput): Scores {
  return Object.fromEntries(CRITERIA.map((c) => [c.key, out[c.key].score])) as Scores;
}

// Read-only lookups for the agent loop. Fetched items are ingested and tagged like any other
// item, as evidence for this project. Nothing here writes back to the source tools.
function lookupTools(ctx: Ctx, project: ProjectRow): LookupTool[] {
  const { connector } = ctx;
  const absorb = async (items: NormalizedSourceItem[]) => {
    const inYear = items.filter((i) => i.created_at >= ctx.taxYear.start && i.created_at <= ctx.taxYear.end);
    const known = new Set((await ctx.repo.list<SourceItemRow>("source_item", { tax_year: ctx.taxYear.id, external_id: inYear.map((i) => i.external_id) })).map((r) => r.external_id));
    const fresh = await ctx.repo.createMany("source_item", inYear.filter((i) => !known.has(i.external_id)).map((i) => toSourceRow(ctx.taxYear.id, i)));
    if (fresh.length) await tagBatch(ctx, fresh as SourceItemRow[], project.id);
    return items.map((i) => `<source_item id="${i.external_id}" kind="${i.kind}" date="${i.created_at.slice(0, 10)}">\n${i.body.slice(0, 1500).replace(/<\/?source_item/gi, "[source_item")}\n</source_item>`).join("\n\n") || "No results.";
  };
  const tools: LookupTool[] = [{
    name: "get_jira_issue", description: "Fetch one Jira issue by key, e.g. LV-131.",
    schema: z.object({ key: z.string() }),
    run: async (a) => absorb([await connector.getItem((a as { key: string }).key)].filter((x): x is NormalizedSourceItem => !!x)),
  }];
  if (connector.getThread) tools.push({
    name: "get_slack_thread", description: "Fetch a Slack thread by message id, e.g. slack:C02:1770832920.000100.",
    schema: z.object({ id: z.string() }),
    run: async (a) => absorb(await connector.getThread!((a as { id: string }).id)),
  });
  if (connector.searchDocs) tools.push({
    name: "search_docs", description: "Search lab notebooks and documents by keywords.",
    schema: z.object({ query: z.string() }),
    run: async (a) => absorb(await connector.searchDocs!((a as { query: string }).query)),
  });
  return tools;
}

export async function classifyOne(ctx: Ctx, project: ProjectRow, useTools = true) {
  const rctx = { repo: ctx.repo, taxYear: ctx.taxYear.id, project: project.id };
  let evidence = await projectEvidence(ctx, project.id);
  const input = () => ({ project: { title: project.title, summary: project.summary }, evidence: evidence.map(toPrompt) });
  let out = await runPrompt(classifyProject, input(), { ...rctx, inputIds: evidence.map((e) => e.external_id) });
  let calls: { name: string; args: unknown }[] = [];

  if (useTools && CRITERIA.some((c) => out[c.key].score === 1)) {
    const r = await runAgentLoop(classifyProject, { ...input(), canLookUp: true }, lookupTools(ctx, project), rctx, MAX_TOOL_CALLS);
    out = r.output;
    calls = r.calls;
    evidence = await projectEvidence(ctx, project.id);
  }

  const allowed = new Set(evidence.map((e) => e.external_id));
  const bad = invalidIds(out, allowed);
  if (bad.length) {
    out = await runPrompt(classifyProject, input(), { ...rctx, inputIds: [...allowed] },
      `Your previous answer cited ids that are not in this project's evidence: ${bad.join(", ")}. Cite only ids listed above.`);
    for (const c of CRITERIA) out[c.key].evidence_ids = out[c.key].evidence_ids.filter((id) => allowed.has(id));
  }

  const scores = scoresOf(out);
  const { decision, reason } = decide(scores, out.exclusions_hit);
  const version = (await ctx.repo.count("criteria_assessment", { project: project.id })) + 1;
  await ctx.repo.create("criteria_assessment", {
    tax_year: ctx.taxYear.id, project: project.id, version, scores,
    rationale: Object.fromEntries(CRITERIA.map((c) => [c.key, out[c.key].rationale])),
    evidence: Object.fromEntries(CRITERIA.map((c) => [c.key, out[c.key].evidence_ids])),
    exclusions_hit: out.exclusions_hit, decision, reason, tool_calls: calls, created_at: new Date().toISOString(),
  });
  await ctx.repo.update(project.id, { status: decision, reason, summary: out.summary });
  return decision;
}

// Stage 4 (PLAN 8.4)
export async function classify(ctx: Ctx) {
  const projects = await ctx.repo.list<ProjectRow>("project", { tax_year: ctx.taxYear.id, status: "candidate" });
  const counts = { eligible: 0, borderline: 0, not_eligible: 0 };
  for (const p of projects) counts[await classifyOne(ctx, p)]++;
  await ctx.progress("classify", counts);
  return counts;
}
