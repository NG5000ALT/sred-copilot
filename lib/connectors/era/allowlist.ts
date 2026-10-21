// The only Era MCP tools the app may call. Read-only by design: anything not listed is refused,
// and no tool with a write-sounding name is ever allowed even if added here by mistake.
// UNVERIFIED: names are placeholders until docs/era-tools.json is captured (pnpm era:tools).
export const ERA_TOOL_ALLOWLIST = new Set<string>([
  "jira_search_issues",
  "jira_get_issue",
  "jira_get_comments",
  "slack_list_channels",
  "slack_get_channel_history",
  "slack_get_thread_replies",
  "slack_list_users",
  "drive_search_files",
  "drive_get_file",
  "s3_list_objects",
  "s3_get_object",
]);

const WRITE_WORDS = /(create|update|delete|remove|post|send|write|put|patch|upload|edit|set|add|archive|invite|kick)/i;

export function isAllowedTool(name: string) {
  return ERA_TOOL_ALLOWLIST.has(name) && !WRITE_WORDS.test(name.replace(/^(jira|slack|drive|s3)_/, ""));
}
