// Captures the Era MCP tool list to docs/era-tools.json so the connector and allowlist can be
// checked against real tool names. Usage: pnpm era:tools (needs ERA_*_MCP_URL in .env)
import { writeFileSync } from "node:fs";
import { eraClient } from "@/lib/connectors/era";

const out: Record<string, unknown> = {};
for (const server of ["jira", "slack", "docs"] as const) {
  try {
    const client = await eraClient(server);
    out[server] = (await client.listTools()).tools;
    await client.close();
  } catch (e) {
    out[server] = { error: String(e) };
  }
}
writeFileSync("docs/era-tools.json", JSON.stringify(out, null, 2));
console.log("Wrote docs/era-tools.json");
