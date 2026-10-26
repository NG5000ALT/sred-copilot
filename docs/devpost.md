# SR&ED Copilot

**Live app:** https://sred-copilot.onrender.com (sign up, create an organization, pick a demo company, click Analyze)
**Code:** https://github.com/NG5000ALT/sred-copilot

## Inspiration
Canadian startups claim SR&ED, the federal R&D tax credit, by writing a technical narrative (Form T661
lines 242, 244, 246) and a salary breakdown. Most hire a consultant on a 10% to 30% contingency fee.
A 20-person company with a $200,000 claim pays about $40,000. Bill C-15 (Royal Assent March 26, 2026)
doubled the enhanced expenditure limit to $6M, so more companies can claim more, and CRA is reviewing
with AI, so claims need to be defensible.

## What it does
For a founder or controller at a 5 to 30 person Canadian CCPC: connect Jira, Slack and documents
(read-only), upload payroll, click Analyze. SR&ED Copilot finds candidate projects, scores them against
the CRA criteria with cited evidence, drafts lines 242/244/246 where every sentence links to a ticket,
message or notebook entry, estimates qualifying salary and the ITC, and flags what a CRA reviewer would
challenge. The CPA reviews and files.

## How we built it
A Next.js app (App Router, TypeScript) queues an analysis job; a worker runs it in nine stages:
ingest, tag, cluster, classify, draft, check, expenditures, risk, evaluate. A fast model tags source
items and assigns them to projects (Jira epics seed the projects). The main model scores each project
on the five CRA criteria with cited evidence and may make up to five read-only lookups; the
eligible / not eligible decision itself is a rule in code, not a model call. Drafts are lists of cited
sentences, and a deterministic checker rejects any sentence whose citation is missing, whose excerpt
is not an exact substring of the source, or whose numbers do not appear in the cited record; if more
than 10% fail, the draft is regenerated once and remaining failures stay visible. Expenditures,
the 55% proxy and the ITC are computed in code from payroll and activity. A separate skeptical
"CRA reviewer" prompt can only raise flags.

We tested it on two synthetic companies, with answer keys written and committed before any pipeline
code existed (see the git history).

| Metric | Lakeshore Vision (live run on Render) | Bayfront Biologics (two CLI runs) |
|---|---|---|
| Eligibility precision / recall | 100% / 100% | 50% / 100% |
| Citation support (checker) | 100% | 95% to 98% |
| People F1 | 0.97 | 0.95 to 1.0 |
| Key-evidence recall | 78% | 100% |

Two misses against the keys, reported rather than fixed by editing the keys:
- **A5, auto-labelling** (key: borderline): the pipeline says not eligible, 5/10, one point under the
  borderline line.
- **B2, 384-well assay** (key: borderline): the pipeline says eligible, 8/10. The CRA-reviewer pass
  raises two high flags against it, which a CPA would see.

A Lakeshore run takes about 3.5 minutes and 110k tokens.

## Partner platforms
- **SurrealDB**: one database for app data and the knowledge graph (evidence supports project, person worked_on project, claim cites evidence, version supersedes version). Immutable version chain plus freeze snapshot shows what was known when the claim was drafted. The live app runs on Surreal Cloud.
- **Clerk**: organizations with owner, technical reviewer and CPA roles, enforced on the server for every page, route and action.
- **Render**: one web service from `render.yaml`, with the job worker running in-process.
- **Anthropic**: Claude Haiku 5.5 for tagging and assignment, Claude Sonnet 5.5 for classification, drafting and the reviewer pass; every call logged with prompt name, version and hash.
- **Era (Eon)**: we built an MCP connector with a read-only tool allowlist, but did not get access in time to connect it. The demo runs on our synthetic fixtures instead.

## Security and ethics
1. **Read-only**: connectors have no write methods; MCP calls pass a read-only allowlist.
2. **Tenant isolation**: every row carries the Clerk org id; the repository layer requires it and binds it on every query; tested.
3. **Prompt injection**: source content is wrapped in `<source_item>` tags as untrusted data; agent lookups are capped at 5 and never write.
4. **No invented evidence**: excerpts must be exact substrings; every sentence must cite; numbers must appear in cited evidence.
5. **Conservative defaults**: thresholds are in code; borderline projects need a person to accept them.
6. **Human in the loop**: nothing is filed; exports are marked draft; a CPA role exists.
7. **Audit trail**: every model call logged with prompt version and hash; claim sections are immutable versions linked by `supersedes` edges; freezing records the head versions.
8. **Data minimization**: emails and phone numbers stripped before model calls.
9. **Deletion**: owners can hard-delete all org data from Settings.
10. **Secrets**: environment variables only.
11. **Rates carry sources**: each tax rate has a source URL and a verified flag; unverified ones are badged in the UI.

## Challenges / what we learned
- **Silent data loss.** SurrealDB escapes some record ids, and the model echoed them back unescaped, so 30 of 65 evidence items were silently dropped. We now give the model Jira epic keys instead of database ids.
- **Checkers are stricter than people.** The number checker first treated names like `Cortex-A72`, `FP32` and `SOP-021` as numeric claims and failed good sentences. It now ignores names and accepts numbers from the cited record's title.
- **Keep the boring work.** The tagger first dropped routine tickets, which left nothing to rule the dashboard redesign out with. Routine work is now kept and tagged "routine".
- **Labels matter to a reviewer.** Routine engineering was labelled with a statutory exclusion it did not meet. The classifier now calls it low uncertainty instead; the live run confirms the fix.
- **Writing the answer key first** kept us honest: two projects still disagree with it, and we report them.

## Prior work and AI disclosure
Planning documents were written before Build Week. No code existed before it; the git history shows
the build. Claude Code wrote most of the code; the Claude API powers the product. All company data is
synthetic: Lakeshore Vision Inc. and Bayfront Biologics Inc. are fictional.

## Team
Nathan [surname], Matei [surname].
