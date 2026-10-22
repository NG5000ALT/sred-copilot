Fix: pnpm analyze:cli lakeshore-vision fails on the local machine

Context (checked in a cloud session on 2026-10-22)

1. `pnpm typecheck` passes.
2. `pnpm test` passes, 45 of 45 tests.
3. `pnpm analyze:cli lakeshore-vision` loads the Lakeshore Vision data and runs until the first call to Claude (the tag stage). With no settings it stops with "MODEL_FAST is not set". With the model names set but no key it stops with "ANTHROPIC_API_KEY is not set". The code is fine. The failure comes from the local settings.
4. The command reads its settings only from .env or .env.local in the project root, using the Node flag `--env-file-if-exists` (see the analyze:cli script in package.json). Settings exported elsewhere, or a file in another folder, are not picked up.

Steps to fix on the local machine

1. Open a terminal in the project root.
2. Run `node -v`. If the version is below 22.9, install Node 24 from nodejs.org. Older Node versions do not support `--env-file-if-exists`.
3. Run `pnpm install`.
4. Open .env.local and make sure it contains all three lines below, with the real key after the first equals sign:

   ANTHROPIC_API_KEY=your-key
   MODEL_FAST=claude-haiku-5-5
   MODEL_MAIN=claude-sonnet-5-5

   The two MODEL lines are easy to miss. Without them the run fails with "MODEL_FAST is not set", even with a valid key. .env.example lists every setting the app uses.
5. Save the file and run `pnpm analyze:cli lakeshore-vision` again. A full run takes about 3.5 minutes and about 110k tokens.

What the error tells you

1. "MODEL_FAST is not set" or "ANTHROPIC_API_KEY is not set": a line from step 4 is missing, or the file has a different name or sits in a different folder.
2. "credit balance is too low": the key works, but the account needs credits. Add them under Billing at console.anthropic.com.
3. "authentication_error" or "invalid x-api-key": the key is wrong or was deleted. Create a new one at console.anthropic.com under Settings, API Keys.
4. "bad option: --env-file-if-exists": Node is too old. Go back to step 2.

Never paste the key into a chat or commit it. .env.local is for local use only.

After the run succeeds

1. Run `pnpm inspect:cli lakeshore-vision`. Check that A3 is no longer labelled "routine data collection". The classify v2 fix for that label has not been tested on a real run.
2. Check the CRA reviewer flags. They should now cite the tax year dates (cra_reviewer v2, also untested on a real run).
3. Run `pnpm analyze:cli bayfront-bio`, then `pnpm inspect:cli bayfront-bio`, and check the same two things.
4. Expected results from earlier runs: A1, A2 and B1 eligible; A3, A4, B3 and B4 not eligible. B2 comes out eligible and A5 not eligible, against "borderline" in the answer keys. That mismatch is known and waits on a decision.
5. Then continue with the remaining setup in docs/status-2026-10-21.md: Clerk, SurrealDB, Render, then the hackathon deliverables. The Devpost deadline is 8 PM ET Saturday, October 25.
