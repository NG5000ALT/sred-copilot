import Link from "next/link";
import { notFound } from "next/navigation";
import { can, requirePermission } from "@/lib/auth/roles";
import { workspace } from "@/lib/data";
import { CRITERIA, LINE_LIMITS } from "@/lib/sred/rules";
import { describeReason } from "@/lib/pipeline/check";
import type { ClaimSectionRow, EvidenceRow, ProjectRow } from "@/lib/pipeline/context";
import { Chip, EvidenceProvider, type EvidenceView } from "@/components/evidence";
import { Button, DraftLabel, Empty, PageHeader, StatusBadge } from "@/components/ui";
import { decideProject, resolveFlag } from "../../actions";

const TABS = ["criteria", "narrative", "risks"] as const;
type Tab = (typeof TABS)[number];

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const s = await requirePermission("read");
  const id = decodeURIComponent((await params).id);
  const tab: Tab = (TABS as readonly string[]).includes((await searchParams).tab ?? "") ? ((await searchParams).tab as Tab) : "criteria";
  const p = await s.repo.get<ProjectRow>(id);
  if (!p || !id.startsWith("project:")) notFound();
  const { taxYear } = await workspace(s.repo);
  const frozen = taxYear?.status === "frozen";

  const [evidence, [assessment], sections, flags] = await Promise.all([
    s.repo.list<EvidenceRow>("evidence", { tax_year: p.tax_year, project: p.id }, { orderBy: "created_at" }),
    s.repo.list("criteria_assessment", { project: p.id }, { orderBy: "version", desc: true, limit: 1 }),
    s.repo.list<ClaimSectionRow>("claim_section", { project: p.id, head: true }),
    s.repo.list("risk_flag", { project: p.id }),
  ]);
  const views: EvidenceView[] = evidence.map((e) => ({ id: e.external_id, kind: e.kind, author: e.author, date: e.created_at.slice(0, 10), excerpt: e.excerpt, title: e.title, url: e.url, tags: e.tags ?? [] }));
  const base = `/projects/${encodeURIComponent(p.id)}`;

  return (
    <EvidenceProvider evidence={views}>
      <PageHeader title={p.title}>
        <StatusBadge status={p.status} />
      </PageHeader>
      {p.reason && <p className="mb-2 max-w-prose">{p.reason}</p>}
      {p.summary && <p className="mb-6 max-w-prose text-meta">{p.summary} <DraftLabel /></p>}

      {p.status === "borderline" && can(s.role, "project:decide") && !frozen && (
        <div className="mb-8 rounded-lg border border-borderline/40 bg-borderline-wash p-4">
          <p className="font-medium">{p.user_decision ? `You ${p.user_decision} this project.` : "This project is borderline. Should it be part of the claim?"}</p>
          <p className="mt-1 text-sm">Accepting drafts lines 242 to 246 for it. Rejecting keeps it out of the claim.</p>
          <div className="mt-3 flex gap-3">
            <form action={decideProject.bind(null, p.id, "accepted")}><Button type="submit">Accept into claim</Button></form>
            <form action={decideProject.bind(null, p.id, "rejected")}><Button type="submit" variant="quiet">Keep out of claim</Button></form>
          </div>
        </div>
      )}

      <nav className="mb-8 flex gap-6 border-b border-rule" aria-label="Project sections">
        {TABS.map((t) => (
          <Link key={t} href={`${base}?tab=${t}`} aria-current={tab === t ? "page" : undefined}
            className={`-mb-px border-b-2 pb-2 capitalize ${tab === t ? "border-accent font-medium text-accent" : "border-transparent text-meta hover:text-ink"}`}>
            {t === "risks" ? `Risks (${flags.filter((f) => !f.resolved).length})` : t}
          </Link>
        ))}
      </nav>

      {tab === "criteria" && (assessment ? (
        <div className="space-y-8">
          {CRITERIA.map((c) => {
            const score = (assessment.scores as Record<string, number>)[c.key];
            const ids = (assessment.evidence as Record<string, string[]>)[c.key] ?? [];
            return (
              <section key={c.key} className="grid gap-3 md:grid-cols-[12rem_1fr]">
                <div>
                  <h3 className="font-semibold capitalize">{c.key}</h3>
                  <div className="mt-2 flex gap-1" aria-label={`Score ${score} of 2`}>
                    {[0, 1].map((i) => <span key={i} className={`h-2 w-10 rounded-sm ${i < score ? "bg-accent" : "bg-rule"}`} />)}
                  </div>
                  <p className="mt-1 text-sm text-meta">{["No evidence", "Weak", "Clear"][score]}</p>
                </div>
                <div>
                  <p className="text-sm text-meta">{c.question}</p>
                  <p className="mt-2 max-w-prose leading-relaxed">{(assessment.rationale as Record<string, string>)[c.key]} {ids.map((id) => <Chip key={id} id={id} />)}</p>
                </div>
              </section>
            );
          })}
          <section className="border-t border-rule pt-6">
            <h3 className="font-semibold">Exclusions</h3>
            <p className="mt-2">{(assessment.exclusions_hit as string[]).length ? (assessment.exclusions_hit as string[]).join("; ") : "None identified."}</p>
            {(assessment.tool_calls as unknown[])?.length > 0 && <p className="mt-2 text-sm text-meta">The assessor looked up {(assessment.tool_calls as unknown[]).length} extra record(s) through read-only tools.</p>}
          </section>
        </div>
      ) : <Empty title="Not assessed">{p.status === "insufficient_evidence" ? p.reason : "Run the analysis to score this project."}</Empty>)}

      {tab === "narrative" && (sections.length ? (
        <div className="space-y-10">
          {(["242", "244", "246"] as const).map((line) => {
            const sec = sections.find((x) => x.line === line);
            if (!sec) return null;
            const limit = LINE_LIMITS[line].words;
            const bad = sec.sentences.filter((x) => !x.supported).length;
            return (
              <section key={line} className="grid gap-x-4 md:grid-cols-[4rem_1fr]">
                <div className="font-serif text-3xl text-accent">{line}</div>
                <div>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm text-meta">{LINE_LIMITS[line].prompt}</p>
                    <span className="flex items-center gap-3 text-sm">
                      <span className={sec.word_count > limit ? "font-medium text-fail" : "text-meta"}>{sec.word_count} / {limit} words</span>
                      <span className="text-meta">Version {sec.version}</span>
                      {sec.author === "user" ? <span className="text-meta">Edited by a person</span> : <DraftLabel />}
                    </span>
                  </div>
                  <div className="mt-1 h-1 w-full rounded bg-rule"><div className={`h-1 rounded ${sec.word_count > limit ? "bg-fail" : "bg-accent"}`} style={{ width: `${Math.min(100, (sec.word_count / limit) * 100)}%` }} /></div>
                  <p className="mt-4 max-w-[68ch] font-serif text-[1.07rem] leading-[1.75]">
                    {sec.sentences.map((x, i) => (
                      <span key={i} className={x.supported ? "" : "rounded bg-fail-wash text-fail decoration-fail"} title={x.supported ? undefined : `Unsupported: ${x.reasons.map(describeReason).join("; ")}`}>
                        {x.text}{x.evidence_ids.map((id) => <Chip key={id} id={id} />)}{" "}
                      </span>
                    ))}
                  </p>
                  {bad > 0 && (
                    <ul className="mt-3 space-y-1 text-sm text-fail">
                      {sec.sentences.filter((x) => !x.supported).map((x, i) => <li key={i}>&ldquo;{x.text.slice(0, 70)}{x.text.length > 70 ? "…" : ""}&rdquo; {x.reasons.map(describeReason).join("; ")}</li>)}
                    </ul>
                  )}
                </div>
              </section>
            );
          })}
          {can(s.role, "narrative:edit") && !frozen && <Link href={`${base}/edit`} className="inline-block font-medium text-accent underline underline-offset-4">Edit narrative</Link>}
        </div>
      ) : <Empty title="No draft">{p.status === "borderline" ? "Accept this project to draft it." : p.status === "eligible" ? "Drafting runs during analysis." : "Only eligible or accepted projects are drafted."}</Empty>)}

      {tab === "risks" && (flags.length ? (
        <ul className="space-y-4">
          {flags.sort((a, b) => Number(a.resolved) - Number(b.resolved)).map((f) => (
            <li key={f.id} className={`rounded-lg border p-4 ${f.resolved ? "border-rule opacity-60" : f.severity === "high" ? "border-fail/40" : "border-rule"}`}>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className={`font-medium ${f.severity === "high" ? "text-fail" : f.severity === "medium" ? "text-borderline" : "text-meta"}`}>{String(f.severity)} risk</span>
                <span className="text-meta">{f.source === "model" ? "CRA-reviewer pass" : "Rule check"}</span>
                {f.source === "model" && <DraftLabel />}
                {f.resolved ? <span className="text-eligible">Resolved</span> : null}
              </div>
              <p className="mt-2">{String(f.message)} {(f.evidence_ids as string[]).map((id) => <Chip key={id} id={id} />)}</p>
              <p className="mt-1 text-sm"><span className="font-medium">Suggested fix:</span> {String(f.fix)}</p>
              {!f.resolved && can(s.role, "risk:resolve") && !frozen && (
                <form action={resolveFlag.bind(null, f.id)} className="mt-3"><Button type="submit" variant="quiet">Mark resolved</Button></form>
              )}
            </li>
          ))}
        </ul>
      ) : <Empty title="No risk flags">Flags appear for eligible and borderline projects after analysis.</Empty>)}

      <p className="mt-12 text-sm text-meta">{evidence.length} evidence items linked to this project.</p>
    </EvidenceProvider>
  );
}
