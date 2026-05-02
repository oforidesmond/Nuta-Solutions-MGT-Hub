import { PlatformHeader } from "@/components/platform/platform-header";
import { PlatformSidebar } from "@/components/platform/platform-sidebar";
import { PlatformMobileNav } from "@/components/platform/platform-mobile-nav";

export function PlatformShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-zinc-50/90">
      <div className="hidden md:flex">
        <PlatformSidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <PlatformHeader />
        <main className="flex-1 p-4 pb-24 transition-opacity duration-200 md:p-8 md:pb-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
        <PlatformMobileNav />
      </div>
    </div>
  );
}
