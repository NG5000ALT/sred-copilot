import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/roles";
import type { ClaimSectionRow, EvidenceRow, ProjectRow } from "@/lib/pipeline/context";
import { PageHeader } from "@/components/ui";
import { NarrativeEditor } from "@/components/narrative-editor";

export default async function EditNarrative({ params }: { params: Promise<{ id: string }> }) {
  const s = await requirePermission("narrative:edit");
  const id = decodeURIComponent((await params).id);
  const p = await s.repo.get<ProjectRow>(id);
  if (!p || !id.startsWith("project:")) notFound();
  const [all, evidence] = await Promise.all([
    s.repo.list<ClaimSectionRow>("claim_section", { project: p.id }, { orderBy: "version", desc: true }),
    s.repo.list<EvidenceRow>("evidence", { tax_year: p.tax_year, project: p.id }, { orderBy: "created_at" }),
  ]);
  const lines = (["242", "244", "246"] as const).map((line) => ({
    line,
    head: all.find((x) => x.line === line && x.head) ?? null,
    history: all.filter((x) => x.line === line).map((x) => ({ version: x.version, author: x.author, created_at: x.created_at, text: x.text, word_count: x.word_count })),
  }));

  return (
    <>
      <PageHeader title={`Edit narrative: ${p.title}`}>
        <Link href={`/projects/${encodeURIComponent(p.id)}?tab=narrative`} className="text-accent underline underline-offset-4">Back to project</Link>
      </PageHeader>
      <p className="mb-8 max-w-prose">Each save creates a new version and runs the checker again. Earlier versions are kept and linked; nothing is overwritten.</p>
      <NarrativeEditor projectId={p.id} lines={lines.map((l) => ({ line: l.line, sentences: l.head?.sentences.map(({ text, evidence_ids }) => ({ text, evidence_ids })) ?? [], history: l.history }))}
        evidenceIds={evidence.map((e) => ({ id: e.external_id, label: `${e.external_id}: ${e.excerpt.slice(0, 60)}` }))} />
    </>
  );
}
