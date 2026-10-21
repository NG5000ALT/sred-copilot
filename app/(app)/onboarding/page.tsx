import { auth } from "@clerk/nextjs/server";
import { CreateOrganization } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { repo } from "@/lib/db/repo";
import { workspace } from "@/lib/data";
import { Button, PageHeader } from "@/components/ui";
import { createCompany } from "../actions";

export default async function Onboarding() {
  const a = await auth();
  if (!a.userId) redirect("/sign-in");
  if (!a.orgId) {
    return (
      <>
        <PageHeader title="Create your company workspace" />
        <p className="mb-6 max-w-prose">A workspace holds one company&apos;s claim. You become its owner and can invite a technical reviewer and your CPA.</p>
        <CreateOrganization afterCreateOrganizationUrl="/onboarding" skipInvitationScreen />
      </>
    );
  }
  const { company } = await workspace(repo(a.orgId));
  if (company) redirect("/sources");

  return (
    <>
      <PageHeader title="Choose a demo company" />
      <form action={createCompany} className="max-w-xl space-y-6">
        <fieldset className="space-y-3">
          <legend className="mb-2 font-medium">Company records to analyze</legend>
          <label className="flex gap-3 rounded-lg border border-rule p-4 has-[:checked]:border-accent">
            <input type="radio" name="dataset" value="lakeshore-vision" defaultChecked className="mt-1" />
            <span><span className="font-medium">Lakeshore Vision Inc.</span><br />Toronto, 18 people. Computer-vision inspection software.</span>
          </label>
          <label className="flex gap-3 rounded-lg border border-rule p-4 has-[:checked]:border-accent">
            <input type="radio" name="dataset" value="bayfront-bio" className="mt-1" />
            <span><span className="font-medium">Bayfront Biologics Inc.</span><br />Hamilton, 12 people. Enzyme reagents for diagnostic labs.</span>
          </label>
        </fieldset>
        <label className="block">
          <span className="font-medium">Tax year</span>
          <select name="year" defaultValue="2026" className="mt-2 block rounded-md border border-rule px-3 py-2">
            <option value="2026">2026 (January 1 to December 31)</option>
          </select>
        </label>
        <p className="text-sm text-meta">Both companies are fictional. Their records were generated for this demo.</p>
        <Button type="submit">Create company</Button>
      </form>
    </>
  );
}
