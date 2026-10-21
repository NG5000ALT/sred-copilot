import { runPrompt } from "@/lib/llm/client";
import { assignEvidence } from "@/lib/llm/prompts/assign_evidence";
import { chunk, toPrompt, type Ctx, type EvidenceRow, type ProjectRow, type SourceItemRow } from "./context";

export const MIN_EVIDENCE = 3;

// Activity per person per project: issues assigned, comments and messages authored on that project.
export function activity(items: SourceItemRow[], evidence: EvidenceRow[], projectByEpic: Map<string, string>) {
  const projectOfItem = new Map<string, string>();
  for (const i of items) if (i.epic_key && projectByEpic.has(i.epic_key)) projectOfItem.set(i.external_id, projectByEpic.get(i.epic_key)!);
  for (const e of evidence) if (e.project && !projectOfItem.has(e.external_id)) projectOfItem.set(e.external_id, e.project);
  const per = new Map<string, number>();
  const totals = new Map<string, number>();
  for (const i of items) {
    const who = i.kind === "jira_issue" ? i.assignee ?? i.author : i.author;
    if (!who) continue;
    totals.set(who, (totals.get(who) ?? 0) + 1);
    const p = projectOfItem.get(i.external_id);
    if (p) per.set(`${who}|${p}`, (per.get(`${who}|${p}`) ?? 0) + 1);
  }
  return {
    perProject: [...per].map(([k, count]) => { const [person, project] = k.split("|"); return { person, project, count }; }),
    totals,
  };
}

// Stage 3 (PLAN 8.3): Jira epics seed candidate projects; the model assigns unlinked evidence.
// shortcut: epic merge proposals are not implemented; each epic stays its own project.
export async function cluster(ctx: Ctx) {
  const { repo, taxYear } = ctx;
  const items = await repo.list<SourceItemRow>("source_item", { tax_year: taxYear.id });
  const epics = items.filter((i) => i.issue_type === "epic");
  const projectByEpic = new Map<string, string>();
  const projects: ProjectRow[] = [];
  for (const e of epics) {
    const p = await repo.create<ProjectRow>("project", {
      tax_year: taxYear.id, title: e.title ?? e.external_id, summary: e.body.slice(0, 400), seed_epics: [e.external_id],
      status: "candidate", user_decision: taxYear.carryover?.decisions[e.external_id] ?? null,
    });
    projectByEpic.set(e.external_id, p.id);
    projects.push(p);
  }

  let evidence = await repo.list<EvidenceRow>("evidence", { tax_year: taxYear.id });
  for (const e of evidence) {
    const p = e.epic_key ? projectByEpic.get(e.epic_key) : undefined;
    if (p) {
      await repo.update(e.id, { project: p, assigned_by: "rule" });
      await repo.relate(e.id, "supports", p, { tax_year: taxYear.id, weight: 1, assigned_by: "rule" });
    }
  }

  const unlinked = evidence.filter((e) => !e.epic_key || !projectByEpic.has(e.epic_key));
  const candidates = projects.map((p) => ({ id: p.id, title: p.title, summary: p.summary }));
  const valid = new Set(candidates.map((c) => c.id));
  for (const batch of chunk(unlinked, 30)) {
    if (!candidates.length) break;
    const out = await runPrompt(assignEvidence, { candidates, evidence: batch.map(toPrompt) },
      { repo, taxYear: taxYear.id, inputIds: batch.map((e) => e.external_id) });
    const byExt = new Map(batch.map((e) => [e.external_id, e]));
    for (const a of out.assignments) {
      const e = byExt.get(a.evidence_id);
      if (!e || !valid.has(a.project_id)) continue;
      await repo.update(e.id, { project: a.project_id, assigned_by: "model" });
      await repo.relate(e.id, "supports", a.project_id, { tax_year: taxYear.id, weight: 1, assigned_by: "model" });
    }
  }

  evidence = await repo.list<EvidenceRow>("evidence", { tax_year: taxYear.id });
  const people = new Map((await repo.list("person", { company: ctx.company.id })).map((p) => [p.external_id as string, p.id]));
  const { perProject, totals } = activity(items, evidence, projectByEpic);
  for (const a of perProject) {
    const pid = people.get(a.person);
    if (pid) await repo.relate(pid, "worked_on", a.project, {
      tax_year: taxYear.id, person: a.person, activity_count: a.count, total_activity: totals.get(a.person) ?? 0,
      share: a.count / (totals.get(a.person) || 1),
    });
  }

  let insufficient = 0;
  for (const p of projects) {
    const n = evidence.filter((e) => e.project === p.id).length;
    if (n < MIN_EVIDENCE) {
      insufficient++;
      await repo.update(p.id, { status: "insufficient_evidence", reason: `Only ${n} evidence item(s); at least ${MIN_EVIDENCE} needed to assess` });
    }
  }
  const counts = { projects: projects.length, insufficient, unassigned: evidence.filter((e) => !e.project).length };
  await ctx.progress("cluster", counts);
  return counts;
}
