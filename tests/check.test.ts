import { describe, expect, it } from "vitest";
import { checkSection, type EvidenceRef } from "@/lib/pipeline/check";

const ty = { start: "2026-01-01", end: "2026-12-31", year: 2026 };
const ev = new Map<string, EvidenceRef>([
  ["e1", { id: "e1", project: "p1", created_at: "2026-03-01", excerpt: "INT8 quantization dropped mAP from 0.91 to 0.78 at 42 ms" }],
  ["e2", { id: "e2", project: "p2", created_at: "2026-03-01", excerpt: "other project" }],
  ["e3", { id: "e3", project: "p1", created_at: "2025-11-01", excerpt: "kickoff notes" }],
]);
const run = (line: "242" | "244" | "246", text: string, ids: string[]) =>
  checkSection({ line, sentences: [{ text, evidence_ids: ids }], projectId: "p1", evidence: ev, taxYear: ty });

describe("checkSection", () => {
  it("passes a cited sentence whose numbers are in evidence", () => {
    expect(run("242", "Quantization reduced mAP from 0.91 to 0.78.", ["e1"]).sentences[0].supported).toBe(true);
  });
  it("fails an uncited sentence", () => {
    expect(run("242", "The team faced uncertainty.", []).sentences[0].reasons).toContain("no_citation");
  });
  it("fails a foreign evidence id", () => {
    expect(run("242", "Text.", ["e2"]).sentences[0].reasons).toContain("foreign_evidence:e2");
  });
  it("fails an unknown evidence id", () => {
    expect(run("242", "Text.", ["nope"]).sentences[0].supported).toBe(false);
  });
  it("fails out-of-year evidence on line 244 only", () => {
    expect(run("244", "Work began.", ["e3"]).sentences[0].reasons).toContain("out_of_year:e3");
    expect(run("242", "Work began.", ["e3"]).sentences[0].supported).toBe(true);
  });
  it("fails a number not in cited evidence", () => {
    expect(run("246", "Latency fell to 31 ms.", ["e1"]).sentences[0].reasons).toContain("number_not_in_evidence:31");
  });
  it("treats digits inside identifiers as names, not numbers", () => {
    expect(run("242", "INT8 on a Cortex-A72 board kept FP32 layers at 42 ms.", ["e1"]).sentences[0].supported).toBe(true);
    expect(run("242", "The BRT-7 assay per SOP-021 ran at 42 ms.", ["e1"]).sentences[0].supported).toBe(true);
    expect(run("242", "Drying at -31 C failed.", ["e1"]).sentences[0].reasons).toContain("number_not_in_evidence:31");
    expect(run("242", "In run 1 and lot 2619 latency was 42 ms.", ["e1"]).sentences[0].supported).toBe(true);
  });
  it("accepts numbers from the cited record's title", () => {
    const withTitle = new Map(ev);
    withTitle.set("e4", { id: "e4", project: "p1", created_at: "2026-03-01", excerpt: "Pilot failed.", title: "Move from 96-well to 384-well" });
    const r = checkSection({ line: "242", projectId: "p1", evidence: withTitle, taxYear: ty, sentences: [{ text: "Scaling 96-well to 384-well failed.", evidence_ids: ["e4"] }] });
    expect(r.sentences[0].supported).toBe(true);
  });
  it("allows the tax year", () => {
    expect(run("244", "In 2026 the team measured 42 ms.", ["e1"]).sentences[0].supported).toBe(true);
  });
  it("flags banned phrases", () => {
    expect(run("246", "A revolutionary result.", ["e1"]).sentences[0].reasons).toContain("banned_phrase:revolutionary");
  });
  it("enforces the word limit", () => {
    const long = Array(351).fill("word").join(" ");
    expect(run("242", long, ["e1"]).over_limit).toBe(true);
    expect(run("244", long, ["e1"]).over_limit).toBe(false);
  });
  it("reports fail rate", () => {
    const r = checkSection({
      line: "242", projectId: "p1", evidence: ev, taxYear: ty,
      sentences: [{ text: "ok", evidence_ids: ["e1"] }, { text: "bad", evidence_ids: [] }],
    });
    expect(r.fail_rate).toBe(0.5);
  });
});
