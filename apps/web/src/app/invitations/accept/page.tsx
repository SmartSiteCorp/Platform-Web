import type { Metadata } from "next";
import { Suspense } from "react";

import { OrganizationInvitationAcceptancePage } from "@/components/organization/organization-invitation-acceptance-page";

export const metadata: Metadata = {
  description: "Acceptation d'une invitation SmartSite.",
  title: "Invitation - SmartSite",
};

export default function InvitationAcceptanceRoute() {
  return (
    <Suspense fallback={null}>
      <OrganizationInvitationAcceptancePage />
    </Suspense>
  );
}
