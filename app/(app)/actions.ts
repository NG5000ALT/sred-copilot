"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { repo } from "@/lib/db/repo";
import { requirePermission } from "@/lib/auth/roles";
import { workspace } from "@/lib/data";
import { parsePayrollCsv } from "@/lib/connectors/csv";
import { saveSection } from "@/lib/pipeline/draft";
import { buildLines } from "@/lib/pipeline/expenditures";
import type { ClaimSectionRow, EvidenceRow, ProjectRow, TaxYear } from "@/lib/pipeline/context";

const now = () => new Date().toISOString();

async function draftYear(r: ReturnType<typeof repo>) {
  const { company, taxYear } = await workspace(r);
  if (!company || !taxYear) throw new Error("Set up the company first");
  if (taxYear.status === "frozen") throw new Error("This claim is frozen. Frozen claims cannot change.");
  return { company, taxYear };
}

const Onboard = z.object({
  dataset: z.enum(["lakeshore-vision", "bayfront-bio"]),
  year: z.coerce.number().int().min(2020).max(2030),
});
const DATASET_NAMES = { "lakeshore-vision": "Lakeshore Vision Inc.", "bayfront-bio": "Bayfront Biologics Inc." };

export async function createCompany(form: FormData) {
  const a = await auth();
  if (!a.userId || !a.orgId) redirect("/onboarding");
  if (a.orgRole !== "org:admin") throw new Error("Only the organization owner can set up the company");
  const { dataset, year } = Onboard.parse(Object.fromEntries(form));
  const r = repo(a.orgId);
  const { company: existing } = await workspace(r);
  if (existing) redirect("/sources");
  const company = await r.create("company", { name: DATASET_NAMES[dataset], slug: dataset, fiscal_year_end: "12-31", synthetic: true, created_at: now() });
  await r.create("tax_year", { company: company.id, year, start: `${year}-01-01T00:00:00.000Z`, end: `${year}-12-31T23:59:59.999Z`, status: "draft" });
  redirect("/sources");
}

export async function uploadPayroll(form: FormData) {
  const s = await requirePermission("sources:edit");
  const { company } = await draftYear(s.repo);
  const file = form.get("file");
  if (!(file instanceof File) || file.size > 1_000_000) return { ok: false, errors: ["Choose a CSV file under 1 MB"] };
  const { rows, errors } = parsePayrollCsv(await file.text());
  if (errors.length) return { ok: false, errors };
  const people = new Map((await s.repo.list("person", { company: company.id })).map((p) => [p.external_id as string, p]));
  let matched = 0;
  for (const row of rows) {
    const fields = { salary: row.annual_salary_cad, employment_type: row.employment_type, arm_length: row.arm_length, specified_employee: row.specified_employee, title: row.title };
    const p = people.get(row.person_id);
    if (p) { await s.repo.update(p.id, fields); matched++; }
    else await s.repo.create("person", { company: company.id, external_id: row.person_id, name: row.name, ...fields });
  }
  revalidatePath("/sources");
  return { ok: true, errors: [], message: `Loaded ${rows.length} payroll rows (${matched} matched existing people).` };
}

export async function startAnalysis() {
  const s = await requirePermission("analyze");
  const { taxYear } = await draftYear(s.repo);
  const running = await s.repo.list("job", { status: ["queued", "running"], "payload.tax_year": taxYear.id });
  if (!running.length) await s.repo.create("job", { kind: "analyze_tax_year", payload: { tax_year: taxYear.id }, status: "queued", stage: "queued", progress: {}, created_at: now() });
  revalidatePath("/analyze");
}

export async function decideProject(projectId: string, decision: "accepted" | "rejected") {
  const s = await requirePermission("project:decide");
  const { taxYear } = await draftYear(s.repo);
  const p = await s.repo.get<ProjectRow>(projectId);
  if (!p || p.status !== "borderline") throw new Error("Only borderline projects need a decision");
  await s.repo.update(p.id, { user_decision: decision, decided_by: s.userId, decided_at: now() });
  if (decision === "accepted") await s.repo.create("job", { kind: "draft_project", payload: { tax_year: taxYear.id, project: p.id }, status: "queued", stage: "queued", progress: {}, created_at: now() });
  revalidatePath(`/projects/${encodeURIComponent(p.id)}`);
}

export async function resolveFlag(flagId: string) {
  const s = await requirePermission("risk:resolve");
  await draftYear(s.repo);
  await s.repo.update(flagId, { resolved: true, resolved_by: s.userId, resolved_at: now() });
  revalidatePath("/projects");
}

const SectionInput = z.object({
  project: z.string(),
  line: z.enum(["242", "244", "246"]),
  sentences: z.array(z.object({ text: z.string().trim().min(1), evidence_ids: z.array(z.string()) })).min(1),
});

export async function saveNarrative(input: z.infer<typeof SectionInput>) {
  const s = await requirePermission("narrative:edit");
  const { taxYear } = await draftYear(s.repo);
  const { project, line, sentences } = SectionInput.parse(input);
  const p = await s.repo.get<ProjectRow>(project);
  if (!p) throw new Error("Project not found");
  const evidence = await s.repo.list<EvidenceRow>("evidence", { tax_year: taxYear.id, project: p.id });
  const { row, checked } = await saveSection(s.repo, taxYear, p.id, line, sentences, evidence, "user");
  revalidatePath(`/projects/${encodeURIComponent(p.id)}`);
  return { version: row.version, unsupported: checked.sentences.filter((x) => !x.supported).length, word_count: checked.word_count };
}

export async function setOverride(lineId: string, form: FormData) {
  const s = await requirePermission("expenditure:edit");
  await draftYear(s.repo);
  const raw = String(form.get("share") ?? "").trim();
  const share = raw === "" ? null : z.coerce.number().min(0).max(100).parse(raw) / 100;
  const line = await s.repo.get(lineId);
  if (!line) throw new Error("Line not found");
  const [person] = await s.repo.list("person", { external_id: line.person as string });
  const basis = line.basis as { project_activity: number; total_activity: number };
  const [recalc] = buildLines(
    [{ id: line.person as string, name: String(person?.name ?? ""), salary: line.salary as number, employment_type: (person?.employment_type ?? "employee") as "employee", arm_length: !!person?.arm_length, specified_employee: !!person?.specified_employee }],
    [{ person: line.person as string, project: line.project as string, count: basis.project_activity }],
    new Map([[line.person as string, basis.total_activity]]),
    share == null ? new Map() : new Map([[`${line.person}|${line.project}`, share]]),
  );
  await s.repo.update(lineId, { time_share_override: share, qualifying_salary: recalc.qualifying_salary, override_by: s.userId });
  revalidatePath("/expenditures");
}

export async function freezeClaim() {
  const s = await requirePermission("claim:freeze");
  const { taxYear } = await draftYear(s.repo);
  const heads = await s.repo.list<ClaimSectionRow>("claim_section", { tax_year: taxYear.id, head: true });
  await s.repo.update<TaxYear>(taxYear.id, {
    status: "frozen", frozen_at: now(), frozen_by: s.userId,
    frozen_heads: heads.map((h) => ({ section: h.id, project: h.project, line: h.line, version: h.version, model_run: h.model_run ?? null })),
  });
  revalidatePath("/audit");
}

export async function deleteAllData(form: FormData) {
  const s = await requirePermission("data:delete");
  if (form.get("confirm") !== "delete all data") throw new Error('Type "delete all data" to confirm');
  await s.repo.deleteAllOrgData();
  redirect("/onboarding");
}
