import type { CriterionKey } from "@/lib/sred/rules";

export type Scores = Record<CriterionKey, 0 | 1 | 2>;
export type Decision = "eligible" | "borderline" | "not_eligible";

// Conservative decision rule (PLAN 8.4). Thresholds live in code, never in a prompt.
export function decide(s: Scores, exclusionsHit: string[]): { decision: Decision; reason: string } {
  if (exclusionsHit.length) return { decision: "not_eligible", reason: `Excluded work: ${exclusionsHit.join(", ")}` };
  const total = s.uncertainty + s.hypothesis + s.systematic + s.advancement + s.records;
  if (s.uncertainty === 2 && s.advancement >= 1 && s.systematic >= 1 && s.records >= 1)
    return { decision: "eligible", reason: "Clear uncertainty with systematic work, records and an advancement goal" };
  if (s.uncertainty >= 1 && total >= 6)
    return { decision: "borderline", reason: `Some uncertainty but incomplete evidence (total ${total}/10). Needs a human decision.` };
  if (s.uncertainty === 0) return { decision: "not_eligible", reason: "No evidence of a technological uncertainty" };
  return { decision: "not_eligible", reason: `Evidence too weak across criteria (total ${total}/10)` };
}
