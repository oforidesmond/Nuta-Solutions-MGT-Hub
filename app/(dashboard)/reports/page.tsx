import Link from "next/link";
import { DevicePerformanceSection } from "@/components/reports/device-performance-section";

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports & analytics</h1>
        <p className="text-sm text-muted-foreground">
          Business reporting plus device health from the staff app.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Full crash tables and filters:{" "}
          <Link href="/operations/mobile-crashes" className="font-medium text-foreground underline underline-offset-2">
            Mobile crash reports
          </Link>{" "}
          (admin and manager).
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium tracking-tight">Device performance</h2>
        <DevicePerformanceSection />
      </section>

      <section className="space-y-3 rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-8 text-center">
        <p className="text-sm font-medium text-foreground">More reports coming soon</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Sales trends, profit and loss, inventory aging, and staff performance summaries.
        </p>
      </section>
    </div>
  );
}
