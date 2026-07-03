import type {
  SiteManagerDashboardAlertResponseDto,
  SiteManagerDashboardDataSourceResponseDto,
} from "@/generated/api";

export function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    cancelled: "Annulé",
    completed: "Terminé",
    in_progress: "En cours",
    on_hold: "Suspendu",
    planned: "Planifié",
  };

  return labels[status] ?? status;
}

export function formatSeverity(severity: SiteManagerDashboardAlertResponseDto["severity"]): string {
  const labels: Record<SiteManagerDashboardAlertResponseDto["severity"], string> = {
    critical: "Critique",
    high: "Haute",
    low: "Basse",
    medium: "Moyenne",
  };

  return labels[severity];
}

export function formatDataSourceStatus(
  status: SiteManagerDashboardDataSourceResponseDto["status"],
): string {
  const labels: Record<SiteManagerDashboardDataSourceResponseDto["status"], string> = {
    available: "Disponible",
    empty: "Vide",
    unavailable: "Indisponible",
  };

  return labels[status];
}

export function getAlertTone(
  severity: SiteManagerDashboardAlertResponseDto["severity"],
): "danger" | "muted" | "warning" {
  if (severity === "critical" || severity === "high") {
    return "danger";
  }

  return severity === "medium" ? "warning" : "muted";
}

export function getDataSourceTone(
  status: SiteManagerDashboardDataSourceResponseDto["status"],
): "muted" | "success" | "warning" {
  if (status === "available") {
    return "success";
  }

  return status === "empty" ? "muted" : "warning";
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}
