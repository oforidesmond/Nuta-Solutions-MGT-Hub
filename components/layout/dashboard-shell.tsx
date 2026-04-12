import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-zinc-50/90">
      <div className="hidden md:flex">
        <AppSidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main className="flex-1 p-4 pb-24 transition-opacity duration-200 md:p-8 md:pb-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
