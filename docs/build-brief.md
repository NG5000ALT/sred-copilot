# SR&ED Copilot: Build Brief

Context handoff document for the Build North hackathon. Written October 21, 2026 from a planning chat. Paste or attach this file in a new chat to continue building.

---

## 0. How to use this file

- This is the full context for one of two ideas we chose. The other is the Recovery Pathway Planner (separate file).
- Sections 1 to 3 cover the hackathon rules and judges. Sections 4 to 8 cover the problem and product. Sections 9 to 13 cover the build. Section 14 lists sources.
- Anything marked **VERIFY** is a detail I'm fairly confident in but that should be checked against the primary source before it goes in the product or pitch.

---

## 1. Team

- **Nathan:** second-year Commerce student, DeGroote School of Business, McMaster. Finance focus. Uses Claude Code for building.
- **Matei:** second-year Life Sciences student, McMaster. Understands lab research workflows.
- Neither of us is a CS major. The build should lean on Claude Code, managed services and simple architecture.

---

## 2. The hackathon: Build North, "Ship Something Real"

- **Organizer:** Georgian (AI-focused growth equity firm, Toronto). Co-hosts: Anthropic, Google Cloud for Startups, TAPNET, Expo, Clerk, Eon, SurrealDB, Render.
- **Format:** virtual build week, October 16 to 25, 2026. Teams of up to 4 (solo allowed). Must be 18+ and live in Canada.
- **Submission deadline:** October 25, 2026, 11:59 PM ET, via one Devpost project page.
- **Top 10 announced:** October 26. **Demo Day:** October 29, in person in Toronto (2 St Clair Ave W). At least one team member must attend.
- **Devpost:** https://build-north.devpost.com/ (rules: /rules, resources: /resources). Discord announcements channel has updates on credits and office hours.
- **Event page:** https://luma.com/build-north

### What to submit
1. Public GitHub repository.
2. Live link (deployed app) if possible.
3. Demo video, optional, 4 minutes or less, shareable without login.
4. Write-up: what we built and why, tech stack, which partner platforms we used and how.
5. Team members by name.
6. Disclosure of prior work, templates and AI tools used. Anything that existed before Build Week must be disclosed, with an explanation of what was built during the week.

### Rules worth remembering
- Build the project during Build Week.
- Repo, video and Devpost page become public. We keep our IP.
- No faked demos. Disqualification risk.
- One submission per team.

---

## 3. Judging, judges and prizes

### Judging criteria (from Devpost)
1. **Innovation:** beyond obvious solutions.
2. **Real-World Impact:** clear user, value-add, path to production.
3. **UI & Design:** usable by a real user.
4. **Tech & Deployment:** solid architecture, deployed and serving features.
5. **Security & Ethics:** guardrails, safe handling of user data.

### Questions to answer before building (from Devpost)
- Who is the user, specifically? (A person, team or workflow, not "everyone.")
- What is the value-add, stated plainly?
- Is there a credible path to production? (No business plan needed, but judges should believe it can keep existing after Demo Day.)

### Judges
- Margaret Wu, Lead Investor, Georgian
- Madalin Mihailescu, CTO, Georgian
- Deval Pandya, CEO & Founder, Autoinference; former VP of AI Engineering, Vector Institute
- Julien Coupez, Google Customer Engineer for Startups

### Prizes
- **Best Overall:** Georgian Golden Ticket (investor pitch session + warm intro to an early-stage fund), Google Home speaker per member, $15,000 Anthropic API credits, partner perks.
- **Best Use of Expo:** LG 27" monitor per member, 1 year Expo Starter. (Mobile apps only.)
- **Best Use of Clerk:** JBL Tune 770NC per member.
- **Best Use of Eon:** Samsung T7 1TB SSD per member, 3 months unlimited Era by Eon.
- **Best Use of SurrealDB Agent Memory:** $1,000 SurrealDB Agent Memory credit.
- For partner prizes, judges want evidence the platform materially shaped what we built.

