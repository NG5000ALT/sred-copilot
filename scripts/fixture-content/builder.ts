import type { NormalizedPerson, NormalizedSourceItem } from "@/lib/connectors/types";

// Small helpers for authoring synthetic fixtures. Dates are "YYYY-MM-DD HH:mm" in UTC.
export class Builder {
  items: NormalizedSourceItem[] = [];
  private commentCount = new Map<string, number>();
  constructor(private host: string, private channels: Record<string, string>) {}

  private iso(d: string) {
    return new Date(d.replace(" ", "T") + ":00Z").toISOString();
  }

  epic(key: string, title: string, assignee: string, date: string, body: string) {
    this.issue(key, key, title, assignee, date, body, "epic");
  }

  issue(key: string, epic: string | null, title: string, assignee: string, date: string, body: string, type: "epic" | "story" | "task" | "bug" = "story") {
    this.items.push({
      external_id: key, kind: "jira_issue", url: `https://${this.host}/jira/browse/${key}`,
      author: assignee, assignee, created_at: this.iso(date), title, body, epic_key: epic, issue_type: type,
    });
  }

  comment(key: string, author: string, date: string, body: string) {
    const n = (this.commentCount.get(key) ?? 0) + 1;
    this.commentCount.set(key, n);
    const issue = this.items.find((i) => i.external_id === key);
    this.items.push({
      external_id: `${key}#c${n}`, kind: "jira_comment", url: `https://${this.host}/jira/browse/${key}?focusedComment=${n}`,
      author, created_at: this.iso(date), body, epic_key: issue?.epic_key ?? null, parent: key,
    });
  }

  // Returns the message ts so replies can thread under it.
  msg(channel: string, author: string, date: string, text: string, thread?: string): string {
    const base = Date.parse(this.iso(date)) / 1000;
    let ts = `${base}.000100`;
    for (let i = 2; this.items.some((x) => x.external_id === `slack:${this.channels[channel]}:${ts}`); i++) ts = `${base}.00010${i}`;
    this.items.push({
      external_id: `slack:${this.channels[channel]}:${ts}`, kind: "slack_message",
      url: `https://${this.host}/slack/archives/${this.channels[channel]}/p${ts.replace(".", "")}`,
      author, created_at: this.iso(date), body: text, channel, parent: thread ?? null,
    });
    return ts;
  }

  doc(slug: string, title: string, author: string, date: string, body: string) {
    this.items.push({
      external_id: `doc:${slug}`, kind: "doc_page", url: `https://${this.host}/drive/${slug}`,
      author, created_at: this.iso(date), title, body,
    });
  }
}

export type CompanyFixture = {
  slug: string;
  company: { name: string; industry: string; city: string; size: number; fiscal_year_end: string; description: string };
  people: (NormalizedPerson & { salary: number; employment_type: "employee" | "contractor"; arm_length: boolean; specified_employee: boolean })[];
  build: () => Builder;
};
