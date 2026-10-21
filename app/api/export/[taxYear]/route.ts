import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/roles";
import { workspace } from "@/lib/data";
import type { ClaimSectionRow, EvidenceRow, ProjectRow } from "@/lib/pipeline/context";
import { claimable } from "@/lib/pipeline/stages";
import { totals, type ExpenditureLine } from "@/lib/pipeline/expenditures";

const HEADER = "DRAFT, not filed, for CPA review. Synthetic demo data. Not tax advice.";
const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

// GET /api/export/2026?format=md|csv
export async function GET(req: Request, { params }: { params: Promise<{ taxYear: string }> }) {
  let s;
  try { s = await requirePermission("export", { redirectOnMissingOrg: false }); }
  catch (e) { return NextResponse.json({ error: String((e as Error).message) }, { status: 403 }); }
  const { company, taxYear } = await workspace(s.repo);
  const year = Number((await params).taxYear);
  if (!company || !taxYear || taxYear.year !== year) return NextResponse.json({ error: "Tax year not found" }, { status: 404 });
  const format = new URL(req.url).searchParams.get("format") ?? "md";

  if (format === "csv") {
    const lines = await s.repo.list<ExpenditureLine & { id: string; org: string; project: string }>("expenditure_line", { tax_year: taxYear.id });
    const projects = new Map((await s.repo.list<ProjectRow>("project", { tax_year: taxYear.id })).map((p) => [p.id, p.title]));
    const rows = [["person", "project", "salary_cad", "time_share_estimate", "time_share_override", "project_activity", "total_activity", "category", "qualifying_cad"].join(","),
      ...lines.map((l) => [l.person, projects.get(l.project), l.salary, l.time_share_est, l.time_share_override ?? "", l.basis.project_activity, l.basis.total_activity, l.category, l.qualifying_salary].map(csvCell).join(","))];
    const t = totals(lines);
    rows.push("", `${csvCell("Proxy overhead (55%)")},,,,,,,,${t.proxyOverhead}`, `${csvCell("Estimated ITC")},,,,,,,,${t.itc}`, csvCell(HEADER));
    return new NextResponse(rows.join("\n"), { headers: { "content-type": "text/csv", "content-disposition": `attachment; filename="sred-${year}-expenditures.csv"` } });
  }

  const projects = (await s.repo.list<ProjectRow>("project", { tax_year: taxYear.id })).filter(claimable);
  const appendix = new Map<string, EvidenceRow>();
  const out = [`# ${company.name}: SR&ED project descriptions, tax year ${year}`, "", `> ${HEADER}`, ""];
  for (const p of projects) {
    out.push(`## ${p.title}`, "", `Status: ${p.status}${p.user_decision ? ` (${p.user_decision} by reviewer)` : ""}`, "");
    const sections = (await s.repo.list<ClaimSectionRow>("claim_section", { project: p.id, head: true })).sort((a, b) => a.line.localeCompare(b.line));
    const evidence = new Map((await s.repo.list<EvidenceRow>("evidence", { tax_year: taxYear.id, project: p.id })).map((e) => [e.external_id, e]));
    for (const sec of sections) {
      out.push(`### Line ${sec.line} (${sec.word_count} words, version ${sec.version})`, "");
      out.push(sec.sentences.map((x) => {
        x.evidence_ids.forEach((id) => evidence.has(id) && appendix.set(id, evidence.get(id)!));
        return `${x.text} [${x.evidence_ids.join(", ")}]${x.supported ? "" : " **(unsupported: " + x.reasons.join(", ") + ")**"}`;
      }).join(" "), "");
    }
  }
  out.push("## Evidence appendix", "");
  [...appendix.values()].forEach((e) => out.push(`- **${e.external_id}** (${e.kind}, ${e.created_at.slice(0, 10)}, ${e.author ?? "unknown"}): "${e.excerpt}" ${e.url}`));
  return new NextResponse(out.join("\n"), { headers: { "content-type": "text/markdown; charset=utf-8", "content-disposition": `attachment; filename="sred-${year}-draft.md"` } });
}