### What we learned about Georgian (important for the pitch)
- Georgian invests in B2B technology companies across the AI stack.
- **Every partner sponsor is a Georgian portfolio company:** Clerk, Eon, Expo, Render, SurrealDB. Using them well is a direct signal to the organizers.
- **Darrow** (legal AI): Georgian led its $35M Series B. Darrow's AI reads public documents (complaints, SEC filings) to find legal violations, predict outcomes and estimate financial impact. The lead investor quoted was "Margo Wu," who appears to be judge Margaret Wu. Darrow later added a litigation-finance underwriting tool.
- **Ambience Healthcare:** Georgian joined its $243M Series C. AI for clinical documentation, coding and revenue integrity.
- **Pattern Georgian keeps paying for:** AI that reads scattered, messy records and turns them into money someone is owed, or a decision with a dollar value. SR&ED Copilot matches this pattern directly.
- No previous Build North winners exist. This appears to be the first edition.

---

## 4. One-line pitch

> Canadian startups lose up to 30% of their R&D tax credit to consultants. Our AI reads the records they already have and drafts the claim for them.

Georgian-style framing:
> Canadian companies leave R&D credits unclaimed or lose a fifth of them to consultants. Our agent reads the work records they already keep and recovers that money.

---

## 5. The problem

### What SR&ED is
- Scientific Research and Experimental Development (SR&ED) is Canada's federal R&D tax incentive, run by the CRA.
- It is not a grant. Companies claim it with their corporate tax return using **Form T661** (the SR&ED claim) and **Schedule T2 SCH 31** (investment tax credit calculation).
- For Canadian-controlled private corporations (CCPCs), the enhanced credit is **35%, refundable**, on qualifying expenditures up to the annual limit.
- **Filing deadline:** 18 months after the end of the corporation's tax year.
- Software development is one of the most common claim types.

### Why it's hard
- A claim needs a technical narrative: what technological uncertainty existed, what systematic work was done, and what advancement resulted. Plus a financial breakdown of salaries, materials and contracts that qualify.
- The evidence lives across many tools (task trackers, chat, code, lab notebooks) and is rarely organized for a claim.
- Good claims require coordination between technical staff and finance staff.

### The cost of the current solution
- SR&ED consultants typically charge **10% to 30% of the claim on contingency**, or **$5,000 to $25,000+ fixed fee**.
- Example: a $200,000 claim at 20% contingency costs **$40,000**.
- Another example: 20% of a $60,000 refund is $12,000.
- One guide argues companies with under $300K of qualifying expenditures should file themselves, because a 15% to 25% contingency fee costs more than the extra narrative quality is worth.
- Contingency fees can push consultants toward aggressive claims, which raises audit risk.

### Why now (2026 changes)
- Budget 2025 delivered the **largest SR&ED expansion in about 25 years**. Bill C-15 received Royal Assent on **March 26, 2026**.
- **Expenditure limit doubled from $3M to $6M** for the enhanced 35% credit. That means up to about **$2.1M per year in refundable credits** for qualifying CCPCs.
- Enhanced credit extended to eligible **Canadian public corporations**.
- **Capital expenditures restored** as eligible.
- **New pre-claim approval process** from **April 1, 2026**: optional, four steps, eligibility determination within **eight weeks** (per the 2026 Spring Economic Update, quoted by BIOTECanada). Reviewed-claim processing cut from 180 to 90 days.
- CRA is increasing use of **AI in SR&ED administration** and risk assessment. Claims need to be defensible.
- Life sciences (BIOTECanada) actively lobbied for these changes. Biotech is a natural target segment.

---

## 6. The user

### Primary user
- The **founder, CFO or controller** at a **5 to 30 person Canadian tech or biotech startup (CCPC)** with roughly $100K to $2M of qualifying R&D spend.
- Pain: no time to write the claim, no in-house SR&ED expertise, unhappy giving away 20% to a consultant.

### Secondary users
- **Technical leads / scientists** who must explain the work (they confirm or correct what the AI drafted).
- **The company's CPA** who reviews and files. Position the product as making the CPA's job faster, not replacing the CPA.

