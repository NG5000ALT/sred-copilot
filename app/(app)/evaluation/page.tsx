import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/roles";
import { pct, workspace } from "@/lib/data";
import type { EvalOutput } from "@/lib/pipeline/evaluate";
import { Empty, PageHeader, StatusBadge, type Status } from "@/components/ui";

const CLS = ["eligible", "borderline", "not_eligible"] as const;

export default async function Evaluation() {
  const s = await requirePermission("read");
  const { company, taxYear } = await workspace(s.repo);
  if (!company || !taxYear) redirect("/onboarding");
  const [r] = await s.repo.list<EvalOutput & { id: string; org: string; created_at: string }>("eval_result", { tax_year: taxYear.id }, { orderBy: "created_at", desc: true, limit: 1 });
  if (!r) return (<><PageHeader title="Evaluation" /><Empty title="No evaluation yet">It runs at the end of each analysis when the company has an answer key.</Empty></>);
  const m = r.metrics;

  return (
    <>
      <PageHeader title="Evaluation against the answer key" />
      <p className="mb-8 max-w-prose">
        The answer key for {company.name} lists which seeded projects should qualify and who worked on them.
        It was drafted from the project plan and committed before the pipeline was first run on this fictional
        company (see the git history).
      </p>
      <dl className="grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-5">
        {[
          ["Eligibility precision", m.eligibility_precision, "Of projects called eligible, share that should be"],
          ["Eligibility recall", m.eligibility_recall, "Of projects that should be eligible, share found"],
          ["People F1", m.people_f1, "People matched to the right projects"],
          ["Key evidence recall", m.key_evidence_recall, "Answer-key records cited in drafts"],
          ["Citation support", m.citation_support_rate, "Draft sentences that passed the checker"],
        ].map(([label, v, help]) => (
          <div key={label as string} className="border-t-2 border-ink pt-2">
            <dt className="text-sm">{label as string}</dt>
            <dd className="mt-1 font-serif text-3xl font-semibold">{pct(v as number | null)}</dd>
            <p className="mt-1 text-sm text-meta">{help as string}</p>
          </div>
        ))}
      </dl>

      <section className="mt-12">
        <h2 className="font-serif text-xl font-semibold">Confusion matrix</h2>
        <p className="mt-1 text-sm text-meta">Rows are the answer key, columns are what the pipeline decided. Borderline expected {m.borderline_expected}, predicted {m.borderline_predicted}.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[480px] text-left">
            <thead className="text-sm"><tr><th className="py-2 pr-6 font-medium">Expected</th>{[...CLS, "missing"].map((c) => <th key={c} className="px-4 font-medium capitalize">{c.replace("_", " ")}</th>)}</tr></thead>
            <tbody>
              {CLS.map((row) => (
                <tr key={row} className="border-t border-rule">
                  <th className="py-2 pr-6 font-medium capitalize">{row.replace("_", " ")}</th>
                  {[...CLS, "missing" as const].map((col) => {
                    const n = r.confusion[row][col];
                    return <td key={col} className={`px-4 text-center ${n && row === col ? "bg-eligible-wash font-semibold" : n ? "bg-fail-wash" : "text-meta"}`}>{n}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-xl font-semibold">Per project</h2>
        <table className="mt-4 w-full text-left">
          <thead className="border-b border-rule text-sm text-meta"><tr><th className="py-2 font-medium">Code</th><th className="font-medium">Project</th><th className="font-medium">Expected</th><th className="font-medium">Predicted</th></tr></thead>
          <tbody>
            {r.per_project.map((p) => (
              <tr key={p.code} className="border-b border-rule/60">
                <td className="py-2">{p.code}</td><td>{p.title}</td>
                <td><StatusBadge status={p.expected as Status} /></td>
                <td>{p.predicted === "missing" ? <span className="text-fail">Not found</span> : <StatusBadge status={p.predicted as Status} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-sm text-meta">Evaluated {r.created_at.slice(0, 16).replace("T", " ")} UTC.</p>
      </section>
    </>
  );
}
