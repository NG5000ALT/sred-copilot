import { BANNED_PHRASES, LINE_LIMITS, type Line } from "@/lib/sred/rules";

export type DraftSentence = { text: string; evidence_ids: string[] };
export type CheckedSentence = DraftSentence & { supported: boolean; reasons: string[] };
export type EvidenceRef = { id: string; project: string | null; created_at: string; excerpt: string };

export type CheckInput = {
  line: Line;
  sentences: DraftSentence[];
  projectId: string;
  evidence: Map<string, EvidenceRef>;
  taxYear: { start: string; end: string; year: number };
};

export type CheckResult = {
  sentences: CheckedSentence[];
  word_count: number;
  over_limit: boolean;
  fail_rate: number;
};

const NUMBER = /\d[\d,]*(?:\.\d+)?/g;
const norm = (n: string) => n.replace(/,/g, "").replace(/\.0+$/, "");
export const numbersIn = (s: string) => new Set((s.match(NUMBER) ?? []).map(norm));
export const countWords = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

// Deterministic draft checker (PLAN 8.6). Never hides failures; it only marks them.
export function checkSection(input: CheckInput): CheckResult {
  const { line, projectId, evidence, taxYear } = input;
  const sentences = input.sentences.map((s): CheckedSentence => {
    const reasons: string[] = [];
    if (!s.evidence_ids.length) reasons.push("no_citation");
    const cited: EvidenceRef[] = [];
    for (const id of s.evidence_ids) {
      const ev = evidence.get(id);
      if (!ev) reasons.push(`unknown_evidence:${id}`);
      else if (ev.project !== projectId) reasons.push(`foreign_evidence:${id}`);
      else if (line === "244" && (ev.created_at < taxYear.start || ev.created_at > taxYear.end)) reasons.push(`out_of_year:${id}`);
      else cited.push(ev);
    }
    const citedNumbers = new Set(cited.flatMap((e) => [...numbersIn(e.excerpt)]));
    for (const n of numbersIn(s.text)) {
      if (n === String(taxYear.year)) continue; // naming the tax year is not a factual claim
      if (!citedNumbers.has(n)) reasons.push(`number_not_in_evidence:${n}`);
    }
    const lower = s.text.toLowerCase();
    for (const p of BANNED_PHRASES) if (lower.includes(p)) reasons.push(`banned_phrase:${p}`);
    return { ...s, supported: reasons.length === 0, reasons };
  });
  const word_count = countWords(sentences.map((s) => s.text).join(" "));
  const failed = sentences.filter((s) => !s.supported).length;
  return {
    sentences,
    word_count,
    over_limit: word_count > LINE_LIMITS[line].words,
    fail_rate: sentences.length ? failed / sentences.length : 0,
  };
}
