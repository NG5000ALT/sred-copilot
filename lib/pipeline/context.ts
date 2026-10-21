import type { Repo, Row } from "@/lib/db/repo";
import type { SourceConnector } from "@/lib/connectors/types";
import type { EvidenceForPrompt } from "@/lib/llm/prompts/types";

export type Company = Row & { name: string; slug: string };
export type TaxYear = Row & { year: number; start: string; end: string; status: "draft" | "frozen"; company: string };
export type SourceItemRow = Row & {
  tax_year: string; external_id: string; kind: string; url: string; author: string | null; created_at: string;
  title?: string; body: string; epic_key?: string | null; issue_type?: string; assignee?: string | null; parent?: string | null; channel?: string;
};
export type EvidenceRow = Row & {
  tax_year: string; source_item: string; external_id: string; kind: string; project: string | null;
  excerpt: string; tags: string[]; confidence: number; author: string | null; created_at: string; title?: string; url: string; epic_key?: string | null;
};
export type ProjectRow = Row & {
  tax_year: string; title: string; summary: string; seed_epics: string[];
  status: "candidate" | "eligible" | "borderline" | "not_eligible" | "insufficient_evidence";
  reason?: string; user_decision?: "accepted" | "rejected" | null;
};
export type Sentence = { text: string; evidence_ids: string[]; supported: boolean; reasons: string[] };
export type ClaimSectionRow = Row & {
  tax_year: string; project: string; line: "242" | "244" | "246"; version: number; text: string; sentences: Sentence[];
  word_count: number; over_limit: boolean; author: "model" | "user"; created_at: string; head: boolean;
};

export type Ctx = {
  repo: Repo;
  connector: SourceConnector;
  company: Company;
  taxYear: TaxYear;
  progress: (stage: string, counts: Record<string, number>) => Promise<void>;
};

export const toPrompt = (e: EvidenceRow): EvidenceForPrompt => ({
  id: e.external_id, kind: e.kind, date: e.created_at.slice(0, 10), author: e.author, tags: e.tags ?? [], excerpt: e.excerpt, title: e.title,
});

export async function projectEvidence(ctx: Ctx, projectId: string) {
  return ctx.repo.list<EvidenceRow>("evidence", { tax_year: ctx.taxYear.id, project: projectId }, { orderBy: "created_at" });
}

export async function mapLimit<T, R>(xs: T[], limit: number, fn: (x: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(xs.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, xs.length) }, async () => {
    while (next < xs.length) {
      const i = next++;
      out[i] = await fn(xs[i], i);
    }
  }));
  return out;
}

export const chunk = <T,>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
