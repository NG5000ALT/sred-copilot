import { OrganizationProfile } from "@clerk/nextjs";
import { can, requirePermission } from "@/lib/auth/roles";
import { Button, PageHeader } from "@/components/ui";
import { deleteAllData } from "../actions";

export default async function Settings() {
  const s = await requirePermission("read");
  return (
    <>
      <PageHeader title="Settings" />
      <section>
        <h2 className="font-serif text-xl font-semibold">Members and roles</h2>
        <p className="mt-1 max-w-prose">Owners can do everything. Technical reviewers edit narratives, decide borderline projects and resolve risks. CPAs read everything, resolve risks and export.</p>
        <div className="mt-4"><OrganizationProfile routing="hash" /></div>
      </section>

      {can(s.role, "data:delete") && (
        <section className="mt-12 max-w-xl rounded-lg border border-fail/40 p-5">
          <h2 className="font-semibold text-fail">Delete all company data</h2>
          <p className="mt-1">Permanently removes every record this workspace holds: source items, evidence, drafts, versions, model logs and payroll. This cannot be undone.</p>
          <form action={deleteAllData} className="mt-4 space-y-3">
            <label className="block">
              <span className="text-sm">Type <strong>delete all data</strong> to confirm</span>
              <input name="confirm" required autoComplete="off" className="mt-1 block w-full rounded-md border border-rule px-3 py-2" />
            </label>
            <Button type="submit" variant="danger">Delete all data</Button>
          </form>
        </section>
      )}
    </>
  );
}
