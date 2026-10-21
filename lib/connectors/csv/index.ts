import { z } from "zod";

export const PAYROLL_COLUMNS = ["person_id", "name", "title", "annual_salary_cad", "employment_type", "arm_length", "specified_employee"] as const;

const Bool = z.enum(["true", "false"]).transform((v) => v === "true");
export const PayrollRow = z.object({
  person_id: z.string().min(1),
  name: z.string().min(1),
  title: z.string(),
  annual_salary_cad: z.coerce.number().nonnegative(),
  employment_type: z.enum(["employee", "contractor"]),
  arm_length: Bool,
  specified_employee: Bool,
});
export type PayrollRow = z.infer<typeof PayrollRow>;

function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "", quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

// Validates the header and every row; returns row-level errors instead of throwing so the
// Sources page can show a preview with problems highlighted.
export function parsePayrollCsv(text: string): { rows: PayrollRow[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const header = splitLine(lines[0] ?? "");
  const missing = PAYROLL_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length) return { rows: [], errors: [`Missing columns: ${missing.join(", ")}`] };
  const rows: PayrollRow[] = [], errors: string[] = [];
  lines.slice(1).forEach((line, i) => {
    const cells = splitLine(line);
    const obj = Object.fromEntries(header.map((h, j) => [h, cells[j] ?? ""]));
    const r = PayrollRow.safeParse(obj);
    if (r.success) rows.push(r.data);
    else errors.push(`Row ${i + 2}: ${r.error.issues.map((x) => `${x.path.join(".")} ${x.message}`).join("; ")}`);
  });
  return { rows, errors };
}
