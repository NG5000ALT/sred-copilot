"use client";

import { useState, useTransition } from "react";
import { uploadPayroll } from "@/app/(app)/actions";
import { Button } from "./ui";

export function PayrollUpload() {
  const [result, setResult] = useState<{ ok: boolean; errors: string[]; message?: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form className="mt-4 flex flex-wrap items-center gap-3" action={(fd) => start(async () => setResult(await uploadPayroll(fd)))}>
      <input type="file" name="file" accept=".csv,text/csv" required className="text-sm file:mr-3 file:rounded-md file:border file:border-rule file:bg-paper file:px-3 file:py-1.5" />
      <Button type="submit" variant="quiet" disabled={pending}>{pending ? "Checking file" : "Upload payroll"}</Button>
      {result && (
        <div role="status" className={`w-full text-sm ${result.ok ? "text-eligible" : "text-fail"}`}>
          {result.ok ? result.message : <ul className="list-disc pl-5">{result.errors.slice(0, 8).map((e) => <li key={e}>{e}</li>)}</ul>}
        </div>
      )}
    </form>
  );
}
