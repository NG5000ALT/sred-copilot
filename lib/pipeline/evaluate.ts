import { z } from "zod";

export const AnswerKey = z.object({
  company: z.string(),
  taxYear: z.number(),
  writtenBefore: z.string().optional(),
  projects: z.array(z.object({
    code: z.string(),
    title: z.string(),
    jiraEpicKeys: z.array(z.string()),
    expected: z.enum(["eligible", "borderline", "not_eligible"]),
    members: z.array(z.string()),
    keySourceIds: z.array(z.string()),
  })),
});
export type AnswerKey = z.infer<typeof AnswerKey>;

export type Predicted = {
  id: string;
  title: string;
  epics: string[];
  status: "eligible" | "borderline" | "not_eligible" | "insufficient_evidence";
  members: string[];
  citedSourceIds: string[];
  sentences: { total: number; supported: number };
};

const CLASSES = ["eligible", "borderline", "not_eligible"] as const;
type Cls = (typeof CLASSES)[number];

const tokens = (s: string) => new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2));
export function jaccard<T>(a: Set<T>, b: Set<T>) {
  if (!a.size && !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}
const ratio = (n: number, d: number) => (d ? n / d : null);

export function evaluate(key: AnswerKey, predicted: Predicted[]) {
  const used = new Set<string>();
  const pairs = key.projects.map((k) => {
    let best: { p: Predicted; score: number } | null = null;
    for (const p of predicted) {
      if (used.has(p.id)) continue;
      const score = jaccard(new Set(k.jiraEpicKeys), new Set(p.epics)) + 0.01 * jaccard(tokens(k.title), tokens(p.title));
      if (score > 0.005 && (!best || score > best.score)) best = { p, score };
    }
    if (best) used.add(best.p.id);
    return { key: k, pred: best?.p ?? null };
  });
  const toCls = (p: Predicted | null): Cls | "missing" =>
    !p ? "missing" : p.status === "insufficient_evidence" ? "not_eligible" : p.status;

  const confusion: Record<Cls, Record<Cls | "missing", number>> = Object.fromEntries(
    CLASSES.map((c) => [c, { eligible: 0, borderline: 0, not_eligible: 0, missing: 0 }]),
  ) as never;
  let tp = 0, fp = 0, fn = 0;
  for (const { key: k, pred } of pairs) {
    const c = toCls(pred);
    confusion[k.expected][c]++;
    if (c === "eligible" && k.expected === "eligible") tp++;
    else if (c === "eligible") fp++;
    else if (k.expected === "eligible") fn++;
  }
  // predicted-eligible projects with no answer-key match are false positives
  fp += predicted.filter((p) => !used.has(p.id) && p.status === "eligible").length;

  let pTp = 0, pFp = 0, pFn = 0, keyHit = 0, keyTotal = 0;
  for (const { key: k, pred } of pairs) {
    const want = new Set(k.members);
    const got = new Set(pred?.members ?? []);
    for (const m of got) want.has(m) ? pTp++ : pFp++;
    for (const m of want) if (!got.has(m)) pFn++;
    if (pred && pred.sentences.total > 0) {
      const cited = new Set(pred.citedSourceIds);
      keyTotal += k.keySourceIds.length;
      keyHit += k.keySourceIds.filter((s) => cited.has(s)).length;
    }
  }
  const pp = ratio(pTp, pTp + pFp), pr = ratio(pTp, pTp + pFn);
  const sent = predicted.reduce((a, p) => ({ t: a.t + p.sentences.total, s: a.s + p.sentences.supported }), { t: 0, s: 0 });

  return {
    metrics: {
      eligibility_precision: ratio(tp, tp + fp),
      eligibility_recall: ratio(tp, tp + fn),
      people_f1: pp !== null && pr !== null && pp + pr > 0 ? (2 * pp * pr) / (pp + pr) : null,
      key_evidence_recall: ratio(keyHit, keyTotal),
      citation_support_rate: ratio(sent.s, sent.t),
      borderline_expected: key.projects.filter((k) => k.expected === "borderline").length,
      borderline_predicted: predicted.filter((p) => p.status === "borderline").length,
    },
    confusion,
    per_project: pairs.map(({ key: k, pred }) => ({
      code: k.code, title: k.title, expected: k.expected,
      predicted: toCls(pred), predicted_id: pred?.id ?? null, predicted_title: pred?.title ?? null,
    })),
  };
}
export type EvalOutput = ReturnType<typeof evaluate>;