### Who pays
- The startup, as a flat fee or subscription, instead of a contingency cut.
- Possible later channel: small CPA firms that file SR&ED for many clients.

### Validation to do this week
- Talk to 2 or 3 founders or controllers at McMaster-affiliated startups (Innovation Factory Hamilton, The Forge at McMaster), or an accounting professor.
- Get one quote like "I'd pay for this" for the Devpost write-up and pitch.

---

## 7. The product

### Core flow
1. **Connect sources.** The company connects Jira (tasks), Slack (discussion), GitHub (code), and/or uploads lab notebooks and payroll exports.
2. **Ingest and index.** The agent reads tickets, threads, commits and notes for the tax year.
3. **Find candidate SR&ED projects.** It clusters work into projects and flags evidence of technological uncertainty (things that failed, experiments, novel approaches, "we don't know if X will work").
4. **Score eligibility.** For each candidate project, it explains why it might or might not qualify, citing the specific tickets/messages as evidence.
5. **Draft the T661 narrative.** For each accepted project, it drafts the three core sections (uncertainty, work performed, advancement) within word limits, with every claim linked back to source evidence.
6. **Map expenditures.** It matches people who worked on each project to payroll, estimates the SR&ED share of their time from activity data, and builds a draft expenditure table.
7. **Audit-risk check.** It flags weak claims: routine engineering, missing evidence, overstated advancement.
8. **Human review.** The founder/tech lead edits; the CPA reviews and files. Nothing is filed automatically.
9. **Memory across years.** Projects, people, prior claims and CRA feedback persist so next year's claim builds on this year's.

### T661 project description structure (VERIFY against the current T661 form)
- Section/line 242: scientific or technological uncertainties (about 350 words).
- Section/line 244: work performed to overcome them (about 700 words).
- Section/line 246: scientific or technological advancement achieved (about 350 words).

### What makes it defensible (Security & Ethics criterion)
- **Every sentence in the draft links to source evidence.** No unsupported claims.
- **Conservative by default.** The tool errs toward excluding borderline work, and says why.
- **Human in the loop.** Clearly labelled as a draft for professional review. Not tax advice.
- **Data handling:** read-only access to connected tools, least-privilege scopes, data encrypted at rest, per-company isolation, easy deletion.
- **Audit trail:** log which model version and which evidence produced each paragraph.

### Out of scope for the hackathon
- Actually filing with CRA.
- Provincial credits (Ontario OITC/ORDTC etc.). Mention as roadmap.
- Pre-claim approval application. Roadmap item, strong pitch point.

---

## 8. Competition and positioning

- **SR&ED consultancies** (e.g., Boast, Leyton, Henderson & Associates and many others). Some already brand themselves as AI-enabled. Investigate Boast specifically: it markets itself as AI-powered SR&ED. **VERIFY what Boast's product actually does and how it prices**, and position against it.
- **DIY guides** (e.g., GrantCompass) for founders filing themselves.
- **General accountants** who file but lack SR&ED depth.
- **Our angle:** software-first, flat price, evidence-linked drafts generated from tools companies already use, built for small startups that consultants underserve.

---

## 9. Partner platform plan (targets two partner prizes plus Best Overall)

### Eon: Era (Best Use of Eon)
- Era generates a **simulated company** with connected, realistic data and simulates business apps via REST APIs and **MCP servers**. Read-only data plane.
- Simulated systems mentioned: **Salesforce, HubSpot, Zendesk, Jira, Gong, Slack, Amazon S3**.
- Generation is deterministic from a spec: industry, size class, business model, list of apps, random seed.
- Era knows the **exact ground truth** and provides answer keys, so we can benchmark our agent.
- Console: https://console.era.eon.io . CLI install: `curl -fsSL https://console.era.eon.io/install.sh | sh` . GitHub: eon-io/era . Every team gets free early access at kickoff (check Discord).
- Example env vars from Eon's blog: `SLACK_MCP_URL=https://slack-mcp.era.eon.io/mcp/`, similar for Salesforce and Zendesk. Get the Jira one from the console.
- **How we use it:** generate a fictional Canadian software or biotech startup, point our agent at its Jira + Slack + S3, and measure how well it finds SR&ED-eligible projects and the right people/time. Build our own answer key on top (which projects should qualify) and report precision/recall in the demo.
- **Gap:** GitHub doesn't appear in Era's simulator list. Either skip GitHub for the demo or seed a small fake GitHub repo ourselves. **VERIFY in the console.**

