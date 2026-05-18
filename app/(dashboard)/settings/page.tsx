"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { patchOrganization } from "@/lib/api/organization-update";
import { handleApiError } from "@/lib/api/errors";
import { fetchOrganizationMe } from "@/lib/api/users";
import { useAuthStore } from "@/stores/auth-store";

export default function SettingsPage() {
  const organization = useAuthStore((s) => s.organization);
  const setOrganization = useAuthStore((s) => s.setOrganization);

  const orgQuery = useQuery({
    queryKey: ["organization", "me"],
    queryFn: fetchOrganizationMe,
    enabled: !!organization?.id,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (orgQuery.data) setOrganization(orgQuery.data);
  }, [orgQuery.data, setOrganization]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [businessLocation, setBusinessLocation] = useState("");
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [defaultTaxRate, setDefaultTaxRate] = useState("");
  const [expiryAlertEnabled, setExpiryAlertEnabled] = useState(true);
  const [expiryReminderMonths, setExpiryReminderMonths] = useState("3");
  const [maxStaffDiscountPercent, setMaxStaffDiscountPercent] = useState("");
  const [alertOwnerOnExcessDiscount, setAlertOwnerOnExcessDiscount] = useState(true);
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
    setMaxStaffDiscountPercent(
      organization.maxStaffDiscountPercent != null
        ? String(organization.maxStaffDiscountPercent)
        : "",
    );
    setAlertOwnerOnExcessDiscount(organization.alertOwnerOnExcessDiscount !== false);
  }, [organization]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!organization?.id) {
      toast.error("Missing organization context.");
      return;
    }
    setSaving(true);
    try {
      const updated = await patchOrganization({
        name,
        phone: phone || undefined,
        email: email || undefined,
        businessType: businessType || undefined,
        businessLocation: businessLocation || undefined,
        taxEnabled,
        defaultTaxRate: defaultTaxRate === "" ? undefined : Number(defaultTaxRate),
        expiryAlertEnabled,
        expiryReminderMonths: Number(expiryReminderMonths) || 3,
        maxStaffDiscountPercent:
          maxStaffDiscountPercent === "" ? undefined : Number(maxStaffDiscountPercent),
        alertOwnerOnExcessDiscount,
      });
      setOrganization(updated);
      toast.success("Settings saved");
    } catch (err) {
      toast.error(handleApiError(err));
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
          Business information and rules for{" "}
          <span className="font-medium text-foreground">{organization.name}</span>.
        </p>
      </div>
      {orgQuery.isError ? (
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Could not refresh organization details ({handleApiError(orgQuery.error)}). Showing last known values —
          retry or reload the page.
        </p>
      ) : null}
      <form onSubmit={onSave} className="space-y-6">
        <Card className="border-border/40 bg-card/80 shadow-sm backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium">Business information</CardTitle>
            <CardDescription>How customers and staff see your shop in the hub.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="orgName">Business name</Label>
              <Input
                id="orgName"
                className="min-h-11"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgPhone">Phone</Label>
              <Input id="orgPhone" className="min-h-11" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgEmail">Email</Label>
              <Input
                id="orgEmail"
                className="min-h-11"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bizType">Business type</Label>
              <Input
                id="bizType"
                className="min-h-11"
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
            <CardTitle className="text-base font-medium">Tax</CardTitle>
            <CardDescription>Default tax applied for all sales.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm md:col-span-2">
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
                className="min-h-11"
                inputMode="decimal"
                value={defaultTaxRate}
                onChange={(e) => setDefaultTaxRate(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/80 shadow-sm backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium">Inventory alerts</CardTitle>
            <CardDescription>Get warned before goods go out of date.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={expiryAlertEnabled}
                onChange={(e) => setExpiryAlertEnabled(e.target.checked)}
                className="size-4 rounded border-input"
              />
              Enable expiry alerts
            </label>
            <div className="space-y-2">
              <Label htmlFor="expM">Remind me (months before expiry)</Label>
              <Input
                id="expM"
                className="min-h-11"
                inputMode="numeric"
                value={expiryReminderMonths}
                onChange={(e) => setExpiryReminderMonths(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/80 shadow-sm backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium">Discount limits (staff)</CardTitle>
            <CardDescription>
              Cap how much discount staff can give.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maxDisc">Max discount (%)</Label>
              <Input
                id="maxDisc"
                className="min-h-11"
                inputMode="decimal"
                placeholder="e.g. 10"
                value={maxStaffDiscountPercent}
                onChange={(e) => setMaxStaffDiscountPercent(e.target.value)}
              />
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={alertOwnerOnExcessDiscount}
                onChange={(e) => setAlertOwnerOnExcessDiscount(e.target.checked)}
                className="size-4 rounded border-input"
              />
              Tell me when someone goes over the limit
            </label>
          </CardContent>
        </Card>
        <Button type="submit" disabled={saving} className="min-h-11">
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
