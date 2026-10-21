"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The claim workflow is a real sequence, so the steps are numbered.
const STEPS = [
  { href: "/sources", label: "Sources" },
  { href: "/analyze", label: "Analyze" },
  { href: "/projects", label: "Projects" },
  { href: "/expenditures", label: "Expenditures" },
  { href: "/evaluation", label: "Evaluation" },
  { href: "/audit", label: "Audit and freeze" },
];

export function Nav() {
  const path = usePathname();
  const item = (href: string, label: string, n?: number) => {
    const active = path === href || path.startsWith(href + "/");
    return (
      <li key={href}>
        <Link href={href} aria-current={active ? "page" : undefined}
          className={`flex gap-3 rounded-md px-2 py-1.5 ${active ? "bg-accent-wash font-medium text-accent" : "hover:bg-wash"}`}>
          {n !== undefined && <span className="w-4 text-right text-meta">{n}</span>}
          {label}
        </Link>
      </li>
    );
  };
  return (
    <nav className="mt-6" aria-label="Claim workflow">
      <ol className="flex flex-wrap gap-1 md:flex-col">{STEPS.map((s, i) => item(s.href, s.label, i + 1))}</ol>
      <ul className="mt-4 border-t border-rule pt-4">{item("/settings", "Settings")}</ul>
    </nav>
  );
}