### SurrealDB: Agent Memory (Best Use of SurrealDB Agent Memory)
- SurrealDB 3.x: multi-model database (relational, document, graph, vector, time-series) with first-class agent memory and context graphs.
- Agent Memory features listed: knowledge graph with entity disambiguation, tri-temporal model with non-deleting supersession chains, hybrid retrieval (vector, lexical, graph), multi-agent shared memory, MCP server, TypeScript and Python SDKs.
- SurrealDB 3.0 also supports time-travel queries for auditing and debugging.
- **How we use it:** store the company's knowledge graph: projects, people, tickets, evidence, claims by year, CRA feedback. Tri-temporal history means we can show "what we knew when we drafted the 2026 claim," which is exactly what an audit needs.
- Access: Agent Memory had a waitlist/design-partner program. **Ask in the Build North Discord how hackathon teams get access.**

### Clerk (optional, not a prize target unless it's a natural fit)
- Use for sign-in and organization accounts (company workspace, invite CPA as reviewer). Cheap to add and it fits multi-user roles.

### Render
- Deployment host (sponsor). Fine choice for a web service + worker.

### Anthropic
- Claude API for the agent. Ask in Discord about hackathon API credits.

---

## 10. Suggested architecture (keep it simple)

- **Frontend:** Next.js (TypeScript), Tailwind. Pages: connect sources, project list, project detail with evidence, narrative editor, expenditure table, risk flags.
- **Backend/agent:** Python or TypeScript service. Claude via the Anthropic SDK with tool use. MCP clients for Era's simulated Slack/Jira.
- **Memory/data:** SurrealDB (Agent Memory for the knowledge graph; regular tables for app data).
- **Auth:** Clerk, with organization roles (owner, technical reviewer, CPA).
- **Hosting:** Render (web + background worker).
- **Pipeline:**
  1. Ingest: pull all tickets/messages for the tax year via MCP; normalize to `evidence` records.
  2. Cluster: group evidence into candidate projects (embedding similarity + Jira epics/components).
  3. Classify: for each project, Claude scores the SR&ED criteria with cited evidence IDs.
  4. Draft: Claude writes 242/244/246 text, constrained to cite evidence IDs; a checker rejects any sentence without a citation.
  5. Expenditures: map people to projects by activity share; join with a payroll CSV (synthetic) to estimate qualifying salary.
  6. Risk: a second Claude pass acts as a skeptical CRA reviewer and flags weak points.
  7. Evaluate: compare against our answer key on the Era company; show metrics.

### Data model sketch
- `company`, `tax_year`, `person`, `source_item` (ticket/message/commit), `evidence` (excerpt + link), `project`, `project_evidence` (edge), `claim_section` (242/244/246 drafts with citations), `expenditure_line`, `risk_flag`, `model_run` (version, prompt hash, timestamp).

---

## 11. Four-day build plan (Wed Oct 21 to Sat Oct 25)

**Wednesday (today)**
- Confirm Era access; generate a simulated startup company. Confirm SurrealDB Agent Memory access in Discord.
- Set up repo, Next.js app, Clerk, Render deploy (deploy "hello world" on day one).
- Draft the answer key: which projects in the Era company should qualify.
- Message 3 potential users for quick calls.

**Thursday**
- Ingestion from Era Slack + Jira into SurrealDB.
- Project clustering and eligibility scoring with cited evidence.
- Basic UI: project list and detail pages.

**Friday**
- Narrative drafting with citation enforcement.
- Expenditure mapping with a synthetic payroll CSV.
- Risk-flag pass. Evaluation page with metrics against the answer key.

