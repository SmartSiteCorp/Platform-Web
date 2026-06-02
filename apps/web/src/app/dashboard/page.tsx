import type { Metadata } from "next";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export const metadata: Metadata = {
  description: "Tableau de bord entreprise SmartSite.",
  title: "Dashboard - SmartSite",
};

export default function DashboardPage() {
  return <DashboardShell />;
}
