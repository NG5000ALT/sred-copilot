export type SourceKind = "jira_issue" | "jira_comment" | "slack_message" | "doc_page" | "commit";

export type NormalizedPerson = {
  external_id: string; // stable id, also the payroll person_id
  name: string;
  title: string;
  jira?: string;
  slack?: string;
};

export type NormalizedSourceItem = {
  external_id: string; // "LV-118", "LV-118#c2", "slack:C02:1767312000.000100", "doc:a1-experiment-log"
  kind: SourceKind;
  url: string;
  author: string | null; // person external_id
  created_at: string; // ISO
  title?: string;
  body: string;
  epic_key?: string | null; // Jira epic this item belongs to (issues and their comments)
  issue_type?: "epic" | "story" | "task" | "bug";
  assignee?: string | null;
  parent?: string | null; // comment -> issue key, slack reply -> thread root ts
  channel?: string;
};

// Read-only by design: there is no write method on any connector.
export interface SourceConnector {
  listPeople(): Promise<NormalizedPerson[]>;
  listSourceItems(range: { start: Date; end: Date }): AsyncIterable<NormalizedSourceItem>;
  getItem(externalId: string): Promise<NormalizedSourceItem | null>; // used by the agent loop
  searchDocs?(query: string): Promise<NormalizedSourceItem[]>;
  getThread?(externalId: string): Promise<NormalizedSourceItem[]>;
}
