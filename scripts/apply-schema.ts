// Applies lib/db/schema.surql to SURREAL_URL (it is also applied automatically on first connect).
import { closeDb, getDb } from "@/lib/db/client";

await getDb();
console.log(`Schema applied to ${process.env.SURREAL_URL}`);
await closeDb();
