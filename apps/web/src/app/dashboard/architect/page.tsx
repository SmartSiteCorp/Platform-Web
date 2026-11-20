import type { Metadata } from "next";

import { ArchitectDashboardShell } from "@/components/dashboard/architect-dashboard-shell";

export const metadata: Metadata = {
  description: "Tableau de bord architecte SmartSite.",
  title: "Dashboard architecte - SmartSite",
};

export default function ArchitectDashboardPage() {
  return <ArchitectDashboardShell />;
}
