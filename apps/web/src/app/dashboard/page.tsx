import type { Metadata } from "next";

import { DashboardEntryShell } from "@/components/dashboard/dashboard-entry-shell";

export const metadata: Metadata = {
  description: "Tableau de bord entreprise SmartSite.",
  title: "Dashboard - SmartSite",
};

export default function DashboardPage() {
  return <DashboardEntryShell />;
}
