import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type Anthropic from "@anthropic-ai/sdk";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { closeDb } from "@/lib/db/client";
import { claimNextJob, repo } from "@/lib/db/repo";
import { FixtureConnector } from "@/lib/connectors/fixture";
import { setProvider } from "@/lib/llm/client";
import { runJob, STAGES } from "@/lib/pipeline/run";
import { Builder } from "@/scripts/fixture-content/builder";
import { writeFixture } from "@/scripts/generate-fixtures";

process.env.SURREAL_URL = "mem://";
// Signed-in owner of org_e2e, for rendering the app pages server-side.
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: "user_test", orgId: "org_e2e", orgRole: "org:admin" }) }));
vi.mock("@clerk/nextjs", () => ({ OrganizationProfile: () => null, CreateOrganization: () => null, OrganizationSwitcher: () => null, UserButton: () => null }));
process.env.MODEL_FAST = "fake-fast";
process.env.MODEL_MAIN = "fake-main";

// 20-item mini company: one R&D epic, one routine epic, noise.
function mini() {
  const b = new Builder("mini.example", { rd: "C1", general: "C2" });
  b.epic("MN-1", "Sub-10 ms inference on microcontroller", "ada", "2026-02-01 10:00", "Unknown whether the model fits in 256 KB SRAM at 10 ms. Hypothesis: 4-bit weights.");
  b.issue("MN-2", "MN-1", "Experiment: 8-bit weights", "ada", "2026-02-05 10:00", "Hypothesis: 8-bit is enough.");
  b.comment("MN-2", "ada", "2026-02-20 10:00", "Result: failed, 31 ms and 410 KB, over budget.");
  b.issue("MN-3", "MN-1", "Experiment: 4-bit weights with lookup tables", "bo", "2026-03-01 10:00", "Hypothesis: 4-bit with LUT activations fits.");
  b.comment("MN-3", "bo", "2026-03-20 10:00", "Result: 9 ms and 240 KB, accuracy 96.1 versus 97.0 baseline.");
  b.doc("mn-log", "MN experiment log", "ada", "2026-03-21 10:00", "Experiment log. 8-bit failed at 31 ms. 4-bit LUT measured 9 ms, 240 KB.");
  b.msg("rd", "ada", "2026-02-20 11:00", "8-bit experiment failed, 31 ms. Trying 4-bit next.");
  b.msg("rd", "bo", "2026-03-20 11:00", "4-bit LUT result is 9 ms. Under budget.");
  b.epic("MN-10", "Migrate billing to Stripe", "cy", "2026-04-01 10:00", "Routine billing migration.");
  b.issue("MN-11", "MN-10", "Set up Stripe prices", "cy", "2026-04-02 10:00", "Routine setup per docs.", "task");
  b.comment("MN-11", "cy", "2026-04-10 10:00", "Done per docs.");
  b.issue("MN-12", "MN-10", "Migrate customers", "cy", "2026-04-12 10:00", "Routine migration.", "task");
  for (let i = 0; i < 8; i++) b.msg("general", "cy", `2026-05-${10 + i} 10:00`, `Office note ${i}: lunch on Friday.`);
  return b;
}

const text = (req: Anthropic.MessageCreateParamsNonStreaming) => {
  const c = req.messages[0].content;
  return typeof c === "string" ? c : JSON.stringify(c);
};
const items = (t: string) => [...t.matchAll(/<source_item id="([^"]+)"[^>]*>\n([\s\S]*?)\n<\/source_item>/g)].map((m) => ({ id: m[1], body: m[2] }));
const reply = (name: string, input: unknown): Anthropic.Message => ({
  id: "msg", type: "message", role: "assistant", model: "fake", stop_reason: "tool_use", stop_sequence: null,
  content: [{ type: "tool_use", id: "tu", name, input } as Anthropic.ToolUseBlock],
  usage: { input_tokens: 10, output_tokens: 5 } as Anthropic.Usage,
} as Anthropic.Message);

