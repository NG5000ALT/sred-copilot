import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { runPrompt } from "@/lib/llm/client";
import { craReviewer } from "@/lib/llm/prompts/cra_reviewer";
import type { Row } from "@/lib/db/repo";
import { ROUTINE_KEYWORDS } from "@/lib/sred/rules";
import { projectEvidence, toPrompt, type ClaimSectionRow, type Ctx, type EvidenceRow, type ProjectRow } from "./context";
import { criteriaText } from "./draft";
import { AnswerKey, evaluate as scoreEval, type Predicted } from "./evaluate";
import { buildLines, type PayrollPerson } from "./expenditures";

export const claimable = (p: ProjectRow) => p.status === "eligible" || (p.status === "borderline" && p.user_decision === "accepted");

// Stage 7 (PLAN 8.7). Overrides are carried over, never discarded: from lines of this run, and
// from a previous run via the tax year's carryover (keyed by Jira epic).
export async function expenditures(ctx: Ctx) {
  const { repo, taxYear } = ctx;
  const all = await repo.list<ProjectRow>("project", { tax_year: taxYear.id });
  const byEpic = new Map(all.map((p) => [p.seed_epics[0], p.id]));
  const overrides = new Map<string, number>();
  for (const [k, v] of Object.entries(taxYear.carryover?.overrides ?? {})) {
    const [person, epic] = k.split("|");
    if (byEpic.has(epic)) overrides.set(`${person}|${byEpic.get(epic)}`, v);
  }
  for (const l of await repo.list("expenditure_line", { tax_year: taxYear.id }))
    if (l.time_share_override != null) overrides.set(`${l.person}|${l.project}`, l.time_share_override as number);
  await repo.remove("expenditure_line", { tax_year: taxYear.id });

  const projects = new Set(all.filter(claimable).map((p) => p.id));
  const people = (await repo.list("person", { company: ctx.company.id })).filter((p) => p.salary != null).map((p): PayrollPerson => ({
    id: p.external_id as string, name: p.name as string, salary: p.salary as number,
    employment_type: p.employment_type as PayrollPerson["employment_type"], arm_length: !!p.arm_length, specified_employee: !!p.specified_employee,
  }));
  const edges = (await repo.list("worked_on", { tax_year: taxYear.id }))
    .map((e) => ({ person: e.person as string, project: String(e.out), count: e.activity_count as number, total: e.total_activity as number }));
  const activity = edges.filter((e) => projects.has(e.project));
  const totals = new Map(edges.map((e) => [e.person, e.total]));
  const lines = buildLines(people, activity, totals, overrides);
  await repo.createMany("expenditure_line", lines.map((l) => ({ ...l, tax_year: taxYear.id })));
  const counts = { lines: lines.length, people_without_payroll: new Set(activity.map((a) => a.person)).size - new Set(lines.map((l) => l.person)).size };
  await ctx.progress("expenditures", counts);
  return counts;
}

type Flag = { severity: "high" | "medium" | "low"; kind: string; message: string; fix: string; evidence_ids: string[] };

// Rule-based flags (PLAN 8.8). Pure so it can be tested without a database.
export function ruleFlags(p: { title: string }, evidence: Pick<EvidenceRow, "external_id" | "tags" | "created_at" | "author">[], line246: string | null, shares: { person: string; count: number }[], taxYearEnd: string): Flag[] {
  const flags: Flag[] = [];
  if (evidence.length < 8) flags.push({ severity: "medium", kind: "thin_evidence", message: `Only ${evidence.length} evidence items support this project.`, fix: "Add records: experiment logs, test results or design notes from the tax year.", evidence_ids: [] });
  if (!evidence.some((e) => e.tags?.includes("failure") || e.tags?.includes("experiment")))
    flags.push({ severity: "high", kind: "no_experimentation", message: "No evidence tagged as an experiment or a failure.", fix: "Find records of tests or attempts that did not work; CRA expects systematic investigation.", evidence_ids: [] });
  if (line246 !== null && !/\d/.test(line246))
    flags.push({ severity: "medium", kind: "advancement_without_measurement", message: "Line 246 states no measured result.", fix: "Cite the measured outcome (benchmark, assay result) in line 246.", evidence_ids: [] });
  const title = p.title.toLowerCase();
  const kw = ROUTINE_KEYWORDS.filter((k) => new RegExp(`\\b${k}\\b`).test(title));
  if (kw.length) flags.push({ severity: "medium", kind: "routine_keywords", message: `Title suggests routine work (${kw.join(", ")}).`, fix: "Explain the technological uncertainty, or exclude the project.", evidence_ids: [] });
  const total = shares.reduce((a, s) => a + s.count, 0);
  const top = shares.reduce((a, s) => (s.count > a.count ? s : a), { person: "", count: 0 });
  if (total >= 5 && top.count / total > 0.9) flags.push({ severity: "low", kind: "single_contributor", message: `${top.person} accounts for over 90% of activity.`, fix: "Confirm who else worked on it, or have the tech lead confirm the narrative.", evidence_ids: [] });
  const lastMonth = new Date(Date.parse(taxYearEnd) - 31 * 86400000).toISOString();
  const late = evidence.filter((e) => e.created_at >= lastMonth);
  if (evidence.length >= 4 && late.length / evidence.length > 0.5)
    flags.push({ severity: "high", kind: "possible_reconstruction", message: "Most evidence is from the last month of the tax year, which can look reconstructed.", fix: "Add contemporaneous records from earlier in the year.", evidence_ids: late.map((e) => e.external_id) });
  return flags;
}

