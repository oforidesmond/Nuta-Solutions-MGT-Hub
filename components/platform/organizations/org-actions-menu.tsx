"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  CheckCircle,
  ExternalLink,
  MoreVertical,
  PauseCircle,
  Sliders,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ManagePlanModal } from "@/components/platform/organizations/manage-plan-modal";
import { SuspendOrganizationModal } from "@/components/platform/organizations/suspend-organization-modal";
import { UnsuspendOrganizationModal } from "@/components/platform/organizations/unsuspend-organization-modal";
import { DeleteOrganizationModal } from "@/components/platform/organizations/delete-organization-modal";
import type { PlatformOrganization } from "@/lib/types/platform";

type OpenModal = null | "plan" | "suspend" | "unsuspend" | "delete";

interface OrgActionsMenuProps {
  org: PlatformOrganization;
  /** "header" renders a labelled outline button; "row" renders an icon-only button. */
  variant?: "header" | "row";
}

export function OrgActionsMenu({ org, variant = "header" }: OrgActionsMenuProps) {
  const [openModal, setOpenModal] = useState<OpenModal>(null);
  const isSuspended = org.planStatus === "SUSPENDED";
  const detailsHref = `/platform/organizations/${org.id}`;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            variant === "row" ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Actions for ${org.name}`}
              />
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                aria-label={`Actions for ${org.name}`}
              />
            )
          }
        >
          {variant === "row" ? (
            <MoreVertical className="size-4" aria-hidden />
          ) : (
            <>
              Actions
              <MoreVertical className="size-4" aria-hidden />
            </>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Manage</DropdownMenuLabel>
            <DropdownMenuItem render={<Link href={detailsHref} />}>
              <ExternalLink className="size-4" aria-hidden />
              View details
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href={`${detailsHref}/activity`} />}>
              <Activity className="size-4" aria-hidden />
              Activity log
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Plan</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setOpenModal("plan")}>
              <Sliders className="size-4" aria-hidden />
              Manage plan
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Status</DropdownMenuLabel>
            {isSuspended ? (
              <DropdownMenuItem onClick={() => setOpenModal("unsuspend")}>
                <CheckCircle className="size-4" aria-hidden />
                Unsuspend
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => setOpenModal("suspend")}>
                <PauseCircle className="size-4" aria-hidden />
                Suspend
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>

          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setOpenModal("delete")}
            >
              <Trash2 className="size-4" aria-hidden />
              Delete organization
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <ManagePlanModal
        org={org}
        open={openModal === "plan"}
        onOpenChange={(o) => setOpenModal(o ? "plan" : null)}
      />
      <SuspendOrganizationModal
        org={org}
        open={openModal === "suspend"}
        onOpenChange={(o) => setOpenModal(o ? "suspend" : null)}
      />
      <UnsuspendOrganizationModal
        org={org}
        open={openModal === "unsuspend"}
        onOpenChange={(o) => setOpenModal(o ? "unsuspend" : null)}
      />
      <DeleteOrganizationModal
        org={org}
        open={openModal === "delete"}
        onOpenChange={(o) => setOpenModal(o ? "delete" : null)}
      />
    </>
  );
}
