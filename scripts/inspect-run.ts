// Prints what the last CLI analysis decided per project: evidence, scores, rationale, exclusions,
// draft support and flags. Usage: pnpm inspect:cli lakeshore-vision
import { repo } from "@/lib/db/repo";
import { closeDb } from "@/lib/db/client";
import { CRITERIA } from "@/lib/sred/rules";

const slug = process.argv[2] ?? "lakeshore-vision";
const r = repo("cli-dev");
const [company] = await r.list("company", { slug });
const [ty] = await r.list("tax_year", { company: company.id }, { orderBy: "year", desc: true, limit: 1 });
const evidence = await r.list("evidence", { tax_year: ty.id });
console.log(`${evidence.length} evidence, ${evidence.filter((e) => !e.project).length} unassigned`);
for (const p of await r.list("project", { tax_year: ty.id })) {
  const ev = evidence.filter((e) => e.project === p.id);
  const [a] = await r.list("criteria_assessment", { project: p.id }, { orderBy: "version", desc: true, limit: 1 });
  const sections = await r.list("claim_section", { project: p.id, head: true });
  const sentences = sections.flatMap((s) => s.sentences as { supported: boolean; text: string; reasons: string[] }[]);
  console.log(`\n== ${p.title} [${p.status}] ${ev.length} evidence: ${ev.map((e) => e.external_id).join(" ")}`);
  console.log(`   reason: ${p.reason ?? ""}`);
  if (a) {
    for (const c of CRITERIA) console.log(`   ${c.key}: ${(a.scores as Record<string, number>)[c.key]}  ${(a.rationale as Record<string, string>)[c.key]}`);
    console.log(`   exclusions: ${(a.exclusions_hit as string[]).join("; ") || "none"}; lookups: ${(a.tool_calls as unknown[])?.length ?? 0}`);
  }
  if (sentences.length) {
    console.log(`   draft: ${sentences.filter((s) => s.supported).length}/${sentences.length} supported`);
    for (const s of sentences.filter((x) => !x.supported)) console.log(`     x ${s.text.slice(0, 90)} -> ${s.reasons.join(", ")}`);
  }
}
const [ev] = await r.list("eval_result", { tax_year: ty.id }, { orderBy: "created_at", desc: true, limit: 1 });
if (ev) console.log("\nmetrics", JSON.stringify(ev.metrics));
await closeDb();
