import Link from "next/link";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { Nav } from "@/components/nav";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-6 md:flex-row md:px-6">
      <aside className="md:w-56 md:shrink-0">
        <Link href="/" className="font-serif text-xl font-semibold">SR&amp;ED Copilot</Link>
        <div className="mt-4 flex items-center gap-3">
          <OrganizationSwitcher hidePersonal afterCreateOrganizationUrl="/onboarding" afterSelectOrganizationUrl="/projects" />
          <UserButton />
        </div>
        <Nav />
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
