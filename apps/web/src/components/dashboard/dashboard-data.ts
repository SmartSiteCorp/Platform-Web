import type { LucideIcon } from "lucide-react";

export interface DashboardStat {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly tone: "default" | "success" | "warning" | "danger";
  readonly value: string;
}
