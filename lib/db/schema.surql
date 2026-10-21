-- SR&ED Copilot schema (SurrealDB 3.x). Applied idempotently on connect.
-- Tables are SCHEMALESS so pipeline fields are kept; every row must carry a non-empty org
-- (Clerk org id), which lib/db/repo.ts injects on write and filters on read.

-- name, slug (fixture dataset), industry, fiscal_year_end, synthetic
DEFINE TABLE OVERWRITE company SCHEMALESS;
DEFINE FIELD OVERWRITE org ON company TYPE string ASSERT string::len($value) > 0;
DEFINE INDEX OVERWRITE company_org ON company FIELDS org;

-- company, year, start, end, status (draft|frozen), frozen_at, frozen_heads
DEFINE TABLE OVERWRITE tax_year SCHEMALESS;
DEFINE FIELD OVERWRITE org ON tax_year TYPE string ASSERT string::len($value) > 0;
DEFINE INDEX OVERWRITE tax_year_org ON tax_year FIELDS org;

-- company, external_ids{jira,slack,payroll}, name, title, salary, employment_type, arm_length, specified_employee
DEFINE TABLE OVERWRITE person SCHEMALESS;
DEFINE FIELD OVERWRITE org ON person TYPE string ASSERT string::len($value) > 0;
DEFINE INDEX OVERWRITE person_org ON person FIELDS org;

-- company, tax_year, kind (jira_issue|jira_comment|slack_message|doc_page|commit), external_id, url, author, created_at, title, body, epic_key, raw
DEFINE TABLE OVERWRITE source_item SCHEMALESS;
DEFINE FIELD OVERWRITE org ON source_item TYPE string ASSERT string::len($value) > 0;
DEFINE INDEX OVERWRITE source_item_org ON source_item FIELDS org;

-- tax_year, source_item, external_id, kind, project, excerpt (<= 500 chars), tags[], confidence, author, created_at
DEFINE TABLE OVERWRITE evidence SCHEMALESS;
DEFINE FIELD OVERWRITE org ON evidence TYPE string ASSERT string::len($value) > 0;
DEFINE INDEX OVERWRITE evidence_org ON evidence FIELDS org;

-- tax_year, title, summary, seed_epics[], status (candidate|eligible|borderline|not_eligible|insufficient_evidence), reason, user_decision
DEFINE TABLE OVERWRITE project SCHEMALESS;
DEFINE FIELD OVERWRITE org ON project TYPE string ASSERT string::len($value) > 0;
DEFINE INDEX OVERWRITE project_org ON project FIELDS org;

-- tax_year, project, version, scores{}, rationale{}, evidence{}, exclusions_hit[], decision, tool_calls
DEFINE TABLE OVERWRITE criteria_assessment SCHEMALESS;
DEFINE FIELD OVERWRITE org ON criteria_assessment TYPE string ASSERT string::len($value) > 0;
DEFINE INDEX OVERWRITE criteria_assessment_org ON criteria_assessment FIELDS org;

-- tax_year, project, line (242|244|246), version, text, sentences[], word_count, over_limit, author (model|user), created_at, model_run, head
DEFINE TABLE OVERWRITE claim_section SCHEMALESS;
DEFINE FIELD OVERWRITE org ON claim_section TYPE string ASSERT string::len($value) > 0;
DEFINE INDEX OVERWRITE claim_section_org ON claim_section FIELDS org;

-- tax_year, project, person, salary, time_share_est, time_share_override, basis{}, qualifying_salary, category
DEFINE TABLE OVERWRITE expenditure_line SCHEMALESS;
DEFINE FIELD OVERWRITE org ON expenditure_line TYPE string ASSERT string::len($value) > 0;
DEFINE INDEX OVERWRITE expenditure_line_org ON expenditure_line FIELDS org;

-- tax_year, project, severity (high|medium|low), kind, source (rule|model), message, fix, evidence_ids[], resolved
DEFINE TABLE OVERWRITE risk_flag SCHEMALESS;
DEFINE FIELD OVERWRITE org ON risk_flag TYPE string ASSERT string::len($value) > 0;
DEFINE INDEX OVERWRITE risk_flag_org ON risk_flag FIELDS org;

-- tax_year, project, prompt_name, prompt_version, prompt_hash, model, input_ids[], output, tokens_in, tokens_out, ms, created_at
DEFINE TABLE OVERWRITE model_run SCHEMALESS;
DEFINE FIELD OVERWRITE org ON model_run TYPE string ASSERT string::len($value) > 0;
DEFINE INDEX OVERWRITE model_run_org ON model_run FIELDS org;

-- kind, payload, status (queued|running|done|failed), stage, progress{}, error, created_at, updated_at
DEFINE TABLE OVERWRITE job SCHEMALESS;
DEFINE FIELD OVERWRITE org ON job TYPE string ASSERT string::len($value) > 0;
DEFINE INDEX OVERWRITE job_org ON job FIELDS org;

-- tax_year, answer_key, metrics{}, confusion{}, per_project[], created_at
DEFINE TABLE OVERWRITE eval_result SCHEMALESS;
DEFINE FIELD OVERWRITE org ON eval_result TYPE string ASSERT string::len($value) > 0;
DEFINE INDEX OVERWRITE eval_result_org ON eval_result FIELDS org;

-- Graph edges
-- weight, assigned_by (rule|model|user)
DEFINE TABLE OVERWRITE supports TYPE RELATION FROM evidence TO project SCHEMALESS;
DEFINE FIELD OVERWRITE org ON supports TYPE string ASSERT string::len($value) > 0;
DEFINE INDEX OVERWRITE supports_org ON supports FIELDS org;

-- activity_count, share
DEFINE TABLE OVERWRITE worked_on TYPE RELATION FROM person TO project SCHEMALESS;
DEFINE FIELD OVERWRITE org ON worked_on TYPE string ASSERT string::len($value) > 0;
DEFINE INDEX OVERWRITE worked_on_org ON worked_on FIELDS org;

DEFINE TABLE OVERWRITE cites TYPE RELATION FROM claim_section TO evidence SCHEMALESS;
DEFINE FIELD OVERWRITE org ON cites TYPE string ASSERT string::len($value) > 0;
DEFINE INDEX OVERWRITE cites_org ON cites FIELDS org;

-- version chain, never delete
DEFINE TABLE OVERWRITE supersedes TYPE RELATION FROM claim_section TO claim_section SCHEMALESS;
DEFINE FIELD OVERWRITE org ON supersedes TYPE string ASSERT string::len($value) > 0;
DEFINE INDEX OVERWRITE supersedes_org ON supersedes FIELDS org;

-- multi-year continuity
DEFINE TABLE OVERWRITE continues TYPE RELATION FROM project TO project SCHEMALESS;
DEFINE FIELD OVERWRITE org ON continues TYPE string ASSERT string::len($value) > 0;
DEFINE INDEX OVERWRITE continues_org ON continues FIELDS org;

DEFINE INDEX OVERWRITE source_item_ext ON source_item FIELDS org, tax_year, external_id UNIQUE;
DEFINE INDEX OVERWRITE job_status ON job FIELDS status;
