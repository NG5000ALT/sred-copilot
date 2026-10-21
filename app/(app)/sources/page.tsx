import { requirePermission, can } from "@/lib/auth/roles";
import { money, workspace } from "@/lib/data";
import { Empty, LinkButton, PageHeader } from "@/components/ui";
import { PayrollUpload } from "@/components/payroll-upload";
import { redirect } from "next/navigation";

const SOURCES = [
  { name: "Jira", what: "Epics, issues and comments", env: "ERA_JIRA_MCP_URL" },
  { name: "Slack", what: "Channel messages and threads", env: "ERA_SLACK_MCP_URL" },
  { name: "Documents", what: "Lab notebooks and design docs", env: "ERA_DOCS_MCP_URL" },
];

export default async function Sources() {
  const s = await requirePermission("read");
  const { company, taxYear } = await workspace(s.repo);
  if (!company || !taxYear) redirect("/onboarding");
  const era = process.env.CONNECTOR === "era";
  const people = await s.repo.list("person", { company: company.id }, { orderBy: "name" });

  return (
    <>
      <PageHeader title="Sources">
        <LinkButton href="/analyze">Continue to analysis</LinkButton>
      </PageHeader>
      <p className="mb-6 max-w-prose">
        {company.name} records come from {era ? "the Era simulated company over MCP" : "the bundled demo dataset"}.
        Access is read-only: the app has no way to change anything in these tools.
      </p>
      <ul className="grid gap-4 md:grid-cols-3">
        {SOURCES.map((src) => (
          <li key={src.name} className="rounded-lg border border-rule p-4">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold">{src.name}</h2>
              <span className="text-sm text-eligible">Connected</span>
            </div>
            <p className="mt-1">{src.what}</p>
            <p className="mt-3 text-sm text-meta">Scope: read-only. Via {era ? "Era MCP" : "demo dataset"}.</p>
          </li>
        ))}
      </ul>

      <section className="mt-12">
        <h2 className="font-serif text-2xl font-semibold">Payroll</h2>
        <p className="mt-2 max-w-prose">
          Salaries are needed to estimate qualifying expenditures. Upload a CSV with columns
          person_id, name, title, annual_salary_cad, employment_type, arm_length, specified_employee.
          The demo dataset loads its own payroll on the first analysis.
        </p>
        {can(s.role, "sources:edit") && <PayrollUpload />}
        {people.length ? (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead className="border-b border-rule text-sm text-meta">
                <tr><th className="py-2 font-medium">Person</th><th className="font-medium">Title</th><th className="font-medium">Type</th><th className="text-right font-medium">Salary</th></tr>
              </thead>
              <tbody>
                {people.map((p) => (
                  <tr key={p.id} className="border-b border-rule/60">
                    <td className="py-2">{String(p.name)}</td>
                    <td>{String(p.title ?? "")}</td>
                    <td>{p.employment_type ? `${p.employment_type}${p.arm_length === false ? ", non-arm's-length" : ""}${p.specified_employee ? ", specified" : ""}` : "No payroll"}</td>
                    <td className="text-right">{p.salary != null ? money(p.salary as number) : "None"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-6"><Empty title="No people yet">They appear after the first analysis reads the source tools.</Empty></div>
        )}
      </section>
    </>
  );
}
