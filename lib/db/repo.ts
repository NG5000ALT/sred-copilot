import { StringRecordId } from "surrealdb";
import { getDb } from "./client";

// The only door to the database. Every call is scoped to one org: org is injected on
// write and filtered on read, and $org is always a bound parameter, never interpolated.

export const TABLES = [
  "company", "tax_year", "person", "source_item", "evidence", "project", "criteria_assessment",
  "claim_section", "expenditure_line", "risk_flag", "model_run", "job", "eval_result",
  "supports", "worked_on", "cites", "supersedes", "continues",
] as const;
export type Table = (typeof TABLES)[number];
export type Row = { id: string; org: string; [k: string]: unknown };
export type Where = Record<string, unknown>;

const FIELD = /^[a-z_][a-z0-9_.]*$/;
const RECORD_FIELDS = new Set(["in", "out"]);

function table(t: string): Table {
  if (!(TABLES as readonly string[]).includes(t)) throw new Error(`Unknown table ${t}`);
  return t as Table;
}
const rid = (id: string) => new StringRecordId(id);
const tableOf = (id: string) => table(id.split(":")[0]);

function whereClause(where: Where, vars: Record<string, unknown>) {
  const parts = ["org = $org"];
  Object.entries(where).forEach(([k, v], i) => {
    if (!FIELD.test(k)) throw new Error(`Bad field ${k}`);
    const name = `w${i}`;
    if (Array.isArray(v)) {
      vars[name] = RECORD_FIELDS.has(k) ? v.map((x) => rid(String(x))) : v;
      parts.push(`${k} IN $${name}`);
    } else if (v === null) {
      parts.push(`(${k} IS NONE OR ${k} = NULL)`);
    } else {
      vars[name] = RECORD_FIELDS.has(k) ? rid(String(v)) : v;
      parts.push(`${k} = $${name}`);
    }
  });
  return parts.join(" AND ");
}

async function q<T = unknown>(sql: string, vars: Record<string, unknown>): Promise<T[]> {
  const db = await getDb();
  const res = (await db.query(sql, vars).json()) as unknown[];
  return res[res.length - 1] as T[];
}

export function repo(orgId: string) {
  if (typeof orgId !== "string" || !orgId.trim()) throw new Error("repo: orgId is required");
  const org = orgId;

  return {
    org,

    async create<T extends Row = Row>(t: Table, data: Record<string, unknown>): Promise<T> {
      const [row] = await q<T>(`CREATE ${table(t)} CONTENT $data RETURN AFTER`, { data: { ...data, org } });
      return row;
    },

    async createMany(t: Table, rows: Record<string, unknown>[]): Promise<Row[]> {
      if (!rows.length) return [];
      return q<Row>(`INSERT INTO ${table(t)} $rows RETURN AFTER`, { rows: rows.map((r) => ({ ...r, org })) });
    },

    async get<T extends Row = Row>(id: string): Promise<T | null> {
      tableOf(id);
      const [row] = await q<T>("SELECT * FROM $id WHERE org = $org", { id: rid(id), org });
      return row ?? null;
    },

    async list<T extends Row = Row>(t: Table, where: Where = {}, opts: { orderBy?: string; desc?: boolean; limit?: number } = {}): Promise<T[]> {
      const vars: Record<string, unknown> = { org };
      let sql = `SELECT * FROM ${table(t)} WHERE ${whereClause(where, vars)}`;
      if (opts.orderBy) {
        if (!FIELD.test(opts.orderBy)) throw new Error(`Bad field ${opts.orderBy}`);
        sql += ` ORDER BY ${opts.orderBy} ${opts.desc ? "DESC" : "ASC"}`;
      }
      if (opts.limit) sql += ` LIMIT ${Math.floor(opts.limit)}`;
      return q<T>(sql, vars);
    },

    async count(t: Table, where: Where = {}): Promise<number> {
      const vars: Record<string, unknown> = { org };
      const [r] = await q<{ n: number }>(`SELECT count() AS n FROM ${table(t)} WHERE ${whereClause(where, vars)} GROUP ALL`, vars);
      return r?.n ?? 0;
    },

    async update<T extends Row = Row>(id: string, patch: Record<string, unknown>): Promise<T | null> {
      tableOf(id);
      const { org: _ignored, id: _id, ...rest } = patch;
      const [row] = await q<T>("UPDATE $id MERGE $patch WHERE org = $org RETURN AFTER", { id: rid(id), patch: rest, org });
      return row ?? null;
    },

    async remove(t: Table, where: Where = {}): Promise<void> {
      const vars: Record<string, unknown> = { org };
      await q(`DELETE ${table(t)} WHERE ${whereClause(where, vars)}`, vars);
    },

    // Graph edge. Both ends must belong to this org.
    async relate(from: string, edge: Table, to: string, data: Record<string, unknown> = {}): Promise<Row> {
      const [a, b] = await Promise.all([this.get(from), this.get(to)]);
      if (!a || !b) throw new Error(`relate: ${from} or ${to} not found in org`);
      const [row] = await q<Row>(`RELATE $from->${table(edge)}->$to CONTENT $data RETURN AFTER`, {
        from: rid(from), to: rid(to), data: { ...data, org },
      });
      return row;
    },

    async deleteAllOrgData(): Promise<void> {
      for (const t of TABLES) await q(`DELETE ${t} WHERE org = $org`, { org });
    },
  };
}
export type Repo = ReturnType<typeof repo>;

// System-level (cross-org) job claim for the worker. Returns the claimed job with its org,
// so the caller can then work through repo(job.org).
export async function claimNextJob(): Promise<Row | null> {
  const [next] = await q<Row>("SELECT * FROM job WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1", {});
  if (!next) return null;
  const [claimed] = await q<Row>(
    "UPDATE $id SET status = 'running', updated_at = <string>time::now() WHERE status = 'queued' RETURN AFTER",
    { id: rid(next.id) },
  );
  return claimed ?? null;
}
