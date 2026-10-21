import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { NormalizedPerson, NormalizedSourceItem, SourceConnector } from "../types";
import { isAllowedTool } from "./allowlist";

// UNVERIFIED: written before Era access. Tool names and response shapes are placeholders until
// docs/era-tools.json is captured with `pnpm era:tools`. Bulk ingest is deterministic code
// (paginate, filter by date); the model never drives it. Every call passes the allowlist.

type Server = "jira" | "slack" | "docs";
const URLS: Record<Server, string | undefined> = {
  jira: process.env.ERA_JIRA_MCP_URL,
  slack: process.env.ERA_SLACK_MCP_URL,
  docs: process.env.ERA_DOCS_MCP_URL,
};

export async function eraClient(server: Server): Promise<Client> {
  const url = URLS[server];
  if (!url) throw new Error(`ERA_${server.toUpperCase()}_MCP_URL is not set`);
  const client = new Client({ name: "sred-copilot", version: "0.1.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(url), {
    requestInit: { headers: process.env.ERA_API_KEY ? { Authorization: `Bearer ${process.env.ERA_API_KEY}` } : {} },
  }));
  return client;
}

export class EraMcpConnector implements SourceConnector {
  private clients = new Map<Server, Promise<Client>>();

  private async call(server: Server, name: string, args: Record<string, unknown>): Promise<unknown> {
    if (!isAllowedTool(name)) throw new Error(`Era tool not on read-only allowlist: ${name}`);
    if (!this.clients.has(server)) this.clients.set(server, eraClient(server));
    const res = await (await this.clients.get(server)!).callTool({ name, arguments: args });
    const content = (res.content as { type: string; text?: string }[] | undefined) ?? [];
    const text = content.find((c) => c.type === "text")?.text ?? "null";
    try { return JSON.parse(text); } catch { return text; }
  }

  async listPeople(): Promise<NormalizedPerson[]> {
    const users = (await this.call("slack", "slack_list_users", {})) as { id: string; name: string; real_name?: string; title?: string }[];
    return (users ?? []).map((u) => ({ external_id: u.name, name: u.real_name ?? u.name, title: u.title ?? "", slack: u.id }));
  }

  async *listSourceItems(range: { start: Date; end: Date }): AsyncIterable<NormalizedSourceItem> {
    const jql = `updated >= "${range.start.toISOString().slice(0, 10)}" AND created <= "${range.end.toISOString().slice(0, 10)}"`;
    for (let startAt = 0; ; startAt += 50) {
      const page = (await this.call("jira", "jira_search_issues", { jql, startAt, maxResults: 50 })) as { issues?: JiraIssue[] };
      const issues = page?.issues ?? [];
      for (const i of issues) yield* jiraToItems(i);
      if (issues.length < 50) break;
    }
    const channels = (await this.call("slack", "slack_list_channels", {})) as { id: string; name: string }[];
    for (const ch of channels ?? []) {
      const msgs = (await this.call("slack", "slack_get_channel_history", {
        channel: ch.id, oldest: range.start.getTime() / 1000, latest: range.end.getTime() / 1000,
      })) as SlackMessage[];
      for (const m of msgs ?? []) yield slackToItem(ch, m);
    }
  }

  async getItem(externalId: string): Promise<NormalizedSourceItem | null> {
    if (/^[A-Z]+-\d+$/.test(externalId)) {
      const issue = (await this.call("jira", "jira_get_issue", { issueKey: externalId })) as JiraIssue | null;
      return issue ? jiraToItems(issue)[0] : null;
    }
    if (externalId.startsWith("doc:")) {
      const f = (await this.call("docs", "drive_get_file", { fileId: externalId.slice(4) })) as DriveFile | null;
      return f ? driveToItem(f) : null;
    }
    return null;
  }

  async getThread(externalId: string): Promise<NormalizedSourceItem[]> {
    const [, channel, ts] = externalId.split(":");
    const msgs = (await this.call("slack", "slack_get_thread_replies", { channel, ts })) as SlackMessage[];
    return (msgs ?? []).map((m) => slackToItem({ id: channel, name: channel }, m));
  }

  async searchDocs(query: string): Promise<NormalizedSourceItem[]> {
    const files = (await this.call("docs", "drive_search_files", { query })) as DriveFile[];
    return (files ?? []).slice(0, 5).map(driveToItem);
  }
}

type JiraIssue = {
  key: string; self?: string;
  fields: { summary: string; description?: string; created: string; issuetype?: { name: string }; assignee?: { name?: string } | null;
    parent?: { key: string }; comment?: { comments: { id: string; author?: { name?: string }; created: string; body: string }[] } };
};
type SlackMessage = { ts: string; user?: string; text: string; thread_ts?: string };
type DriveFile = { id: string; name: string; createdTime: string; owner?: string; content?: string; webViewLink?: string };

function jiraToItems(i: JiraIssue): NormalizedSourceItem[] {
  const type = i.fields.issuetype?.name?.toLowerCase();
  const epic = type === "epic" ? i.key : i.fields.parent?.key ?? null;
  const issue: NormalizedSourceItem = {
    external_id: i.key, kind: "jira_issue", url: i.self ?? "", author: i.fields.assignee?.name ?? null, assignee: i.fields.assignee?.name ?? null,
    created_at: new Date(i.fields.created).toISOString(), title: i.fields.summary, body: i.fields.description ?? "", epic_key: epic,
    issue_type: (["epic", "story", "task", "bug"].includes(type ?? "") ? type : "task") as NormalizedSourceItem["issue_type"],
  };
  const comments = (i.fields.comment?.comments ?? []).map((c, n): NormalizedSourceItem => ({
    external_id: `${i.key}#c${n + 1}`, kind: "jira_comment", url: issue.url, author: c.author?.name ?? null,
    created_at: new Date(c.created).toISOString(), body: c.body, epic_key: epic, parent: i.key,
  }));
  return [issue, ...comments];
}

function slackToItem(ch: { id: string; name: string }, m: SlackMessage): NormalizedSourceItem {
  return {
    external_id: `slack:${ch.id}:${m.ts}`, kind: "slack_message", url: "", author: m.user ?? null,
    created_at: new Date(Number(m.ts) * 1000).toISOString(), body: m.text, channel: ch.name,
    parent: m.thread_ts && m.thread_ts !== m.ts ? m.thread_ts : null,
  };
}

function driveToItem(f: DriveFile): NormalizedSourceItem {
  return {
    external_id: `doc:${f.id}`, kind: "doc_page", url: f.webViewLink ?? "", author: f.owner ?? null,
    created_at: new Date(f.createdTime).toISOString(), title: f.name, body: f.content ?? "",
  };
}
