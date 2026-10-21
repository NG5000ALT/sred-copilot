import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/roles";
import { money, workspace } from "@/lib/data";
import type { ProjectRow } from "@/lib/pipeline/context";
import { DraftLabel, Empty, LinkButton, PageHeader, StatusBadge } from "@/components/ui";

const ORDER = { eligible: 0, borderline: 1, not_eligible: 2, candidate: 3, insufficient_evidence: 4 };

export default async function Projects() {
  const s = await requirePermission("read");
  const { taxYear } = await workspace(s.repo);
  if (!taxYear) redirect("/onboarding");
  const [projects, evidence, edges, lines, flags] = await Promise.all([
    s.repo.list<ProjectRow>("project", { tax_year: taxYear.id }),
    s.repo.list("evidence", { tax_year: taxYear.id }),
    s.repo.list("worked_on", { tax_year: taxYear.id }),
    s.repo.list("expenditure_line", { tax_year: taxYear.id }),
    s.repo.list("risk_flag", { tax_year: taxYear.id, resolved: false }),
  ]);
  if (!projects.length) return (<><PageHeader title="Candidate projects" /><Empty title="No projects yet"><LinkButton href="/analyze">Run the analysis</LinkButton></Empty></>);

  const sorted = [...projects].sort((a, b) => ORDER[a.status] - ORDER[b.status]);
  const main = sorted.filter((p) => p.status !== "insufficient_evidence");
  const thin = sorted.filter((p) => p.status === "insufficient_evidence");
  const stat = (p: ProjectRow) => ({
    evidence: evidence.filter((e) => e.project === p.id).length,
    people: edges.filter((e) => String(e.out) === p.id).length,
    salary: lines.filter((l) => l.project === p.id).reduce((a, l) => a + (l.qualifying_salary as number), 0),
    flags: flags.filter((f) => f.project === p.id).length,
  });

  return (
    <>
      <PageHeader title={`Candidate projects, ${taxYear.year}`} />
      <ul className="divide-y divide-rule border-y border-rule">
        {main.map((p) => {
          const st = stat(p);
          return (
            <li key={p.id}>
              <Link href={`/projects/${encodeURIComponent(p.id)}`} className="grid gap-2 py-5 hover:bg-wash md:grid-cols-[1fr_auto] md:px-3">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusBadge status={p.status} />
                    {p.status === "borderline" && !p.user_decision && <span className="text-sm text-borderline">Needs a decision</span>}
                    {p.user_decision && <span className="text-sm text-meta">{p.user_decision === "accepted" ? "Accepted" : "Rejected"} by reviewer</span>}
                  </div>
                  <h2 className="mt-2 font-serif text-xl font-semibold">{p.title}</h2>
                  {p.reason && <p className="mt-1 max-w-prose">{p.reason} <DraftLabel /></p>}
                </div>
                <dl className="grid grid-cols-4 gap-4 text-sm md:w-[26rem] md:text-right">
                  <div><dt className="text-meta">Evidence</dt><dd className="font-medium">{st.evidence}</dd></div>
                  <div><dt className="text-meta">People</dt><dd className="font-medium">{st.people}</dd></div>
                  <div><dt className="text-meta">Qualifying salary</dt><dd className="font-medium">{st.salary ? money(st.salary) : "None"}</dd></div>
                  <div><dt className="text-meta">Open risks</dt><dd className={`font-medium ${st.flags ? "text-borderline" : ""}`}>{st.flags}</dd></div>
                </dl>
              </Link>
            </li>
          );
        })}
      </ul>

      {thin.length > 0 && (
        <section className="mt-12">
          <h2 className="font-serif text-xl font-semibold">Too little evidence to assess</h2>
          <p className="mt-1 max-w-prose text-meta">These Jira epics had fewer than three relevant records. They were not scored, and they are shown so nothing is dropped silently.</p>
          <ul className="mt-4 space-y-2">
            {thin.map((p) => <li key={p.id}><Link className="underline underline-offset-4" href={`/projects/${encodeURIComponent(p.id)}`}>{p.title}</Link> <span className="text-meta">({stat(p).evidence} evidence)</span></li>)}
          </ul>
        </section>
      )}
    </>
  );
}
