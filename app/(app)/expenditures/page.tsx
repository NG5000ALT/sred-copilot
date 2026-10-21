import { redirect } from "next/navigation";
import { can, requirePermission } from "@/lib/auth/roles";
import { money, pct, workspace } from "@/lib/data";
import { RATES } from "@/lib/sred/rules";
import { totals, type ExpenditureLine } from "@/lib/pipeline/expenditures";
import type { ProjectRow } from "@/lib/pipeline/context";
import { Empty, PageHeader, UnverifiedBadge } from "@/components/ui";
import { setOverride } from "../actions";

type LineRow = ExpenditureLine & { id: string; org: string };

export default async function Expenditures() {
  const s = await requirePermission("read");
  const { taxYear } = await workspace(s.repo);
  if (!taxYear) redirect("/onboarding");
  const [lines, projects, people] = await Promise.all([
    s.repo.list<LineRow>("expenditure_line", { tax_year: taxYear.id }),
    s.repo.list<ProjectRow>("project", { tax_year: taxYear.id }),
    s.repo.list("person", {}),
  ]);
  const title = new Map(projects.map((p) => [p.id, p.title]));
  const name = new Map(people.map((p) => [p.external_id as string, p.name as string]));
  const t = totals(lines);
  const editable = can(s.role, "expenditure:edit") && taxYear.status !== "frozen";
  const byProject = [...new Set(lines.map((l) => l.project))];

  return (
    <>
      <PageHeader title={`Expenditures, ${taxYear.year}`}>
        {can(s.role, "export") && <a href={`/api/export/${taxYear.year}?format=csv`} className="text-accent underline underline-offset-4">Download CSV</a>}
      </PageHeader>
      <p className="mb-8 rounded-lg border border-borderline/40 bg-borderline-wash p-4 font-medium text-ink">
        Estimate from activity data. CRA expects time records. Confirm with timesheets before filing.
      </p>
      {!lines.length ? <Empty title="No expenditure lines">They are calculated for eligible and accepted projects after analysis, once payroll is loaded.</Empty> : (
        <>
          {byProject.map((pid) => (
            <section key={pid} className="mb-10">
              <h2 className="font-serif text-xl font-semibold">{title.get(pid) ?? pid}</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left">
                  <thead className="border-b border-rule text-sm text-meta">
                    <tr>
                      <th className="py-2 font-medium">Person</th><th className="font-medium">Basis</th>
                      <th className="text-right font-medium">Estimate</th><th className="text-right font-medium">Override %</th>
                      <th className="text-right font-medium">Salary</th><th className="text-right font-medium">Qualifying</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.filter((l) => l.project === pid).map((l) => (
                      <tr key={l.id} className="border-b border-rule/60 align-top">
                        <td className="py-2">{name.get(l.person) ?? l.person}<div className="text-sm text-meta">{l.category.replaceAll("_", " ")}{l.note ? `: ${l.note}` : ""}</div></td>
                        <td className="py-2 text-sm">{l.basis.project_activity} of {l.basis.total_activity} activities</td>
                        <td className="py-2 text-right">{pct(l.time_share_est)}</td>
                        <td className="py-2 text-right">
                          {editable ? (
                            <form action={setOverride.bind(null, l.id)} className="flex justify-end gap-1">
                              <input name="share" type="number" min={0} max={100} step={1} aria-label={`Override time share for ${name.get(l.person) ?? l.person}`}
                                defaultValue={l.time_share_override != null ? Math.round(l.time_share_override * 100) : ""} className="w-16 rounded border border-rule px-1 py-0.5 text-right" />
                              <button className="rounded border border-rule px-2 text-sm hover:bg-wash">Set</button>
                            </form>
                          ) : l.time_share_override != null ? pct(l.time_share_override) : "None"}
                        </td>
                        <td className="py-2 text-right">{money(l.salary)}</td>
                        <td className="py-2 text-right font-medium">{money(l.qualifying_salary)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}

          <section className="max-w-lg border-t border-rule pt-6">
            <h2 className="font-serif text-xl font-semibold">Estimated credit</h2>
            <dl className="mt-4 space-y-2">
              {[
                ["Qualifying salaries", t.salaries, null],
                [`Arm's-length contracts at ${Math.round(RATES.contractorShare.value * 100)}%`, t.contracts, RATES.contractorShare],
                [`Proxy overhead at ${Math.round(RATES.proxyOverhead.value * 100)}% of salaries`, t.proxyOverhead, RATES.proxyOverhead],
                ["Qualifying expenditures", t.qualifying, null],
                [`Refundable ITC at ${Math.round(RATES.itcEnhanced.value * 100)}% up to the $${RATES.expenditureLimit.value / 1e6}M limit`, t.itcRefundable, RATES.expenditureLimit],
                [`Non-refundable ITC at ${Math.round(RATES.itcGeneral.value * 100)}% above the limit`, t.itcNonRefundable, RATES.itcGeneral],
              ].map(([label, value, rule]) => (
                <div key={label as string} className="flex items-baseline justify-between gap-4 border-b border-rule/60 pb-2">
                  <dt>{label as string} {rule ? <UnverifiedBadge {...(rule as { verified: boolean; source: string })} /> : null}</dt>
                  <dd>{money(value as number)}</dd>
                </div>
              ))}
              <div className="flex items-baseline justify-between pt-2 text-lg font-semibold"><dt>Estimated investment tax credit</dt><dd>{money(t.itc)}</dd></div>
            </dl>
            <p className="mt-4 text-sm text-meta">Specified-employee salary-base caps are not applied in this estimate. Hover a rate to see its source.</p>
          </section>
        </>
      )}
    </>
  );
}
