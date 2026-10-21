// Writes fixtures/<company>/*.json from the authored content in scripts/fixture-content.
// Deterministic (seeded noise), so committed output is reproducible. Every file is synthetic.
// Usage: pnpm fixtures
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { bayfront } from "./fixture-content/bayfront";
import { lakeshore } from "./fixture-content/lakeshore";
import type { CompanyFixture } from "./fixture-content/builder";

const header = { synthetic: true, generator: "scripts/generate-fixtures.ts", note: "Fictional company. No real people or data." };

export function writeFixture(f: CompanyFixture, root = "fixtures") {
  const dir = path.join(root, f.slug);
  mkdirSync(dir, { recursive: true });
  const items = f.build().items;
  const by = (k: string) => items.filter((i) => i.kind.startsWith(k));
  const write = (name: string, data: unknown) =>
    writeFileSync(path.join(dir, name), JSON.stringify({ ...header, ...(data as object) }, null, 2) + "\n");
  write("company.json", { company: f.company });
  write("people.json", { people: f.people.map(({ salary, employment_type, arm_length, specified_employee, ...p }) => p) });
  write("jira.json", { items: by("jira") });
  write("slack.json", { items: by("slack") });
  write("docs.json", { items: by("doc") });
  const csv = ["person_id,name,title,annual_salary_cad,employment_type,arm_length,specified_employee",
    ...f.people.map((p) => [p.external_id, p.name, `"${p.title}"`, p.salary, p.employment_type, p.arm_length, p.specified_employee].join(","))];
  writeFileSync(path.join(dir, "payroll.csv"), csv.join("\n") + "\n");
  return { slug: f.slug, items: items.length, jira: by("jira").length, slack: by("slack").length, docs: by("doc").length };
}

if (process.argv[1]?.includes("generate-fixtures")) {
  for (const f of [lakeshore, bayfront]) console.log(writeFixture(f));
}
