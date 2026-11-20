import type { Metadata } from "next";

import { DroneOperatorDashboardShell } from "@/components/dashboard/drone-operator-dashboard-shell";

export const metadata: Metadata = {
  description: "Tableau de bord droniste SmartSite.",
  title: "Dashboard droniste - SmartSite",
};

export default function DroneOperatorDashboardPage() {
  return <DroneOperatorDashboardShell />;
}
