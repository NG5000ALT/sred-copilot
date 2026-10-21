import { BANNED_PHRASES, LINE_LIMITS, type Line } from "@/lib/sred/rules";

export type DraftSentence = { text: string; evidence_ids: string[] };
export type CheckedSentence = DraftSentence & { supported: boolean; reasons: string[] };
export type EvidenceRef = { id: string; project: string | null; created_at: string; excerpt: string; title?: string | null };

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

// Digits inside identifiers (Cortex-A72, FP32, INT8, BRT-7, SOP-021) and labels ("run 3", "lot 2619")
// are names, not quantities. A lone minus is kept, so "-29 C" still counts as 29.
const NUMBER = /(?<![A-Za-z0-9.])(?<![A-Za-z]-)(?<!\b(?:run|lot|experiment|exp|step|phase|round|trial|version|line)\s)\d[\d,]*(?:\.\d+)?(?![A-Za-z]*\d)/gi;
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
    // The cited record's title is part of the record (e.g. an epic named "96-well to 384-well").
    const citedNumbers = new Set(cited.flatMap((e) => [...numbersIn(`${e.title ?? ""} ${e.excerpt}`)]));
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

// Plain-language wording of a checker reason, for the UI and the export.
export function describeReason(r: string): string {
  const [code, arg] = r.split(/:(.*)/s);
  switch (code) {
    case "no_citation": return "cites no evidence";
    case "unknown_evidence": return `cites ${arg}, which is not in the evidence`;
    case "foreign_evidence": return `cites ${arg} from another project`;
    case "out_of_year": return `cites ${arg} from outside the tax year`;
    case "number_not_in_evidence": return `the number ${arg} is not in the cited evidence`;
    case "banned_phrase": return `uses the overstated phrase "${arg}"`;
    default: return r;
  }
}
