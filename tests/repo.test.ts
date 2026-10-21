import { afterAll, describe, expect, it } from "vitest";
import { claimNextJob, repo } from "@/lib/db/repo";
import { closeDb } from "@/lib/db/client";

process.env.SURREAL_URL = "mem://";
afterAll(closeDb);

describe("repo", () => {
  it("throws without an orgId", () => {
    expect(() => repo("")).toThrow(/orgId/);
    expect(() => repo(undefined as unknown as string)).toThrow(/orgId/);
  });

  it("isolates orgs on list, get, update and count", async () => {
    const a = repo("org_a"), b = repo("org_b");
    const pa = await a.create("project", { title: "A secret", tax_year: "t1" });
    await b.create("project", { title: "B", tax_year: "t1" });
    expect(pa.id).toMatch(/^project:/);
    expect((await a.list("project")).map((p) => p.title)).toEqual(["A secret"]);
    expect(await b.get(pa.id)).toBeNull();
    expect(await b.update(pa.id, { title: "hacked" })).toBeNull();
    expect((await a.get(pa.id))?.title).toBe("A secret");
    expect(await b.count("project", { tax_year: "t1" })).toBe(1);
  });

  it("filters by fields and arrays", async () => {
    const r = repo("org_f");
    await r.createMany("evidence", [{ tags: ["failure"], kind: "slack_message" }, { kind: "jira_issue" }]);
    expect(await r.count("evidence", { kind: "jira_issue" })).toBe(1);
    expect(await r.count("evidence", { kind: ["jira_issue", "slack_message"] })).toBe(2);
    await expect(r.list("evidence", { "bad field": 1 })).rejects.toThrow();
  });

  it("relates only records in the same org", async () => {
    const a = repo("org_r"), b = repo("org_s");
    const ev = await a.create("evidence", { excerpt: "x" });
    const pa = await a.create("project", { title: "P" });
    const pb = await b.create("project", { title: "Q" });
    await a.relate(ev.id, "supports", pa.id, { assigned_by: "rule" });
    expect(await a.count("supports", { out: pa.id })).toBe(1);
    await expect(a.relate(ev.id, "supports", pb.id)).rejects.toThrow(/not found/);
  });

  it("deletes all org data and nothing else", async () => {
    const a = repo("org_d"), b = repo("org_e");
    await a.create("company", { name: "A" });
    await b.create("company", { name: "B" });
    await a.deleteAllOrgData();
    expect(await a.count("company")).toBe(0);
    expect(await b.count("company")).toBe(1);
  });

  it("claims a queued job exactly once", async () => {
    const r = repo("org_j");
    await r.create("job", { kind: "analyze_tax_year", status: "queued", created_at: new Date().toISOString() });
    const job = await claimNextJob();
    expect(job?.org).toBe("org_j");
    expect(job?.status).toBe("running");
    expect(await claimNextJob()).toBeNull();
  });
});
