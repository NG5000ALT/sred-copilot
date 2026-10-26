# SR&ED Copilot

Live app: https://sred-copilot.onrender.com (sign up, create an organization, pick a demo company and click Analyze)
Code: https://github.com/NG5000ALT/sred-copilot

## Inspiration
Canadian startups claim SR&ED, the federal R&D tax credit, by writing a technical narrative (Form T661
lines 242, 244 and 246) and a salary breakdown. Most of them hire a consultant on a 10% to 30%
contingency fee, so a 20-person company with a $200,000 claim pays about $40,000 just to get it written.
Bill C-15 (Royal Assent March 26, 2026) doubled the enhanced expenditure limit to $6M, which means more
companies can claim more; CRA is also reviewing claims with AI now, so a claim has to hold up.

## What it does
It's built for the founder or controller at a 5 to 30 person Canadian CCPC. They connect Jira, Slack
and their docs (read-only), upload payroll and click Analyze. SR&ED Copilot finds the candidate R&D
projects, scores each one against the CRA criteria with cited evidence, and drafts lines 242/244/246
where every sentence links back to a ticket, message or lab notebook entry. It also estimates
qualifying salary and the tax credit, and flags what a CRA reviewer would push back on. A CPA reviews
the draft and files it; the app never files anything.

## How we built it
The app is Next.js and TypeScript. Clicking Analyze queues a job, and a worker runs it in 9 stages:
ingest, tag, cluster, classify, draft, check, expenditures, risk and evaluate.

A fast model tags each record and assigns it to a project (Jira epics seed the projects). The main
model then scores each project on the 5 CRA criteria, citing evidence, and can make up to 5 read-only
lookups for more. The eligible/not eligible call is a rule in our code; the model only supplies the
scores.

Drafts come back as lists of cited sentences. A checker (plain code, no model) rejects any sentence
with a missing citation, an excerpt that isn't an exact substring of the source, or a number that isn't
in the cited record. If more than 10% fail, the draft is regenerated once, and anything still failing
stays visible to the reviewer. Expenditures, the 55% proxy and the tax credit are calculated in code
from payroll and activity. Last, a separate "skeptical CRA reviewer" prompt reads the claim; it can
raise flags but can't change anything.

To test it, we made 2 fictional companies and wrote an answer key for each before writing any pipeline
code (the git history shows the order).

| Metric | Lakeshore Vision (2 live runs on Render) | Bayfront Biologics (2 CLI runs) |
|---|---|---|
| Eligibility precision / recall | 100% / 100% | 50% / 100% |
| Citation support (checker) | 100% | 95% to 98% |
| People F1 | 0.94 to 0.97 | 0.95 to 1.0 |
| Key-evidence recall | 78% to 100% | 100% |

It disagrees with our keys on 2 projects, and we left the keys as written:
- A5, auto-labelling: the key says borderline; the pipeline says not eligible at 5/10, one point under
  the borderline line.
- B2, 384-well assay: the key says borderline; the pipeline says eligible at 8/10. The CRA-reviewer
  pass raises 2 high flags against it, so a CPA would see the problem.

A Lakeshore run takes about 3.5 minutes and 110k tokens.

## Partner platforms
- SurrealDB: one database for both the app data and the knowledge graph (evidence supports a project, a person worked on a project, a claim cites evidence, a version supersedes the last one). Versions are never edited, and freezing a claim records which versions were current, so you can see what was known when it was drafted. The live app runs on Surreal Cloud.
- Clerk: organizations with owner, technical reviewer and CPA roles, checked on the server for every page, route and action.
- Render: one web service deployed from `render.yaml`, with the job worker running inside it.
- Anthropic: Claude Haiku 5.5 for tagging and assignment; Claude Sonnet 5.5 for classifying, drafting and the reviewer pass. Every call is logged with the prompt name, version and hash.
- Era (Eon): we built an MCP connector with a read-only tool allowlist, but we didn't get access in time to connect it, so the demo runs on our own synthetic data.

## Security and ethics
1. Read-only: the connectors have no write methods, and MCP calls go through a read-only allowlist.
2. Tenant isolation: every row carries the Clerk org id; the database layer requires it on every query, and there are tests for it.
3. Prompt injection: source content goes into prompts wrapped in `<source_item>` tags as untrusted data; lookups are capped at 5 and can't write.
4. No invented evidence: excerpts have to be exact substrings, every sentence has to cite something, and numbers have to appear in the cited evidence.
5. Conservative defaults: the thresholds live in code, and a person has to accept any borderline project.
6. Human in the loop: nothing gets filed, exports are marked as drafts, and there's a CPA role.
7. Audit trail: every model call is logged with its prompt version and hash; claim sections are saved as new versions linked by `supersedes` edges, and freezing records the current ones.
8. Data minimization: emails and phone numbers are stripped before anything goes to a model.
9. Deletion: an owner can permanently delete all of the org's data from Settings.
10. Secrets: environment variables only.
11. Sourced rates: each tax rate has a source URL and a verified flag, and the UI badges the unverified ones.

## Challenges / what we learned
Our biggest bug was silent. SurrealDB escapes some record ids, the model echoed them back unescaped,
and 30 of 65 evidence items just disappeared with no error. The fix was to give the model Jira epic
keys instead of database ids.

The checker was too strict at first. It read names like `Cortex-A72`, `FP32` and `SOP-021` as numeric
claims and failed sentences that were fine; now it ignores names and accepts numbers from the cited
record's title.

The tagger also threw out routine tickets, which left nothing to rule the dashboard redesign out with.
Now it keeps routine work and tags it "routine". Related to that, the classifier was labelling routine
engineering with a statutory exclusion it didn't meet. It now calls it low uncertainty, and the live
run confirmed the fix.

Writing the answer keys before any pipeline code was the best decision we made. It meant we couldn't
quietly move the target, which is why the 2 misses above are still in the table.

## Prior work and AI disclosure
We wrote the planning documents before Build Week. No code existed before it, and the git history shows
the build. Claude Code wrote most of the code, and the Claude API powers the product. All company data
is synthetic; Lakeshore Vision Inc. and Bayfront Biologics Inc. are fictional.

## Team
Nathan Gruber, Matei Florea.
