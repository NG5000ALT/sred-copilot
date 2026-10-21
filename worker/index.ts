import { claimNextJob, failInterruptedJobs, repo } from "@/lib/db/repo";
import { runJob } from "@/lib/pipeline/run";

const POLL_MS = 2000;
let running = false;
let recovered = false;

export async function tick() {
  const job = await claimNextJob();
  if (!job) return false;
  console.log(`[worker] ${job.kind} ${job.id} (${job.org})`);
  try {
    await runJob(job);
    console.log(`[worker] done ${job.id}`);
  } catch (e) {
    console.error(`[worker] failed ${job.id}`, e);
    await repo(job.org).update(job.id, { status: "failed", error: String((e as Error).message ?? e), updated_at: new Date().toISOString() });
  }
  return true;
}

export function startWorker() {
  if (running) return;
  running = true;
  const loop = async () => {
    try {
      if (!recovered) {
        const n = await failInterruptedJobs();
        if (n) console.log(`[worker] marked ${n} interrupted job(s) failed`);
        recovered = true;
      }
      while (await tick());
    } catch (e) {
      console.error("[worker] poll error", e);
    }
    setTimeout(loop, POLL_MS);
  };
  void loop();
  console.log("[worker] polling job table");
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("worker/index.ts")) startWorker();
