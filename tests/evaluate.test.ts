import { describe, expect, it } from "vitest";
import { evaluate, type AnswerKey, type Predicted } from "@/lib/pipeline/evaluate";

const key: AnswerKey = {
  company: "x", taxYear: 2026, projects: [
    { code: "A1", title: "Edge latency", jiraEpicKeys: ["E1"], expected: "eligible", members: ["a", "b"], keySourceIds: ["S1", "S2"] },
    { code: "A2", title: "Few shot", jiraEpicKeys: ["E2"], expected: "eligible", members: ["c"], keySourceIds: [] },
    { code: "A3", title: "Billing", jiraEpicKeys: ["E3"], expected: "not_eligible", members: ["d"], keySourceIds: [] },
  ],
};
const p = (id: string, epics: string[], status: Predicted["status"], members: string[], cited: string[] = [], sent = { total: 0, supported: 0 }): Predicted =>
  ({ id, title: id, epics, status, members, citedSourceIds: cited, sentences: sent });

describe("evaluate", () => {
  const r = evaluate(key, [
    p("p1", ["E1"], "eligible", ["a", "x"], ["S1"], { total: 10, supported: 9 }),
    p("p2", ["E2"], "borderline", ["c"]),
    p("p3", ["E3"], "eligible", ["d"]),
  ]);
  it("precision and recall on eligible", () => {
    expect(r.metrics.eligibility_precision).toBe(0.5);
    expect(r.metrics.eligibility_recall).toBe(0.5);
  });
  it("confusion matrix", () => {
    expect(r.confusion.eligible.eligible).toBe(1);
    expect(r.confusion.eligible.borderline).toBe(1);
    expect(r.confusion.not_eligible.eligible).toBe(1);
  });
  it("people F1, key evidence recall, citation support", () => {
    expect(r.metrics.people_f1).toBeCloseTo(0.75);
    expect(r.metrics.key_evidence_recall).toBe(0.5);
    expect(r.metrics.citation_support_rate).toBe(0.9);
  });
  it("marks an unmatched answer-key project as missing", () => {
    const r2 = evaluate(key, [p("p1", ["E1"], "eligible", [])]);
    expect(r2.per_project[1].predicted).toBe("missing");
    expect(r2.metrics.eligibility_recall).toBe(0.5);
  });
});
