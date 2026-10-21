import { redirect } from "next/navigation";
import { can, requirePermission } from "@/lib/auth/roles";
import { latestJob, workspace } from "@/lib/data";
import { Button, PageHeader } from "@/components/ui";
import { Stepper } from "@/components/stepper";
import { startAnalysis } from "../actions";

export default async function Analyze() {
  const s = await requirePermission("read");
  const { company, taxYear } = await workspace(s.repo);
  if (!company || !taxYear) redirect("/onboarding");
  const job = await latestJob(s.repo, taxYear.id);
  const busy = job?.status === "queued" || job?.status === "running";

  return (
    <>
      <PageHeader title={`Analyze ${taxYear.year}`}>
        {can(s.role, "analyze") && taxYear.status !== "frozen" && (
          <form action={startAnalysis}>
            <Button type="submit" disabled={busy}>{busy ? "Analysis running" : job ? `Analyze ${taxYear.year} again` : `Analyze ${taxYear.year}`}</Button>
          </form>
        )}
      </PageHeader>
      <p className="mb-8 max-w-prose">
        Reads every record from {company.name} for the tax year, finds candidate projects, scores them against
        the SR&amp;ED criteria and drafts lines 242, 244 and 246 for the ones that qualify. Running it again replaces
        this year&apos;s results; time-share overrides are kept.
      </p>
      {taxYear.status === "frozen" && <p className="mb-6 rounded-md bg-wash p-3">This claim is frozen, so it cannot be analyzed again.</p>}
      <Stepper initial={job ? { status: job.status as string, stage: job.stage as string, progress: (job.progress ?? {}) as Record<string, Record<string, number>>, error: (job.error as string) ?? null } : null} />
    </>
  );
}
