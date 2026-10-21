import Link from "next/link";
import { LinkButton } from "@/components/ui";

const SPECIMEN = [
  { text: "Post-training INT8 quantization met the latency target at 41 ms but reduced accuracy to 84.1 mAP, and to 58.3 mAP on defects under 8 px.", cite: "LV-118#c1" },
  { text: "Published quantization results covered image classification, not small-object detection on CPU-only ARM boards, so the team could not predict the accuracy loss in advance.", cite: "slack:C02" },
];

export default function Landing() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 md:px-6 md:py-20">
      <p className="font-serif text-xl font-semibold">SR&amp;ED Copilot</p>

      <section className="mt-14 grid gap-12 md:grid-cols-[1.1fr_1fr] md:items-start">
        <div>
          <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            Draft your SR&amp;ED claim from the records you already keep.
          </h1>
          <p className="mt-6 max-w-prose text-lg leading-relaxed">
            A 20-person startup with a $200,000 claim pays a consultant about $40,000 at a 20% contingency fee.
            SR&amp;ED Copilot reads your Jira, Slack and lab notes, finds the projects that qualify, and drafts
            T661 lines 242, 244 and 246 with every sentence linked to its source.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <LinkButton href="/onboarding">Try the demo company</LinkButton>
            <Link href="/sign-in" className="text-accent underline-offset-4 hover:underline">Sign in</Link>
          </div>
          <p className="mt-4 text-sm text-meta">The demo uses fictional companies. Nothing is ever filed for you; your CPA reviews the draft.</p>
        </div>

        <figure className="rounded-lg border border-rule bg-paper p-5 md:mt-2">
          <figcaption className="mb-4 flex items-baseline justify-between text-sm text-meta">
            <span>Form T661, line 242</span>
            <span>{SPECIMEN.map((x) => x.text).join(" ").split(/\s+/).length} / 350 words</span>
          </figcaption>
          <div className="grid grid-cols-[3rem_1fr] gap-x-3">
            <span className="font-serif text-2xl text-accent">242</span>
            <p className="font-serif text-[1.05rem] leading-[1.7]">
              {SPECIMEN.map((s, i) => (
                <span key={s.cite}>
                  {s.text}
                  <sup className="ml-0.5 rounded bg-accent-wash px-1 font-sans text-[0.7rem] font-medium text-accent" title={s.cite}>{i + 1}</sup>{" "}
                </span>
              ))}
            </p>
          </div>
        </figure>
      </section>

      <section className="mt-20 max-w-3xl">
        <h2 className="font-serif text-2xl font-semibold">What a reviewer can rely on</h2>
        <dl className="mt-6 divide-y divide-rule border-y border-rule">
          {[
            ["Every sentence cites evidence", "A checker rejects sentences without a source, numbers that are not in the cited record, and words over the CRA limit. Failures stay visible in red."],
            ["Conservative by default", "Eligibility thresholds live in code, not in a prompt. Borderline work waits for a person to accept it."],
            ["Read-only and auditable", "Connectors can only read. Every model call is logged, every edit is a new version, and a frozen claim shows what was known when it was drafted."],
          ].map(([term, detail]) => (
            <div key={term} className="grid gap-1 py-5 md:grid-cols-[15rem_1fr] md:gap-6">
              <dt className="font-semibold">{term}</dt>
              <dd className="max-w-prose leading-relaxed">{detail}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
