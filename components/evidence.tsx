"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type EvidenceView = { id: string; kind: string; author: string | null; date: string; excerpt: string; title?: string | null; url: string; tags: string[] };

const KIND: Record<string, string> = { jira_issue: "Jira issue", jira_comment: "Jira comment", slack_message: "Slack message", doc_page: "Document", commit: "Commit" };
const Ctx = createContext<{ open: (id: string) => void; number: (id: string) => number | null }>({ open: () => {}, number: () => null });

export function EvidenceProvider({ evidence, children }: { evidence: EvidenceView[]; children: ReactNode }) {
  const map = new Map(evidence.map((e) => [e.id, e]));
  const numbers = new Map(evidence.map((e, i) => [e.id, i + 1]));
  const [openId, setOpenId] = useState<string | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (openId) ref.current?.showModal();
    else ref.current?.close();
  }, [openId]);
  const e = openId ? map.get(openId) : null;
  return (
    <Ctx.Provider value={{ open: setOpenId, number: (id) => numbers.get(id) ?? null }}>
      {children}
      <dialog ref={ref} onClose={() => setOpenId(null)} aria-labelledby="ev-title"
        className="ml-auto mr-0 h-full max-h-none w-full max-w-md bg-paper p-0 text-ink backdrop:bg-ink/20">
        {e ? (
          <div className="flex h-full flex-col p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-meta">Evidence {numbers.get(e.id)}: {KIND[e.kind] ?? e.kind}, {e.date}{e.author ? `, ${e.author}` : ""}</p>
                <h2 id="ev-title" className="mt-1 font-semibold">{e.title || e.id}</h2>
              </div>
              <button onClick={() => setOpenId(null)} className="rounded px-2 py-1 hover:bg-wash" aria-label="Close evidence">Close</button>
            </div>
            <blockquote className="mt-6 rounded-md bg-wash px-4 py-3 font-serif text-lg leading-relaxed">{e.excerpt}</blockquote>
            {e.tags.length > 0 && <p className="mt-4 text-sm text-meta">Tagged: {e.tags.join(", ")}</p>}
            <p className="mt-4 text-sm">Source id: <code>{e.id}</code></p>
            {e.url && <a href={e.url} target="_blank" rel="noreferrer" className="mt-auto pt-6 font-medium text-accent underline underline-offset-4">Open in source tool</a>}
          </div>
        ) : openId ? (
          <div className="p-6"><p>Evidence {openId} is not part of this project.</p><button onClick={() => setOpenId(null)} className="mt-4 underline">Close</button></div>
        ) : null}
      </dialog>
    </Ctx.Provider>
  );
}

// Numbered citation; the number is the evidence item's position in this project's list.
export function Chip({ id }: { id: string }) {
  const { open, number } = useContext(Ctx);
  const n = number(id);
  return (
    <button type="button" onClick={() => open(id)} title={n ? `Evidence ${n}: ${id}` : `${id} is not evidence for this project`}
      aria-label={n ? `Open evidence ${n}` : `Unknown evidence ${id}`}
      className={`ml-0.5 rounded px-1 align-super font-sans text-[0.7rem] font-medium leading-none ${n ? "bg-accent-wash text-accent hover:bg-accent hover:text-white" : "bg-fail-wash text-fail"}`}>
      {n ?? id}
    </button>
  );
}
