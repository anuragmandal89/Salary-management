import Link from "next/link";
import { SidebarNav } from "@/components/sidebar-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r bg-sidebar text-sidebar-foreground md:flex md:flex-col">
        <div className="flex h-14 items-center border-b px-5">
          <Link href="/employees" className="text-sm font-semibold tracking-tight">
            Salary Management
          </Link>
        </div>
        <SidebarNav />
        <div className="mt-auto px-5 py-4 text-xs text-muted-foreground">
          HR workspace
        </div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-background px-6 md:justify-end">
          <Link
            href="/employees"
            className="text-sm font-semibold md:hidden"
          >
            Salary Management
          </Link>
          <div className="text-xs text-muted-foreground">
            10k-employee dataset
          </div>
        </header>
        <div className="flex-1 p-6">{children}</div>
      </main>
    </div>
  );
}
