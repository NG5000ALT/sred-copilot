import type { NormalizedSourceItem } from "@/lib/connectors/types";
import { parsePayrollCsv } from "@/lib/connectors/csv";
import { chunk, type Ctx } from "./context";
import { stripPii } from "./excerpt";

// Rows a re-run replaces. Claim sections and their supersedes/cites edges are never deleted:
// earlier drafts and human edits stay in the version history, marked as no longer current.
const DERIVED = ["source_item", "evidence", "project", "criteria_assessment", "expenditure_line",
  "risk_flag", "eval_result", "supports", "worked_on"] as const;

export type Carryover = { decisions: Record<string, "accepted" | "rejected">; overrides: Record<string, number> };

// Human decisions survive a re-run, keyed by Jira epic (project ids change every run).
async function snapshotHumanWork(ctx: Ctx): Promise<Carryover> {
  const { repo, taxYear } = ctx;
  const projects = await repo.list("project", { tax_year: taxYear.id });
  const epic = new Map(projects.map((p) => [p.id, (p.seed_epics as string[])[0]]));
  const decisions: Carryover["decisions"] = {};
  for (const p of projects) if (p.user_decision) decisions[epic.get(p.id)!] = p.user_decision as "accepted" | "rejected";
  const overrides: Carryover["overrides"] = {};
  for (const l of await repo.list("expenditure_line", { tax_year: taxYear.id }))
    if (l.time_share_override != null && epic.has(l.project as string)) overrides[`${l.person}|${epic.get(l.project as string)}`] = l.time_share_override as number;
  return { decisions, overrides };
}

export function toSourceRow(taxYear: string, i: NormalizedSourceItem) {
  return {
    tax_year: taxYear, external_id: i.external_id, kind: i.kind, url: i.url, author: i.author, created_at: i.created_at,
    title: i.title ?? null, body: stripPii(i.body), epic_key: i.epic_key ?? null, issue_type: i.issue_type ?? null,
    assignee: i.assignee ?? null, parent: i.parent ?? null, channel: i.channel ?? null,
    raw: i, // original kept for audit only; never sent to the model
  };
}

// Stage 1: read people and source items for the tax year. Rerunning replaces this year's outputs.
export async function ingest(ctx: Ctx) {
  const { repo, connector, taxYear, company } = ctx;
  if (taxYear.status === "frozen") throw new Error("Tax year is frozen; unfreeze is not supported");
  const carryover = await snapshotHumanWork(ctx);
  await repo.update(taxYear.id, { carryover });
  ctx.taxYear.carryover = carryover;
  for (const s of await repo.list("claim_section", { tax_year: taxYear.id, head: true })) await repo.update(s.id, { head: false, superseded_by_rerun: true });
  for (const t of DERIVED) await repo.remove(t, { tax_year: taxYear.id });

  const existing = new Map((await repo.list("person", { company: company.id })).map((p) => [p.external_id as string, p]));
  for (const p of await connector.listPeople()) {
    if (existing.has(p.external_id)) await repo.update(existing.get(p.external_id)!.id, { name: p.name, title: p.title, external_ids: { jira: p.jira, slack: p.slack } });
    else existing.set(p.external_id, await repo.create("person", { company: company.id, external_id: p.external_id, name: p.name, title: p.title, external_ids: { jira: p.jira, slack: p.slack } }));
  }

  // Demo companies ship a payroll file; load it if no payroll was uploaded yet.
  const payroll = await connector.payrollCsv?.();
  if (payroll && ![...existing.values()].some((p) => p.salary != null)) {
    const { rows } = parsePayrollCsv(payroll);
    for (const r of rows) {
      const p = existing.get(r.person_id);
      if (p) await repo.update(p.id, { salary: r.annual_salary_cad, employment_type: r.employment_type, arm_length: r.arm_length, specified_employee: r.specified_employee });
    }
  }

  const seen = new Set<string>();
  const rows: ReturnType<typeof toSourceRow>[] = [];
  for await (const item of connector.listSourceItems({ start: new Date(taxYear.start), end: new Date(taxYear.end) })) {
    if (seen.has(item.external_id)) continue;
    seen.add(item.external_id);
    rows.push(toSourceRow(taxYear.id, item));
  }
  for (const c of chunk(rows, 100)) await repo.createMany("source_item", c);
  const counts = { items: rows.length, people: existing.size };
  await ctx.progress("ingest", counts);
  return counts;
}