// Stage 8: rules plus a skeptical reviewer pass that only flags, never rewrites.
export async function risk(ctx: Ctx) {
  const { repo, taxYear } = ctx;
  await repo.remove("risk_flag", { tax_year: taxYear.id });
  const projects = (await repo.list<ProjectRow>("project", { tax_year: taxYear.id })).filter((p) => p.status === "eligible" || p.status === "borderline");
  let n = 0;
  for (const p of projects) {
    const evidence = await projectEvidence(ctx, p.id);
    const sections = await repo.list<ClaimSectionRow>("claim_section", { project: p.id, head: true });
    const shares = (await repo.list("worked_on", { tax_year: taxYear.id, out: p.id })).map((e) => ({ person: e.person as string, count: e.activity_count as number }));
    const flags: (Flag & { source: string })[] = ruleFlags(p, evidence, sections.find((s) => s.line === "246")?.text ?? null, shares, taxYear.end).map((f) => ({ ...f, source: "rule" }));
    if (sections.length) {
      const [assessment] = await repo.list("criteria_assessment", { project: p.id }, { orderBy: "version", desc: true, limit: 1 });
      const out = await runPrompt(craReviewer, {
        project: { title: p.title, status: p.status }, taxYear: { start: taxYear.start, end: taxYear.end }, criteria: criteriaText(assessment as Row | undefined),
        sections: sections.sort((a, b) => a.line.localeCompare(b.line)).map((s) => ({ line: s.line, text: s.text })), evidence: evidence.map(toPrompt),
      }, { repo, taxYear: taxYear.id, project: p.id, inputIds: evidence.map((e) => e.external_id) });
      const known = new Set(evidence.map((e) => e.external_id));
      flags.push(...out.flags.map((f) => ({ ...f, message: `${f.target}: ${f.message}`, evidence_ids: f.evidence_ids.filter((id) => known.has(id)), source: "model" })));
    }
    await repo.createMany("risk_flag", flags.map((f) => ({ ...f, tax_year: taxYear.id, project: p.id, resolved: false })));
    n += flags.length;
  }
  await ctx.progress("risk", { flags: n });
  return { flags: n };
}

export function loadAnswerKey(slug: string) {
  const file = path.join(process.cwd(), "answer-keys", `${slug}.json`);
  return existsSync(file) ? AnswerKey.parse(JSON.parse(readFileSync(file, "utf8"))) : null;
}

// Stage 9 (PLAN 8.9)
export async function evaluateStage(ctx: Ctx) {
  const { repo, taxYear } = ctx;
  const key = loadAnswerKey(ctx.company.slug);
  if (!key) { await ctx.progress("evaluate", { skipped: 1 }); return null; }
  const projects = await repo.list<ProjectRow>("project", { tax_year: taxYear.id });
  const edges = await repo.list("worked_on", { tax_year: taxYear.id });
  const predicted: Predicted[] = [];
  for (const p of projects) {
    const sections = await repo.list<ClaimSectionRow>("claim_section", { project: p.id, head: true });
    const sentences = sections.flatMap((s) => s.sentences);
    predicted.push({
      id: p.id, title: p.title, epics: p.seed_epics, status: p.status === "candidate" ? "not_eligible" : p.status,
      members: edges.filter((e) => String(e.out) === p.id).map((e) => e.person as string),
      citedSourceIds: [...new Set(sentences.flatMap((s) => s.evidence_ids))],
      sentences: { total: sentences.length, supported: sentences.filter((s) => s.supported).length },
    });
  }
  const r = scoreEval(key, predicted);
  await repo.create("eval_result", { tax_year: taxYear.id, answer_key: key.company, ...r, created_at: new Date().toISOString() });
  await ctx.progress("evaluate", { precision: r.metrics.eligibility_precision ?? 0, recall: r.metrics.eligibility_recall ?? 0 });
  return r;
}
