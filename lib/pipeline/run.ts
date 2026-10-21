import { repo as makeRepo, type Row } from "@/lib/db/repo";
import { getConnector } from "@/lib/connectors";
import type { SourceConnector } from "@/lib/connectors/types";
import { classify, classifyOne } from "./classify";
import { cluster } from "./cluster";
import type { Company, Ctx, ProjectRow, TaxYear } from "./context";
import { draft, draftProject } from "./draft";
import { ingest } from "./ingest";
import { evaluateStage, expenditures, risk } from "./stages";
import { tag } from "./tag";

export const STAGES = ["ingest", "tag", "cluster", "classify", "draft", "check", "expenditures", "risk", "evaluate"] as const;

async function context(job: Row, connector?: SourceConnector): Promise<Ctx> {
  const repo = makeRepo(job.org);
  const payload = job.payload as { tax_year: string; project?: string };
  const taxYear = await repo.get<TaxYear>(payload.tax_year);
  if (!taxYear) throw new Error("Tax year not found");
  const company = await repo.get<Company>(taxYear.company);
  if (!company) throw new Error("Company not found");
  const progress: Record<string, Record<string, number>> = { ...((job.progress as object) ?? {}) };
  return {
    repo, taxYear, company, connector: connector ?? getConnector(company.slug),
    progress: async (stage, counts) => {
      progress[stage] = counts;
      await repo.update(job.id, { stage, progress, updated_at: new Date().toISOString() });
    },
  };
}

export async function runJob(job: Row, connector?: SourceConnector) {
  const ctx = await context(job, connector);
  const set = (stage: string) => ctx.repo.update(job.id, { stage, updated_at: new Date().toISOString() });
  if (job.kind === "analyze_tax_year") {
    await set("ingest"); await ingest(ctx);
    await set("tag"); await tag(ctx);
    await set("cluster"); await cluster(ctx);
    await set("classify"); await classify(ctx);
    await set("draft"); const d = await draft(ctx);
    await ctx.progress("check", { sentences: d.sentences, unsupported: d.unsupported });
    await set("expenditures"); await expenditures(ctx);
    await set("risk"); await risk(ctx);
    await set("evaluate"); await evaluateStage(ctx);
  } else if (job.kind === "draft_project") {
    // A borderline project a human accepted: draft it, then refresh downstream numbers.
    const project = await ctx.repo.get<ProjectRow>((job.payload as { project: string }).project);
    if (!project) throw new Error("Project not found");
    await set("draft"); await draftProject(ctx, project);
    await set("expenditures"); await expenditures(ctx);
    await set("risk"); await risk(ctx);
    await set("evaluate"); await evaluateStage(ctx);
  } else if (job.kind === "reclassify_project") {
    const project = await ctx.repo.get<ProjectRow>((job.payload as { project: string }).project);
    if (!project) throw new Error("Project not found");
    await set("classify"); await classifyOne(ctx, project);
  } else {
    throw new Error(`Unknown job kind ${job.kind}`);
  }
  await ctx.repo.update(job.id, { status: "done", stage: "done", updated_at: new Date().toISOString() });
}
