import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/roles";
import { latestJob, workspace } from "@/lib/data";

// Job status for the Analyze page (polled every 2 s). Enqueueing goes through the startAnalysis action.
export async function GET() {
  try {
    const s = await requirePermission("read", { redirectOnMissingOrg: false });
    const { taxYear } = await workspace(s.repo);
    if (!taxYear) return NextResponse.json({ job: null });
    const job = await latestJob(s.repo, taxYear.id);
    return NextResponse.json({ job: job && { id: job.id, status: job.status, stage: job.stage, progress: job.progress, error: job.error ?? null } });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error).message) }, { status: 403 });
  }
}
