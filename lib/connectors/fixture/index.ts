import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { NormalizedPerson, NormalizedSourceItem, SourceConnector } from "../types";

// Reads the same normalized shape the Era connector produces, from fixtures/<slug>/*.json.
export class FixtureConnector implements SourceConnector {
  private items: NormalizedSourceItem[];
  private people: NormalizedPerson[];
  private dir: string;

  constructor(slug: string, root = path.join(process.cwd(), "fixtures")) {
    if (!/^[a-z0-9-]+$/.test(slug)) throw new Error(`Bad fixture slug ${slug}`);
    this.dir = path.join(root, slug);
    const read = (f: string) => JSON.parse(readFileSync(path.join(this.dir, f), "utf8"));
    this.people = read("people.json").people;
    this.items = ["jira.json", "slack.json", "docs.json"].flatMap((f) => read(f).items as NormalizedSourceItem[]);
  }

  async listPeople() {
    return this.people;
  }

  async *listSourceItems(range: { start: Date; end: Date }) {
    const s = range.start.toISOString(), e = range.end.toISOString();
    for (const i of this.items) if (i.created_at >= s && i.created_at <= e) yield i;
  }

  async getItem(externalId: string) {
    return this.items.find((i) => i.external_id === externalId) ?? null;
  }

  async getThread(externalId: string) {
    const root = await this.getItem(externalId);
    if (!root || root.kind !== "slack_message") return root ? [root] : [];
    const rootTs = root.parent ?? root.external_id.split(":")[2];
    return this.items.filter((i) => i.kind === "slack_message" && i.channel === root.channel &&
      (i.external_id.endsWith(`:${rootTs}`) || i.parent === rootTs));
  }

  async payrollCsv() {
    const f = path.join(this.dir, "payroll.csv");
    return existsSync(f) ? readFileSync(f, "utf8") : null;
  }

  async searchDocs(query: string) {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return this.items.filter((i) => i.kind === "doc_page" && terms.some((t) => `${i.title} ${i.body}`.toLowerCase().includes(t))).slice(0, 5);
  }
}
