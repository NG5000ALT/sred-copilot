# Handoff: what is built, what needs you

Status as of 2026-10-21. Everything below "Done" is committed and covered by `pnpm typecheck && pnpm test` (42 tests) and `pnpm build`.

## Done (milestones M1 to M9, minus the items under "Needs you")
- Next.js 16 app, Clerk 7 org roles enforced server-side on every page, route and action (`lib/auth/roles.ts`).
- SurrealDB schema, org-scoped repo, graph edges (`supports`, `worked_on`, `cites`, `supersedes`), isolation tests.
- Synthetic fixtures for both companies (128 and 81 items, ~40% noise, payroll CSVs). Answer keys drafted by Claude Code from PLAN 6.1/6.2 and committed before the pipeline was ever run on either company.
- Fixture connector, Era MCP connector (unverified, see below), payroll CSV parser with validation.
- LLM client with forced-tool Zod output, retry on invalid output, prompt caching, `model_run` logging; all 8 prompts.
- All pipeline stages including the classify agent loop (5 read-only lookups), checker with regeneration, expenditures with overrides, rule and model risk flags, evaluation.
- End-to-end test of the whole pipeline on a 20-item company with a scripted fake model, plus a test that renders every signed-in page from its output.
- All pages in PLAN section 10, Markdown/CSV export, freeze, data deletion.
- Rates checked against canada.ca: T661 limits, 55% PPA, 80% contracts, $6M limit are `verified: true` with URLs. 35% and 15% rates and the exclusion list wording are still `verified: false`.

## Needs you (in this order)
1. **Thursday checkpoint: passed (2026-10-21)** on Lakeshore Vision with `claude-haiku-5-5` / `claude-sonnet-5-5`, twice in a row: A1, A2 eligible; A3, A4 not eligible (A4 via the style-change exclusion). Precision 100%, recall 100%, people F1 0.97, key-evidence recall 100%, citation support 99%. About 110k tokens and 3.5 minutes per run. A5 comes out not eligible (all criteria 1/2, total 5/10) against an expected borderline; the decision rule was left conservative on purpose. Decide whether to change the answer key or accept the miss. `pnpm inspect:cli lakeshore-vision` shows the per-project reasoning.
   **Bayfront Biologics (2026-10-21), two runs:** B1 eligible, B3 and B4 not eligible (B4 via the QC exclusion, B3 as routine data work). All three lab-notebook pages are tagged, assigned to B1 and cited; key-evidence recall 100%, people F1 0.95 to 1.0. B2 (384-well assay) comes out eligible on both runs (all criteria 2/2) against an expected borderline, so eligibility precision is 50%. The key says "borderline to eligible", so decide whether to change the key to eligible or accept the miss. About 75k tokens and 3 minutes per run.
2. **Clerk**: local dev keys are in `.env.local` (accountless, unclaimed; run `npx clerk@latest auth login` to claim, or replace with your own app's keys). In the dashboard: enable Organizations, add roles `org:tech_reviewer` and `org:cpa`. Then sign up, create an org, pick a demo company and click Analyze. I could not sign in myself, so the click-through in a real browser is untested; pages were verified by server rendering.
3. **SurrealDB**: create a Surreal Cloud instance (or Render Docker `surrealdb/surrealdb:v3` with a disk); set `SURREAL_URL=wss://.../rpc`, `SURREAL_USER`, `SURREAL_PASS`.
4. **GitHub + Render**: create the repo (public for Devpost), push, create the Render web service from `render.yaml`, set the secret env vars. One web service runs the worker in-process, so no paid worker is required. Set the live URL as a Clerk allowed origin.
5. **Era**: get access, put the MCP URLs in `.env`, run `pnpm era:tools`, then fix tool names in `lib/connectors/era/allowlist.ts` and the field mapping in `lib/connectors/era/index.ts` (both are placeholders). Switch with `CONNECTOR=era`.
6. **Agent Memory**: not built (first item on the cut list). The "what we knew when" story uses plain SurrealDB version chains and the freeze snapshot.
7. **Answer keys**: review `answer-keys/*.json` and take ownership (adjust expected calls or members if you disagree), before the first real run. Update `writtenBefore` if you change them.
8. **Manual items from PLAN**: user interviews, demo video, Devpost page (`docs/devpost.md` is a starting draft), Boast research.

## Deliberate cuts and shortcuts
- shadcn/ui not used: small Tailwind components in `components/ui.tsx` instead.
- Epic merge proposals (PLAN 8.3) not implemented; each epic is one project.
- Narrative diff view not built; the editor shows the version list with full text.
- Specified-employee salary-base caps not applied in the estimate (noted on the page).
- CPA "comment" feature not built; CPAs can read, resolve risks and export.
- `scripts/generate-fixtures.ts` is deterministic templates, not Claude-generated, so it needs no key.

## Submitted (2026-10-25)
- Devpost submission done before the 11:59 PM ET deadline. Write-up source: `docs/devpost.md`; logo and thumbnail: `docs/logo/`; gallery: `docs/screenshots/`.
- Live: https://sred-copilot.onrender.com (Render Blueprint from `render.yaml`, starter plan; Surreal Cloud; Clerk dev instance with Organizations and the two custom roles).
- Render note: `corepack enable` fails there (read-only `/usr/bin`), so build and start use `corepack pnpm ...`.
- Two live Lakeshore runs on Render matched the key except A5 (precision/recall 100%, citation support 100%, people F1 0.94 to 0.97, key-evidence recall 78% to 100%). In the second run A4 was ruled out as "no technological uncertainty" instead of the style-change exclusion.
- Demo video: final cut at `C:\Users\grube\Downloads\SRED Copilot demo under 4 min.mp4`; raw recording in `Videos\Screen Recordings`.
- Still open: rotate the Anthropic key, Era connector, Agent Memory. Keep Render, Surreal Cloud and Clerk running through Demo Day (2026-10-29, Toronto).
