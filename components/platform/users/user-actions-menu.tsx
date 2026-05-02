"use client";

import { useState } from "react";
import Link from "next/link";
import { Ban, KeyRound, MoreVertical, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeactivateUserModal } from "@/components/platform/users/deactivate-user-modal";
import { ResetPasswordUserModal } from "@/components/platform/users/reset-password-user-modal";
import type { PlatformUser } from "@/lib/types/platform";

type OpenModal = null | "deactivate" | "reset";

interface UserActionsMenuProps {
  user: PlatformUser;
  variant?: "row" | "header";
}

function displayName(user: PlatformUser): string {
  const n = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return n || user.email || user.id.slice(0, 8);
}

export function UserActionsMenu({ user, variant = "row" }: UserActionsMenuProps) {
  const [openModal, setOpenModal] = useState<OpenModal>(null);
  const name = displayName(user);
  const detailHref = `/platform/users/${user.id}`;
  const canDeactivate =
    Boolean(user.organizationId) && user.isActive && user.role !== "SUPER_ADMIN";
  const inactive = !user.isActive;

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
                aria-label={`Actions for ${name}`}
              />
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                aria-label={`Actions for ${name}`}
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
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem render={<Link href={detailHref} />}>
            <ExternalLink className="size-4" aria-hidden />
            View profile
          </DropdownMenuItem>
          {user.organization ? (
            <DropdownMenuItem render={<Link href={`/platform/organizations/${user.organization.id}`} />}>
              Organization
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setOpenModal("reset")}>
            <KeyRound className="size-4" aria-hidden />
            Reset password
          </DropdownMenuItem>
          {inactive ? null : canDeactivate ? (
            <DropdownMenuItem variant="destructive" onClick={() => setOpenModal("deactivate")}>
              <Ban className="size-4" aria-hidden />
              Deactivate
            </DropdownMenuItem>
          ) : user.organizationId === null || user.organizationId === undefined ? (
            <DropdownMenuItem disabled title="Cannot deactivate platform accounts here">
              <Ban className="size-4" aria-hidden />
              Deactivate
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <DeactivateUserModal
        user={{ id: user.id, displayName: name, organizationId: user.organizationId }}
        open={openModal === "deactivate"}
        onOpenChange={(o) => setOpenModal(o ? "deactivate" : null)}
      />
      <ResetPasswordUserModal
        user={{ id: user.id, displayName: name }}
        open={openModal === "reset"}
        onOpenChange={(o) => setOpenModal(o ? "reset" : null)}
      />
    </>
  );
}
