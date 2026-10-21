import Link from "next/link";
import { redirect } from "next/navigation";
import { can, requirePermission } from "@/lib/auth/roles";
import { workspace } from "@/lib/data";
import type { ClaimSectionRow, ProjectRow } from "@/lib/pipeline/context";
import { Button, Empty, PageHeader } from "@/components/ui";
import { freezeClaim } from "../actions";

export default async function Audit({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const s = await requirePermission("read");
  const { taxYear } = await workspace(s.repo);
  if (!taxYear) redirect("/onboarding");
  const filter = (await searchParams).project;
  const [projects, runs, sections] = await Promise.all([
    s.repo.list<ProjectRow>("project", { tax_year: taxYear.id }),
    s.repo.list("model_run", filter ? { tax_year: taxYear.id, project: filter } : { tax_year: taxYear.id }, { orderBy: "created_at", desc: true, limit: 200 }),
    s.repo.list<ClaimSectionRow>("claim_section", { tax_year: taxYear.id }, { orderBy: "version", desc: true }),
  ]);
  const title = new Map(projects.map((p) => [p.id, p.title]));
  const frozen = taxYear.status === "frozen";
  const heads = (taxYear.frozen_heads ?? []) as { section: string; project: string; line: string; version: number }[];
  const tokens = runs.reduce((a, r) => a + (r.tokens_in as number) + (r.tokens_out as number), 0);

  return (
    <>
      <PageHeader title="Audit trail">
        {can(s.role, "export") && <a href={`/api/export/${taxYear.year}?format=md`} className="text-accent underline underline-offset-4">Export draft (Markdown)</a>}
      </PageHeader>

      <section className="mb-12 rounded-lg border border-rule p-5">
        {frozen ? (
          <>
            <h2 className="font-semibold">Claim frozen {String(taxYear.frozen_at).slice(0, 16).replace("T", " ")} UTC</h2>
            <p className="mt-1 max-w-prose">This snapshot records which version of each section, and so which evidence and model run, made up the claim when it was frozen.</p>
            <ul className="mt-4 space-y-1">
              {heads.map((h) => <li key={h.section}>{title.get(h.project) ?? h.project}, line {h.line}: version {h.version}</li>)}
            </ul>
          </>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold">Freeze the {taxYear.year} claim</h2>
              <p className="mt-1 max-w-prose">Freezing locks every section at its current version so you can show later what was known when the claim was drafted. It cannot be undone.</p>
            </div>
            {can(s.role, "claim:freeze") && <form action={freezeClaim}><Button type="submit">Freeze claim</Button></form>}
          </div>
        )}
      </section>

      <section className="mb-12">
        <h2 className="font-serif text-xl font-semibold">Claim versions</h2>
        {sections.length ? (
          <table className="mt-4 w-full text-left">
            <thead className="border-b border-rule text-sm text-meta"><tr><th className="py-2 font-medium">Project</th><th className="font-medium">Line</th><th className="font-medium">Version</th><th className="font-medium">Author</th><th className="font-medium">Created</th></tr></thead>
            <tbody>
              {sections.map((x) => (
                <tr key={x.id} className="border-b border-rule/60">
                  <td className="py-2">{title.get(x.project) ?? <span className="text-meta">Earlier analysis</span>}</td><td>{x.line}</td>
                  <td>v{x.version}{x.head ? " (current)" : ""}{x.version > 1 ? ", supersedes v" + (x.version - 1) : ""}</td>
                  <td>{x.author === "user" ? "Person" : "Model"}</td><td>{x.created_at.slice(0, 16).replace("T", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Empty title="No drafts yet" />}
      </section>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="font-serif text-xl font-semibold">Model calls</h2>
          <form className="flex items-center gap-2 text-sm">
            <label htmlFor="project">Project</label>
            <select id="project" name="project" defaultValue={filter ?? ""} className="rounded border border-rule px-2 py-1">
              <option value="">All</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
            <button className="rounded border border-rule px-2 py-1 hover:bg-wash">Filter</button>
            {filter && <Link href="/audit" className="underline">Clear</Link>}
          </form>
        </div>
        <p className="mt-1 text-sm text-meta">{runs.length} calls shown, {tokens.toLocaleString()} tokens. Every call records the prompt version and a hash of its template.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-rule text-meta"><tr><th className="py-2 font-medium">Time</th><th className="font-medium">Prompt</th><th className="font-medium">Model</th><th className="font-medium">Hash</th><th className="font-medium">Inputs</th><th className="text-right font-medium">Tokens</th><th className="text-right font-medium">ms</th></tr></thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-b border-rule/60">
                  <td className="py-1.5">{String(r.created_at).slice(5, 19).replace("T", " ")}</td>
                  <td>{String(r.prompt_name)}@v{String(r.prompt_version)}</td><td>{String(r.model)}</td>
                  <td><code>{String(r.prompt_hash)}</code></td>
                  <td title={(r.input_ids as string[]).join(", ")}>{(r.input_ids as string[]).length} items</td>
                  <td className="text-right">{(r.tokens_in as number) + (r.tokens_out as number)}</td><td className="text-right">{String(r.ms)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
