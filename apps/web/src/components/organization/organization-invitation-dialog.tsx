"use client";

import { UserPlus, X } from "lucide-react";
import { useEffect, useState } from "react";

import {
  OrganizationInvitationForm,
  type OrganizationInvitationSubmitter,
} from "@/components/organization/organization-invitation-form";
import { Button } from "@/components/ui/button";

interface OrganizationInvitationDialogProps {
  readonly organizationId: string;
  readonly submitOrganizationInvitation: OrganizationInvitationSubmitter;
}

export function OrganizationInvitationDialog({
  organizationId,
  submitOrganizationInvitation,
}: OrganizationInvitationDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  useCloseInvitationDialogOnEscape(isOpen, () => {
    setIsOpen(false);
  });

  return (
    <>
      <Button
        onClick={() => {
          setIsOpen(true);
        }}
      >
        <UserPlus aria-hidden="true" className="h-4 w-4" />
        Inviter un utilisateur
      </Button>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-foreground/35"
            onClick={() => {
              setIsOpen(false);
            }}
          />
          <section
            aria-labelledby="organization-invitation-dialog-title"
            aria-modal="true"
            className="relative max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-lg border-2 border-border bg-card p-5 text-card-foreground shadow-xl"
            role="dialog"
          >
            <header className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2
                  className="text-lg font-semibold tracking-normal"
                  id="organization-invitation-dialog-title"
                >
                  Inviter un utilisateur
                </h2>
              </div>
              <button
                aria-label="Fermer l'invitation"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/25"
                onClick={() => {
                  setIsOpen(false);
                }}
                type="button"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </header>
            <OrganizationInvitationForm
              organizationId={organizationId}
              submitOrganizationInvitation={submitOrganizationInvitation}
            />
          </section>
        </div>
      ) : null}
    </>
  );
}

function useCloseInvitationDialogOnEscape(isOpen: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen, onClose]);
}