**Saturday**
- Polish UI, write the README, record the 4-minute video, write the Devpost page with the partner-platform section and prior-work disclosure. Submit well before 11:59 PM ET.

**Cut list if behind:** expenditure mapping becomes a simple table; risk flags become a single summary; drop GitHub.

---

## 12. Demo script (about 3 minutes)

1. The problem in one line with the $40,000 consultant example.
2. Show the simulated company in Era: dozens of Jira tickets and Slack threads.
3. Click "Analyze 2026." Agent finds 3 candidate projects, marks 2 eligible, 1 routine.
4. Open a project: draft narrative where every sentence links to a real ticket or message.
5. Show the expenditure table and the risk flags.
6. Show evaluation: our agent vs. the answer key (precision/recall).
7. Close: flat price instead of 20%, built on tools the company already uses, CPA stays in control.

---

## 13. Risks and open questions

- **Tax accuracy.** Mitigate with conservative defaults, evidence links and required professional review. Disclaim clearly.
- **Competitors claiming AI.** Research Boast and others before the pitch.
- **Data sensitivity.** Companies will hesitate to connect Slack. Emphasize read-only scopes, isolation, deletion.
- **Era fit.** Era companies are business-software heavy (CRM, support). Confirm we can generate a company whose Jira/Slack content looks like R&D work. If not, seed custom data alongside Era.
- **Pricing.** Open question: flat fee per claim vs. subscription vs. small success fee.
- **T661 details.** VERIFY section numbers and word limits on the current form.

---

## 14. Sources

- Build North Devpost: https://build-north.devpost.com/
- Build North rules: https://build-north.devpost.com/rules
- Kickoff video: https://www.youtube.com/watch?v=XMYQhtDocQE
- Prep video: https://www.youtube.com/watch?v=4p5oYXycRCQ
- Georgian investor page: https://georgian.io/for-investors
- Georgian portfolio: https://georgian.io/portfolio
- Darrow Series B (Calcalist): https://www.calcalistech.com/ctechnews/article/rkeopxvkt
- Darrow (TechCrunch): https://techcrunch.com/2023/09/19/darrow-legal-tech
- Darrow (Sacra): https://sacra.com/c/darrow
- Georgian on Ambience: https://georgian.io/?p=28473
- SR&ED consultant costs (Henderson): https://hendersonassociates.ca/sred-resources/sred-consultant-cost-canada
- Filing SR&ED without a consultant (GrantCompass): https://grantcompass.ca/sred-without-consultant-canada.html
- SR&ED consultant cost math (GrantCompass): https://grantcompass.ca/sred-consultant-cost-canada.html
- Claiming SR&ED in Ontario (LawyerInfo): https://lawyerinfo.ca/guides/ontario/business-law-ontario/how-to-claim-the-scientific-research-and-experimental-development-sred-tax-credit-in-ontario/
- Boast SR&ED webinar (2026 changes): https://www.boast.ai/resources/webinars-events/maximizing-sred-program
- BIOTECanada on SR&ED changes: https://www.biotech.ca/?p=18272
- Miller Thomson on pre-claim approval: https://www.millerthomson.com/en/?p=51942
- BDO Budget 2025 summary: https://www.bdo.ca/insights/2025-federal-budget
- Leyton Budget 2025 SR&ED: https://leyton.com/ca/en/insights/articles/federal-budget-2025-sred-program-expansion/
- Eon, Introducing Era: https://www.eon.io/blog/era-build-and-test-ai-agents
- Era benchmark paper: https://arxiv.org/pdf/2609.30055
- Era launch coverage: https://runtimewire.com/article/eon-era-simulated-enterprise-agent-testing
- SurrealDB 3.0 (FirstMark): https://firstmark.com/story/surrealdb-raises-38m-series-a-and-launches-3-0-to-power-the-next-generation-of-ai-systems/
- SurrealDB Agent Memory: https://surrealdb.com/agent-memory/get-started
- SurrealMCP: https://surrealdb.com/blog/introducing-surrealmcp
