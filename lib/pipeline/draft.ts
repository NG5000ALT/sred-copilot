import { runPrompt } from "@/lib/llm/client";
import { draftLine, regenerateWithFailures, type DraftInput } from "@/lib/llm/prompts/draft_lines";
import { CRITERIA, type Line } from "@/lib/sred/rules";
import type { Repo, Row } from "@/lib/db/repo";
import { checkSection, type DraftSentence, type EvidenceRef } from "./check";
import { projectEvidence, toPrompt, type ClaimSectionRow, type Ctx, type EvidenceRow, type ProjectRow, type TaxYear } from "./context";

export const LINES: Line[] = ["242", "244", "246"];
export const REGENERATE_ABOVE = 0.1;

export const evidenceRefs = (evidence: EvidenceRow[]) =>
  new Map<string, EvidenceRef>(evidence.map((e) => [e.external_id, { id: e.external_id, project: e.project, created_at: e.created_at, excerpt: e.excerpt, title: e.title }]));
export const taxYearRange = (ty: TaxYear) => ({ start: ty.start, end: ty.end, year: ty.year });

// Write a new immutable version of a section, link it to the one it replaces and to its evidence.
export async function saveSection(repo: Repo, ty: TaxYear, projectId: string, line: Line, sentences: DraftSentence[], evidence: EvidenceRow[], author: "model" | "user", modelRun: string | null = null) {
  const checked = checkSection({ line, sentences, projectId, evidence: evidenceRefs(evidence), taxYear: taxYearRange(ty) });
  const prev = (await repo.list<ClaimSectionRow>("claim_section", { project: projectId, line, head: true }))[0];
  const row = await repo.create<ClaimSectionRow>("claim_section", {
    tax_year: ty.id, project: projectId, line, version: (prev?.version ?? 0) + 1,
    text: checked.sentences.map((s) => s.text).join(" "), sentences: checked.sentences,
    word_count: checked.word_count, over_limit: checked.over_limit, fail_rate: checked.fail_rate,
    author, created_at: new Date().toISOString(), model_run: modelRun, head: true,
  });
  if (prev) {
    await repo.update(prev.id, { head: false });
    await repo.relate(row.id, "supersedes", prev.id, { tax_year: ty.id });
  }
  const byExt = new Map(evidence.map((e) => [e.external_id, e.id]));
  for (const id of new Set(checked.sentences.flatMap((s) => s.evidence_ids))) {
    const ev = byExt.get(id);
    if (ev) await repo.relate(row.id, "cites", ev, { tax_year: ty.id });
  }
  return { row, checked };
}

export function criteriaText(a: Row | undefined) {
  if (!a) return "No assessment.";
  const scores = a.scores as Record<string, number>, rationale = a.rationale as Record<string, string>;
  return CRITERIA.map((c) => `${c.key}: ${scores[c.key]}/2. ${rationale[c.key]}`).join("\n");
}

export async function draftProject(ctx: Ctx, project: ProjectRow) {
  const evidence = await projectEvidence(ctx, project.id);
  const [assessment] = await ctx.repo.list("criteria_assessment", { project: project.id }, { orderBy: "version", desc: true, limit: 1 });
  const input: DraftInput = {
    project: { title: project.title, summary: project.summary }, criteria: criteriaText(assessment),
    evidence: evidence.map(toPrompt), taxYear: ctx.taxYear.year,
  };
  const rctx = { repo: ctx.repo, taxYear: ctx.taxYear.id, project: project.id, inputIds: evidence.map((e) => e.external_id) };
  let failed = 0, total = 0;
  for (const line of LINES) {
    let out = await runPrompt(draftLine[line], input, rctx);
    let checked = checkSection({ line, sentences: out.sentences, projectId: project.id, evidence: evidenceRefs(evidence), taxYear: taxYearRange(ctx.taxYear) });
    if (checked.fail_rate > REGENERATE_ABOVE || checked.over_limit) {
      const failures = checked.sentences.filter((s) => !s.supported).map((s) => ({ text: s.text, reasons: s.reasons }));
      if (checked.over_limit) failures.push({ text: "(whole section)", reasons: [`over the word limit at ${checked.word_count} words`] });
      out = await runPrompt(regenerateWithFailures(line), { ...input, failures }, rctx);
    }
    // After one regeneration we keep the draft; failing sentences stay visible, never hidden.
    const saved = await saveSection(ctx.repo, ctx.taxYear, project.id, line, out.sentences, evidence, "model");
    checked = saved.checked;
    total += checked.sentences.length;
    failed += checked.sentences.filter((s) => !s.supported).length;
  }
  return { sentences: total, unsupported: failed };
}

// Stage 5+6 (PLAN 8.5, 8.6): eligible projects, and borderline ones a human accepted.
export async function draft(ctx: Ctx) {
  const projects = (await ctx.repo.list<ProjectRow>("project", { tax_year: ctx.taxYear.id }))
    .filter((p) => p.status === "eligible" || (p.status === "borderline" && p.user_decision === "accepted"));
  const counts = { drafted: 0, sentences: 0, unsupported: 0 };
  for (const p of projects) {
    const r = await draftProject(ctx, p);
    counts.drafted++;
    counts.sentences += r.sentences;
    counts.unsupported += r.unsupported;
  }
  await ctx.progress("draft", counts);
  return counts;
}
