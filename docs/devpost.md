# SR&ED Copilot (Devpost draft)

Fill the bracketed parts after the real run and the user interviews.

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
[architecture paragraph from README]. Results on our two synthetic companies against answer keys
written before the pipeline existed: [precision / recall / citation support from the Evaluation page].

## Partner platforms
- **Era (Eon)**: [if access worked] simulated companies over MCP; the classifier's read-only agent loop fetches more Jira/Slack/Drive evidence through MCP. Ground truth for evaluation.
- **SurrealDB**: one database for app data and the knowledge graph (evidence supports project, person worked_on project, claim cites evidence, version supersedes version). Immutable version chain plus freeze snapshot shows what was known when the claim was drafted.
- **Clerk**: organizations with owner, technical reviewer and CPA roles, enforced on the server for every page and action.
- **Render**: web service with the job worker.
- **Anthropic**: Haiku-class model for tagging and assignment, Sonnet-class for classification, drafting and the reviewer pass; every call logged with prompt hash.

## Security and ethics
[the 11 points from README]

## Challenges / what we learned
[fill in]

## Prior work and AI disclosure
Planning documents were written before Build Week. No code existed before it; the git history shows
the build. Claude Code wrote most of the code; the Claude API powers the product. All company data is
synthetic.

## Team
Nathan [surname], Matei [surname].
