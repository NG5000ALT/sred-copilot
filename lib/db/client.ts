import { readFileSync } from "node:fs";
import path from "node:path";
import { createNodeEngines } from "@surrealdb/node";
import { Surreal, createRemoteEngines } from "surrealdb";

// Cached on globalThis: Next bundles instrumentation and routes separately, and dev reloads
// re-evaluate modules, but an embedded database must be opened once per process.
const g = globalThis as { __sredDb?: Promise<Surreal> | null };

async function connect(): Promise<Surreal> {
  const url = process.env.SURREAL_URL || "mem://";
  const db = new Surreal({ engines: { ...createRemoteEngines(), ...createNodeEngines() } });
  const embedded = /^(mem|surrealkv|rocksdb)/.test(url);
  await db.connect(url, embedded || !process.env.SURREAL_USER
    ? undefined
    : { authentication: { username: process.env.SURREAL_USER, password: process.env.SURREAL_PASS ?? "" } });
  await db.use({ namespace: process.env.SURREAL_NS || "sred", database: process.env.SURREAL_DB || "app" });
  await db.query(readFileSync(path.join(process.cwd(), "lib/db/schema.surql"), "utf8"));
  return db;
}

// One connection per process; the schema is applied idempotently on first use.
export function getDb(): Promise<Surreal> {
  g.__sredDb ??= connect().catch((e) => {
    g.__sredDb = null;
    throw e;
  });
  return g.__sredDb;
}

export async function closeDb() {
  if (!g.__sredDb) return;
  const db = await g.__sredDb;
  g.__sredDb = null;
  await db.close();
}
