import { readFileSync } from "node:fs";
import path from "node:path";
import { createNodeEngines } from "@surrealdb/node";
import { Surreal, createRemoteEngines } from "surrealdb";

let pending: Promise<Surreal> | null = null;

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
  pending ??= connect().catch((e) => {
    pending = null;
    throw e;
  });
  return pending;
}

export async function closeDb() {
  if (!pending) return;
  const db = await pending;
  pending = null;
  await db.close();
}
