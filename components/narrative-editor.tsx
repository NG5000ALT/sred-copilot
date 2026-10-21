"use client";

import { useState, useTransition } from "react";
import { saveNarrative } from "@/app/(app)/actions";
import { Button } from "./ui";

type Sentence = { text: string; evidence_ids: string[] };
type History = { version: number; author: string; created_at: string; text: string; word_count: number };
type LineData = { line: "242" | "244" | "246"; sentences: Sentence[]; history: History[] };

function LineEditor({ projectId, data, evidenceIds }: { projectId: string; data: LineData; evidenceIds: { id: string; label: string }[] }) {
  const [sentences, setSentences] = useState<Sentence[]>(data.sentences.length ? data.sentences : [{ text: "", evidence_ids: [] }]);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const update = (i: number, s: Partial<Sentence>) => setSentences((xs) => xs.map((x, j) => (j === i ? { ...x, ...s } : x)));

  return (
    <section className="grid gap-x-4 border-b border-rule pb-10 md:grid-cols-[4rem_1fr]">
      <div className="font-serif text-3xl text-accent">{data.line}</div>
      <div>
        <ol className="space-y-4">
          {sentences.map((s, i) => (
            <li key={i} className="grid gap-2">
              <label className="sr-only" htmlFor={`s-${data.line}-${i}`}>Sentence {i + 1}</label>
              <textarea id={`s-${data.line}-${i}`} value={s.text} rows={2} onChange={(e) => update(i, { text: e.target.value })}
                className="w-full rounded-md border border-rule p-2 font-serif text-[1.05rem] leading-relaxed" />
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-meta">Cites</span>
                {s.evidence_ids.map((id) => (
                  <button key={id} type="button" onClick={() => update(i, { evidence_ids: s.evidence_ids.filter((x) => x !== id) })}
                    className="rounded bg-accent-wash px-1.5 text-accent hover:bg-fail-wash hover:text-fail" title="Remove citation">{id} ×</button>
                ))}
                <select aria-label="Add citation" value="" onChange={(e) => e.target.value && update(i, { evidence_ids: [...new Set([...s.evidence_ids, e.target.value])] })}
                  className="max-w-[16rem] rounded border border-rule px-1 py-0.5">
                  <option value="">Add citation</option>
                  {evidenceIds.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
                </select>
                <button type="button" onClick={() => setSentences((xs) => xs.filter((_, j) => j !== i))} className="ml-auto text-meta hover:text-fail">Remove sentence</button>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="button" variant="quiet" onClick={() => setSentences((xs) => [...xs, { text: "", evidence_ids: [] }])}>Add sentence</Button>
          <Button type="button" disabled={pending} onClick={() => start(async () => {
            try {
              const r = await saveNarrative({ project: projectId, line: data.line, sentences: sentences.filter((x) => x.text.trim()) });
              setStatus(`Saved version ${r.version}: ${r.word_count} words, ${r.unsupported} unsupported sentence(s).`);
            } catch (e) { setStatus(`Not saved: ${(e as Error).message}`); }
          })}>{pending ? "Saving" : `Save line ${data.line}`}</Button>
          {status && <span role="status" className="text-sm">{status}</span>}
        </div>
        {data.history.length > 0 && (
          <details className="mt-6">
            <summary className="cursor-pointer text-sm text-meta">Version history ({data.history.length})</summary>
            <ol className="mt-3 space-y-3">
              {data.history.map((h) => (
                <li key={h.version} className="border-l-2 border-rule pl-3 text-sm">
                  <p className="text-meta">v{h.version}, {h.author === "user" ? "edited by a person" : "model draft"}, {h.created_at.slice(0, 16).replace("T", " ")}, {h.word_count} words</p>
                  <p className="mt-1 font-serif">{h.text}</p>
                </li>
              ))}
            </ol>
          </details>
        )}
      </div>
    </section>
  );
}

export function NarrativeEditor({ projectId, lines, evidenceIds }: { projectId: string; lines: LineData[]; evidenceIds: { id: string; label: string }[] }) {
  return <div className="space-y-10">{lines.map((l) => <LineEditor key={l.line} projectId={projectId} data={l} evidenceIds={evidenceIds} />)}</div>;
}
