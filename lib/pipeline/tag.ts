import { runPrompt } from "@/lib/llm/client";
import { tagItems } from "@/lib/llm/prompts/tag_items";
import { chunk, mapLimit, type Ctx, type SourceItemRow } from "./context";
import { validExcerpt } from "./excerpt";

const BODY_LIMIT = 2000;

// Tag a batch of source items and create evidence rows for relevant ones with exact excerpts.
export async function tagBatch(ctx: Ctx, items: SourceItemRow[], project: string | null = null) {
  const out = await runPrompt(tagItems, {
    items: items.map((i) => ({ id: i.external_id, kind: i.kind, date: i.created_at.slice(0, 10), title: i.title ?? undefined, body: i.body.slice(0, BODY_LIMIT) })),
  }, { repo: ctx.repo, taxYear: ctx.taxYear.id, inputIds: items.map((i) => i.external_id) });
  const byId = new Map(items.map((i) => [i.external_id, i]));
  let dropped = 0;
  const rows = out.items.flatMap((t) => {
    const item = byId.get(t.id);
    if (!item || !t.relevant) return [];
    const excerpt = validExcerpt(t.excerpt, item.body);
    if (!excerpt) { dropped++; return []; }
    return [{
      tax_year: ctx.taxYear.id, source_item: item.id, external_id: item.external_id, kind: item.kind, project,
      excerpt, tags: t.tags, confidence: t.confidence, author: item.author, created_at: item.created_at,
      title: item.title ?? null, url: item.url, epic_key: item.epic_key ?? null,
    }];
  });
  await ctx.repo.createMany("evidence", rows);
  return { evidence: rows.length, dropped };
}

// Stage 2 (PLAN 8.2): cheap model, batches of 25.
export async function tag(ctx: Ctx) {
  const items = await ctx.repo.list<SourceItemRow>("source_item", { tax_year: ctx.taxYear.id }, { orderBy: "created_at" });
  const results = await mapLimit(chunk(items, 25), 3, (batch) => tagBatch(ctx, batch));
  const counts = {
    evidence: results.reduce((a, r) => a + r.evidence, 0),
    dropped_excerpts: results.reduce((a, r) => a + r.dropped, 0),
  };
  await ctx.progress("tag", counts);
  return counts;
}
