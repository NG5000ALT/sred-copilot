// Runs the full pipeline on a demo company from the command line, without the web app or Clerk,
// and prints the per-project result and evaluation. Uses real Claude calls (ANTHROPIC_API_KEY).
// Usage: pnpm analyze:cli lakeshore-vision   (data goes to org "cli-dev" in SURREAL_URL)
import { repo } from "@/lib/db/repo";
import { closeDb } from "@/lib/db/client";
import { runJob } from "@/lib/pipeline/run";
import { loadAnswerKey } from "@/lib/pipeline/stages";

const slug = process.argv[2] ?? "lakeshore-vision";
const year = Number(process.argv[3] ?? 2026);
const r = repo("cli-dev");

let [company] = await r.list("company", { slug });
company ??= await r.create("company", { name: slug, slug, synthetic: true, created_at: new Date().toISOString() });
let [ty] = await r.list("tax_year", { company: company.id, year });
ty ??= await r.create("tax_year", { company: company.id, year, start: `${year}-01-01T00:00:00.000Z`, end: `${year}-12-31T23:59:59.999Z`, status: "draft" });

const job = await r.create("job", { kind: "analyze_tax_year", payload: { tax_year: ty.id }, status: "running", progress: {}, created_at: new Date().toISOString() });
const t0 = Date.now();
await runJob(job);
const done = await r.get(job.id);
console.log(JSON.stringify(done?.progress, null, 2));

const key = loadAnswerKey(slug);
for (const p of await r.list("project", { tax_year: ty.id })) {
  const expected = key?.projects.find((k) => k.jiraEpicKeys.some((e) => (p.seed_epics as string[]).includes(e)));
  console.log(`${expected?.code ?? "--"}  ${String(p.status).padEnd(22)} expected ${String(expected?.expected ?? "n/a").padEnd(13)} ${p.title}`);
}
const runs = await r.list("model_run", { tax_year: ty.id });
console.log(`${runs.length} model calls, ${runs.reduce((a, x) => a + (x.tokens_in as number) + (x.tokens_out as number), 0)} tokens, ${Math.round((Date.now() - t0) / 1000)} s`);
await closeDb();
