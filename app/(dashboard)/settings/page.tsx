"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { patchOrganization } from "@/lib/api/organization-update";
import { useAuthStore } from "@/stores/auth-store";

export default function SettingsPage() {
  const organization = useAuthStore((s) => s.organization);
  const setOrganization = useAuthStore((s) => s.setOrganization);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [businessLocation, setBusinessLocation] = useState("");
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [defaultTaxRate, setDefaultTaxRate] = useState("");
  const [expiryAlertEnabled, setExpiryAlertEnabled] = useState(true);
  const [expiryReminderMonths, setExpiryReminderMonths] = useState("3");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!organization) return;
    setName(organization.name ?? "");
    setPhone(organization.phone ?? "");
    setEmail(organization.email ?? "");
    setBusinessType(organization.businessType ?? "");
    setBusinessLocation(organization.businessLocation ?? "");
    setTaxEnabled(!!organization.taxEnabled);
    setDefaultTaxRate(
      organization.defaultTaxRate != null ? String(organization.defaultTaxRate) : "",
    );
    setExpiryAlertEnabled(organization.expiryAlertEnabled !== false);
    setExpiryReminderMonths(
      organization.expiryReminderMonths != null
        ? String(organization.expiryReminderMonths)
        : "3",
    );
  }, [organization]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!organization?.id) {
      toast.error("Missing organization context.");
      return;
    }
    setSaving(true);
    try {
      const updated = await patchOrganization(organization.id, {
        name,
        phone: phone || undefined,
        email: email || undefined,
        businessType: businessType || undefined,
        businessLocation: businessLocation || undefined,
        taxEnabled,
        defaultTaxRate: defaultTaxRate === "" ? undefined : Number(defaultTaxRate),
        expiryAlertEnabled,
        expiryReminderMonths: Number(expiryReminderMonths) || 3,
      });
      setOrganization(updated);
      toast.success("Settings saved");
    } catch {
      toast.error("Could not save. Confirm PATCH /organizations/:id exists.");
    } finally {
      setSaving(false);
    }
  }

  if (!organization) {
    return (
      <p className="text-sm text-muted-foreground">
        No organization on your account. Complete onboarding or contact support.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Business profile and preferences for{" "}
          <span className="font-medium text-foreground">{organization.name}</span>.
        </p>
      </div>
      <form onSubmit={onSave} className="space-y-6">
        <Card className="border-border/40 bg-card/80 shadow-sm backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium">Business</CardTitle>
            <CardDescription>How your business appears in the hub.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="orgName">Business name</Label>
              <Input
                id="orgName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgPhone">Phone</Label>
              <Input
                id="orgPhone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgEmail">Email</Label>
              <Input
                id="orgEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bizType">Business type</Label>
              <Input
                id="bizType"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="bizLoc">Location</Label>
              <Textarea
                id="bizLoc"
                rows={2}
                value={businessLocation}
                onChange={(e) => setBusinessLocation(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/80 shadow-sm backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium">Preferences</CardTitle>
            <CardDescription>Tax and inventory alerts.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={taxEnabled}
                onChange={(e) => setTaxEnabled(e.target.checked)}
                className="size-4 rounded border-input"
              />
              Enable tax on sales
            </label>
            <div className="space-y-2">
              <Label htmlFor="taxRate">Default tax rate (%)</Label>
              <Input
                id="taxRate"
                inputMode="decimal"
                value={defaultTaxRate}
                onChange={(e) => setDefaultTaxRate(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={expiryAlertEnabled}
                onChange={(e) => setExpiryAlertEnabled(e.target.checked)}
                className="size-4 rounded border-input"
              />
              Expiry alerts enabled
            </label>
            <div className="space-y-2">
              <Label htmlFor="expM">Expiry reminder (months before)</Label>
              <Input
                id="expM"
                inputMode="numeric"
                value={expiryReminderMonths}
                onChange={(e) => setExpiryReminderMonths(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
