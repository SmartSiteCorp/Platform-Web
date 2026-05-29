import { AlertTriangle, Building2, CheckCircle2, Clock, HardHat, Radar, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface DashboardStat {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly tone: "default" | "success" | "warning" | "danger";
  readonly value: string;
}

export interface DashboardTask {
  readonly label: string;
  readonly status: "En cours" | "Planifié" | "Bloqué";
}

export const dashboardStats: readonly DashboardStat[] = [
  { icon: Building2, label: "Chantiers actifs", tone: "default", value: "4" },
  { icon: CheckCircle2, label: "Progression moyenne", tone: "success", value: "68%" },
  { icon: Users, label: "Intervenants", tone: "default", value: "27" },
  { icon: AlertTriangle, label: "Alertes critiques", tone: "danger", value: "2" },
];

export const moduleStats: readonly DashboardStat[] = [
  { icon: HardHat, label: "Tâches terrain", tone: "success", value: "42" },
  { icon: Radar, label: "Missions drone", tone: "warning", value: "6" },
  { icon: Clock, label: "Retard prédit", tone: "danger", value: "12%" },
];

export const dashboardTasks: readonly DashboardTask[] = [
  { label: "Validation isolation mur nord", status: "En cours" },
  { label: "Scan LiDAR pièce principale", status: "Planifié" },
  { label: "Contrôle humidité avant pose isolant", status: "Bloqué" },
];
