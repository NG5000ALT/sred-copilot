import { EraMcpConnector } from "./era";
import { FixtureConnector } from "./fixture";
import type { SourceConnector } from "./types";

// CONNECTOR=era|fixture. Switching is one env var; both return the same normalized shape.
export function getConnector(companySlug: string): SourceConnector {
  return process.env.CONNECTOR === "era" ? new EraMcpConnector() : new FixtureConnector(companySlug);
}
