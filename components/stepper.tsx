"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Job = { status: string; stage: string; progress: Record<string, Record<string, number>>; error: string | null };

const STAGES: { key: string; label: string; describe: (c: Record<string, number>) => string }[] = [
  { key: "ingest", label: "Ingest", describe: (c) => `${c.items} items read, ${c.people} people` },
  { key: "tag", label: "Tag", describe: (c) => `${c.evidence} evidence excerpts${c.dropped_excerpts ? `, ${c.dropped_excerpts} inexact excerpts dropped` : ""}` },
  { key: "cluster", label: "Cluster", describe: (c) => `${c.projects} candidate projects${c.insufficient ? `, ${c.insufficient} with too little evidence` : ""}` },
  { key: "classify", label: "Classify", describe: (c) => `${c.eligible} eligible, ${c.borderline} borderline, ${c.not_eligible} not eligible` },
  { key: "draft", label: "Draft", describe: (c) => `${c.drafted} projects drafted` },
  { key: "check", label: "Check", describe: (c) => `${c.sentences - c.unsupported} of ${c.sentences} sentences supported` },
  { key: "expenditures", label: "Expenditures", describe: (c) => `${c.lines} expenditure lines` },
  { key: "risk", label: "Risk", describe: (c) => `${c.flags} risk flags` },
  { key: "evaluate", label: "Evaluate", describe: (c) => (c.skipped ? "No answer key for this company" : `Precision ${Math.round(c.precision * 100)}%, recall ${Math.round(c.recall * 100)}%`) },
];

export function Stepper({ initial }: { initial: Job | null }) {
  const [job, setJob] = useState(initial);
  const active = job?.status === "queued" || job?.status === "running";

  useEffect(() => {
    if (!active) return;
    const t = setInterval(async () => {
      const r = await fetch("/api/jobs", { cache: "no-store" });
      if (r.ok) setJob((await r.json()).job);
    }, 2000);
    return () => clearInterval(t);
  }, [active]);

  if (!job) return <p className="text-meta">No analysis has run yet.</p>;
  const current = STAGES.findIndex((s) => s.key === job.stage);

  return (
    <div>
      <ol className="space-y-1" aria-live="polite">
        {STAGES.map((s, i) => {
          const counts = job.progress?.[s.key];
          const state = counts ? "done" : job.status === "running" && i === current ? "running" : job.status === "failed" && i === current ? "failed" : "waiting";
          return (
            <li key={s.key} className="grid grid-cols-[1.5rem_8rem_1fr] items-baseline gap-3 border-b border-rule/60 py-3">
              <span aria-hidden className={{ done: "text-eligible", running: "text-accent", failed: "text-fail", waiting: "text-rule" }[state]}>
                {{ done: "●", running: "◐", failed: "✕", waiting: "○" }[state]}
              </span>
              <span className={state === "waiting" ? "text-meta" : "font-medium"}>{s.label}</span>
              <span className={state === "failed" ? "text-fail" : ""}>
                {counts ? s.describe(counts) : state === "running" ? "Working" : state === "failed" ? job.error : ""}
              </span>
            </li>
          );
        })}
      </ol>
      {job.status === "done" && <p className="mt-6"><Link href="/projects" className="font-medium text-accent underline underline-offset-4">Review candidate projects</Link></p>}
      {job.status === "failed" && <p className="mt-6 text-fail">Analysis stopped: {job.error}. Fix the cause and run it again.</p>}
    </div>
  );
}