// Deterministic stand-in for the model, keyed on the forced tool.
const fake = async (req: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message> => {
  let tool = (req.tool_choice as { name?: string }).name!;
  const t = text(req);
  // Agent loop: one read-only lookup first, then submit.
  if (req.tool_choice?.type === "any") {
    if (req.messages.length === 1) return reply("get_jira_issue", { key: "MN-12" });
    tool = "submit_assessment";
  }
  if (tool === "submit_tags") return reply(tool, { items: items(t).map((i) => {
    const relevant = /hypothesis|result|experiment|ms|routine|migrat|stripe/i.test(i.body);
    return { id: i.id, relevant, tags: /failed/i.test(i.body) ? ["failure", "experiment"] : /result/i.test(i.body) ? ["result"] : ["routine"],
      excerpt: i.id === "MN-11" ? "a paraphrase that is not in the body" : relevant ? i.body.slice(0, 60) : "", confidence: 0.9 };
  }) });
  if (tool === "submit_assignments") {
    const rd = t.match(/- (project:\S+): Sub-10/)![1];
    return reply(tool, { assignments: items(t).map((i) => ({ evidence_id: i.id, project_id: /ms|LUT|bit/.test(i.body) ? rd : "none" })) });
  }
  if (tool === "submit_assessment") {
    const ids = items(t).map((i) => i.id);
    const routine = /billing/i.test(t);
    const s = (score: number) => ({ score, rationale: "Fake rationale.", evidence_ids: ids.slice(0, 2) });
    return reply(tool, { uncertainty: s(routine ? 0 : 2), hypothesis: s(routine ? 0 : 2), systematic: s(routine ? 0 : 2), advancement: s(routine ? 0 : 1), records: s(routine ? 1 : 2), exclusions_hit: [], summary: "Fake summary." });
  }
  if (tool === "submit_section") {
    const ev = items(t).find((i) => i.id === "MN-3#c1")!;
    return reply(tool, { sentences: [
      { text: "The team measured 9 ms and 240 KB.", evidence_ids: [ev.id] },
      { text: "An earlier attempt failed at 31 ms.", evidence_ids: ["MN-2#c1"] },
      { text: "Latency improved by 999 percent.", evidence_ids: [ev.id] },
    ] });
  }
  if (tool === "submit_flags") return reply(tool, { flags: [{ severity: "medium", kind: "thin_records", target: "Line 246", message: "Few results.", fix: "Add MN-3 results.", evidence_ids: ["MN-3#c1", "NOT-REAL"] }] });
  throw new Error(`unexpected tool ${tool}`);
};

let root: string;
beforeAll(() => {
  setProvider(fake);
  root = mkdtempSync(path.join(tmpdir(), "sred-mini-"));
  writeFixture({
    slug: "mini", people: [
      { external_id: "ada", name: "Ada", title: "ML", salary: 100000, employment_type: "employee", arm_length: true, specified_employee: false },
      { external_id: "bo", name: "Bo", title: "ML", salary: 90000, employment_type: "contractor", arm_length: true, specified_employee: false },
      { external_id: "cy", name: "Cy", title: "Dev", salary: 80000, employment_type: "employee", arm_length: true, specified_employee: false },
    ],
    company: { name: "Mini Inc.", industry: "x", city: "x", size: 3, fiscal_year_end: "12-31", description: "x" },
    build: mini,
  }, root);
});
afterAll(async () => { setProvider(null); await closeDb(); });

describe("analyze_tax_year end to end (mocked model)", () => {
  it("runs every stage and produces checked, cited drafts", async () => {
    const r = repo("org_e2e");
    const company = await r.create("company", { name: "Mini Inc.", slug: "mini", synthetic: true });
    const ty = await r.create("tax_year", { company: company.id, year: 2026, start: "2026-01-01T00:00:00.000Z", end: "2026-12-31T23:59:59.999Z", status: "draft" });
    await r.create("job", { kind: "analyze_tax_year", payload: { tax_year: ty.id }, status: "queued", created_at: new Date().toISOString(), progress: {} });
    const job = (await claimNextJob())!;
    await runJob(job, new FixtureConnector("mini", root));

    const done = await r.get(job.id);
    expect(done?.status).toBe("done");
    expect(Object.keys(done?.progress as object).sort()).toEqual([...STAGES].sort());
    expect(await r.count("source_item", { tax_year: ty.id })).toBe(20);

    // The paraphrased excerpt was dropped, never stored.
    expect(await r.count("evidence", { external_id: "MN-11" })).toBe(0);

    const projects = await r.list("project", { tax_year: ty.id });
    const rd = projects.find((p) => (p.title as string).startsWith("Sub-10"))!;
    const billing = projects.find((p) => (p.title as string).includes("billing"))!;
    expect(rd.status).toBe("eligible");
    expect(["not_eligible", "insufficient_evidence"]).toContain(billing.status);

    // Slack and doc evidence assigned by the model to the R&D project.
    expect(await r.count("evidence", { project: rd.id, kind: "slack_message" })).toBe(2);

    const sections = await r.list("claim_section", { project: rd.id, head: true });
    expect(sections.map((s) => s.line).sort()).toEqual(["242", "244", "246"]);
    const sentences = sections.flatMap((s) => s.sentences as { text: string; supported: boolean; reasons: string[] }[]);
    expect(sentences.find((s) => s.text.includes("9 ms"))?.supported).toBe(true);
    expect(sentences.find((s) => s.text.includes("999"))?.reasons).toContain("number_not_in_evidence:999");
    expect(await r.count("cites")).toBeGreaterThan(0);

    const lines = await r.list("expenditure_line", { tax_year: ty.id });
    expect(lines.find((l) => l.person === "bo")?.category).toBe("contract");

    const flags = await r.list("risk_flag", { project: rd.id });
    expect(flags.some((f) => f.source === "model" && !(f.evidence_ids as string[]).includes("NOT-REAL"))).toBe(true);

    expect(await r.count("model_run")).toBeGreaterThan(5);
    expect(await repo("org_other").count("project")).toBe(0);
  });

  it("keeps overrides and version history when the analysis runs again", async () => {
    const r = repo("org_e2e");
    const [ty] = await r.list("tax_year", {});
    const [line] = await r.list("expenditure_line", { person: "bo" });
    await r.update(line.id, { time_share_override: 0.5 });
    const before = await r.count("claim_section", { tax_year: ty.id });
    await r.create("job", { kind: "analyze_tax_year", payload: { tax_year: ty.id }, status: "queued", created_at: new Date().toISOString(), progress: {} });
    await runJob((await claimNextJob())!, new FixtureConnector("mini", root));

    const [again] = await r.list("expenditure_line", { person: "bo" });
    expect(again.time_share_override).toBe(0.5);
    expect(await r.count("claim_section", { tax_year: ty.id })).toBe(before * 2);
    expect(await r.count("claim_section", { tax_year: ty.id, head: true })).toBe(before);
  });

  it("renders every signed-in page from the pipeline output", async () => {
    const r = repo("org_e2e");
    const [rd] = (await r.list("project", {})).filter((p) => (p.title as string).startsWith("Sub-10"));
    const id = encodeURIComponent(rd.id);
    const pages: [string, () => Promise<React.ReactElement>][] = [
      ["sources", async () => (await import("@/app/(app)/sources/page")).default()],
      ["analyze", async () => (await import("@/app/(app)/analyze/page")).default()],
      ["projects", async () => (await import("@/app/(app)/projects/page")).default()],
      ...(["criteria", "narrative", "risks"] as const).map((tab): [string, () => Promise<React.ReactElement>] =>
        [`project ${tab}`, async () => (await import("@/app/(app)/projects/[id]/page")).default({ params: Promise.resolve({ id }), searchParams: Promise.resolve({ tab }) })]),
      ["edit", async () => (await import("@/app/(app)/projects/[id]/edit/page")).default({ params: Promise.resolve({ id }) })],
      ["expenditures", async () => (await import("@/app/(app)/expenditures/page")).default()],
      ["evaluation", async () => (await import("@/app/(app)/evaluation/page")).default()],
      ["audit", async () => (await import("@/app/(app)/audit/page")).default({ searchParams: Promise.resolve({}) })],
      ["settings", async () => (await import("@/app/(app)/settings/page")).default()],
    ];
    const html: Record<string, string> = {};
    for (const [name, render] of pages) html[name] = renderToString(await render());
    // DUMP_HTML=<dir> writes each page for visual review (scripts/preview-pages.mjs)
    if (process.env.DUMP_HTML) {
      const { writeFileSync, mkdirSync } = await import("node:fs");
      mkdirSync(process.env.DUMP_HTML, { recursive: true });
      for (const [name, h] of Object.entries(html)) writeFileSync(path.join(process.env.DUMP_HTML, `${name.replace(" ", "-")}.html`), h);
    }
    expect(html["project narrative"]).toContain("9 ms");
    expect(html["project narrative"]).toContain("is not in the cited evidence");
    expect(html["expenditures"]).toContain("CRA expects time records");
    expect(html["projects"]).toContain("Eligible");
  });
});
