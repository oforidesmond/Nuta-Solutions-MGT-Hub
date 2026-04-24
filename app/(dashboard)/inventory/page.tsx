"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  ClipboardList,
  ClipboardPlus,
} from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const cards = [
  {
    href: "/inventory/alerts",
    title: "Low stock alerts",
    description: "See what needs restocking first.",
    icon: AlertTriangle,
  },
  {
    href: "/batches",
    title: "Batches & expiry",
    description: "Track lot numbers and expiry dates.",
    icon: CalendarClock,
  },
  {
    href: "/inventory/adjustments",
    title: "Stock adjustments",
    description: "View adjustment history from the API.",
    icon: ClipboardList,
  },
  {
    href: "/inventory/stock-take",
    title: "Stock take",
    description: "View stock take records from the API.",
    icon: ClipboardPlus,
  },
];

export default function InventoryHubPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
        <p className="text-sm text-muted-foreground">
          Keep an eye on stock levels, batches, and counts for your shop.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map(({ href, title, description, icon: Icon }) => (
          <Link key={href} href={href} className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Card
              className={cn(
                "h-full border-border/40 bg-card/80 shadow-sm backdrop-blur-sm transition-shadow duration-200",
                "hover:shadow-md",
              )}
            >
              <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </div>
                <div className="min-w-0 space-y-1">
                  <CardTitle className="text-base font-semibold group-hover:text-primary">
                    {title}
                  </CardTitle>
                  <CardDescription>{description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
      <Card className="border-dashed border-border/60 bg-muted/10">
        <CardHeader className="flex flex-row items-center gap-3">
          <Boxes className="size-8 text-muted-foreground" aria-hidden />
          <div>
            <CardTitle className="text-base">Tip</CardTitle>
            <CardDescription>
              Add products under <Link className="font-medium text-primary underline-offset-2 hover:underline" href="/products">All products</Link>{" "}
              — this page is for day-to-day stock tasks.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
