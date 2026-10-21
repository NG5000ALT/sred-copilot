# SR&ED Copilot

Drafts a Canadian SR&ED tax credit claim from the records a startup already keeps (Jira, Slack,
lab notebooks, payroll). It finds candidate R&D projects, scores them against the criteria CRA
reviewers use, drafts Form T661 lines 242, 244 and 246 with every sentence citing its source,
estimates qualifying salaries and the investment tax credit, and flags audit risk.
It produces a draft for a CPA to review. It never files anything.

All data in this repo is synthetic. Lakeshore Vision Inc. and Bayfront Biologics Inc. are fictional.

Built for Build North (October 2026). Planning documents (`PLAN.md`, `docs/build-brief.md`) were
written before Build Week; no code existed before it. See the git history.

## How it works

```
Browser (Next.js, Clerk session)
   |
Server components / actions ---> SurrealDB (app data + knowledge graph)
   |  enqueue                        ^
   v                                 |
 job table  ---> worker -----> connectors: Era MCP | fixtures | payroll CSV
                   |
                   +--> ingest > tag > cluster > classify > draft > check > expenditures > risk > evaluate
                   +--> Claude via lib/llm/client.ts (every call logged as a model_run row)
```

| Stage | What it does | Where |
| --- | --- | --- |
| Ingest | Reads people and items for the tax year, strips emails and phone numbers | `lib/pipeline/ingest.ts` |
| Tag | Fast model tags items in batches of 25; an excerpt is kept only if it is an exact substring of the source | `lib/pipeline/tag.ts`, `excerpt.ts` |
| Cluster | Jira epics seed projects; the model assigns Slack and doc evidence; activity counts per person | `lib/pipeline/cluster.ts` |
| Classify | Main model scores five criteria with cited evidence; may call up to 5 read-only lookups; **the decision rule is code** | `classify.ts`, `decision.ts` |
| Draft + check | Lines 242/244/246 as cited sentences; deterministic checker; one regeneration if over 10% fail; failures stay visible | `draft.ts`, `check.ts` |
| Expenditures | Time share from activity, overrides kept beside estimates, 80% contracts, 55% proxy, 35%/15% ITC | `expenditures.ts`, `lib/sred/rules.ts` |
| Risk | Rule flags plus a skeptical CRA-reviewer prompt that only flags | `stages.ts` |
| Evaluate | Precision/recall, confusion matrix, people F1, key evidence recall vs a hand-written answer key | `evaluate.ts`, `answer-keys/` |

## Run locally

Requirements: Node 22+, pnpm 10.

```bash
pnpm install
cp .env.example .env        # then fill in the keys below
pnpm dev                    # http://localhost:3000, worker runs in-process
```

- **Clerk**: put `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in `.env.local`. For quick
  local testing, `npx clerk@latest init --accountless` in an empty folder gives development keys.
  In the Clerk dashboard enable Organizations and add custom roles `org:tech_reviewer` and `org:cpa`
  (`org:admin` is the owner).
- **Anthropic**: `ANTHROPIC_API_KEY`, plus `MODEL_FAST` and `MODEL_MAIN`.
- **SurrealDB**: the default `SURREAL_URL=surrealkv://.data/sred` is an embedded database, fine for one
  local process. Deployments need a SurrealDB server (`wss://.../rpc` with `SURREAL_USER`/`SURREAL_PASS`).

Without the web app: `pnpm analyze:cli lakeshore-vision` runs the whole pipeline and prints each
project's call next to the answer key.

Other scripts: `pnpm test`, `pnpm typecheck`, `pnpm fixtures` (regenerates the synthetic data
deterministically), `pnpm era:tools` (saves the Era MCP tool list to `docs/era-tools.json`).

## Security and ethics

1. **Read-only**: connectors have no write methods; Era MCP calls pass a read-only allowlist (`lib/connectors/era/allowlist.ts`).
2. **Tenant isolation**: every row carries the Clerk org id; `lib/db/repo.ts` requires it and binds it on every query; tested.
3. **Prompt injection**: source content is wrapped in `<source_item>` tags as untrusted data; agent lookups are capped at 5 and never write.
4. **No invented evidence**: excerpts must be exact substrings; every sentence must cite; numbers must appear in cited evidence.
5. **Conservative defaults**: thresholds are in code; borderline projects need a person to accept them.
6. **Human in the loop**: nothing is filed; exports are marked draft; a CPA role exists.
7. **Audit trail**: every model call logged with prompt version and hash; claim sections are immutable versions linked by `supersedes` edges; freezing records the head versions.
8. **Data minimization**: PII stripped before model calls; raw records never sent to the model.
9. **Deletion**: owners can hard-delete all org data from Settings.
10. **Secrets**: environment variables only; `.env*` is git-ignored.
11. **Rates carry sources**: each rate in `lib/sred/rules.ts` has a `source` and `verified` flag; unverified ones are badged in the UI.

## AI tools disclosure

Claude Code wrote most of the code from the planning documents. The Claude API powers the product
(tagging, clustering, classification, drafting, review). Synthetic fixtures were authored with Claude Code.
