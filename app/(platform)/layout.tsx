import { PlatformAuthGate } from "@/components/auth/platform-auth-gate";
import { PlatformShell } from "@/components/platform/platform-shell";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PlatformAuthGate>
      <PlatformShell>{children}</PlatformShell>
    </PlatformAuthGate>
  );
}
