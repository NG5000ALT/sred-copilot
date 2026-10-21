import type { NormalizedSourceItem } from "@/lib/connectors/types";
import { parsePayrollCsv } from "@/lib/connectors/csv";
import { chunk, type Ctx } from "./context";
import { stripPii } from "./excerpt";

const DERIVED = ["source_item", "evidence", "project", "criteria_assessment", "claim_section", "expenditure_line",
  "risk_flag", "eval_result", "supports", "worked_on", "cites", "supersedes"] as const;

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
