import type { Repo } from "@/lib/db/repo";
import type { Company, TaxYear } from "@/lib/pipeline/context";

// The org's company and its current tax year (one company per org in this version).
export async function workspace(r: Repo): Promise<{ company: Company | null; taxYear: TaxYear | null }> {
  const [company] = await r.list<Company>("company", {}, { limit: 1 });
  if (!company) return { company: null, taxYear: null };
  const [taxYear] = await r.list<TaxYear>("tax_year", { company: company.id }, { orderBy: "year", desc: true, limit: 1 });
  return { company, taxYear: taxYear ?? null };
}

export async function latestJob(r: Repo, taxYear: string) {
  const [job] = await r.list("job", { "payload.tax_year": taxYear }, { orderBy: "created_at", desc: true, limit: 1 });
  return job ?? null;
}

export const money = (n: number) => n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
export const pct = (n: number | null | undefined) => (n == null ? "n/a" : `${Math.round(n * 100)}%`);
