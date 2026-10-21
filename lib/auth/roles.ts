import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { repo, type Repo } from "@/lib/db/repo";

export type Role = "owner" | "tech_reviewer" | "cpa";
export type Permission =
  | "read" | "analyze" | "narrative:edit" | "project:decide" | "risk:resolve"
  | "expenditure:edit" | "export" | "claim:freeze" | "data:delete" | "sources:edit";

const PERMISSIONS: Record<Role, Permission[]> = {
  owner: ["read", "analyze", "narrative:edit", "project:decide", "risk:resolve", "expenditure:edit", "export", "claim:freeze", "data:delete", "sources:edit"],
  tech_reviewer: ["read", "narrative:edit", "project:decide", "risk:resolve"],
  cpa: ["read", "risk:resolve", "export"],
};

// Clerk's built-in org:admin is our owner.
export function toRole(orgRole: string | null | undefined): Role | null {
  if (orgRole === "org:admin" || orgRole === "org:owner") return "owner";
  if (orgRole === "org:tech_reviewer") return "tech_reviewer";
  if (orgRole === "org:cpa") return "cpa";
  return null;
}

export const can = (role: Role, p: Permission) => PERMISSIONS[role].includes(p);

export type Session = { userId: string; orgId: string; role: Role; repo: Repo };

/** Server-side gate for every page, route and action. Redirects or throws; never trusts the UI. */
export async function requirePermission(p: Permission, opts: { redirectOnMissingOrg?: boolean } = { redirectOnMissingOrg: true }): Promise<Session> {
  const a = await auth();
  if (!a.userId) redirect("/sign-in");
  if (!a.orgId) {
    if (opts.redirectOnMissingOrg) redirect("/onboarding");
    throw new Error("No organization selected");
  }
  const role = toRole(a.orgRole);
  if (!role || !can(role, p)) throw new Error(`Forbidden: ${p} needs a different role`);
  return { userId: a.userId, orgId: a.orgId, role, repo: repo(a.orgId) };
}
