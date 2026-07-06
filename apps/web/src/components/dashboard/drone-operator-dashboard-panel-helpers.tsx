import type { UrlObject } from "url";

import type {
  DroneOperatorDroneResponseDto,
  DroneOperatorMissionResponseDto,
  DroneOperatorTechnicalAlertResponseDto,
} from "@/generated/api";

type BadgeTone = "danger" | "default" | "muted" | "success" | "warning";

export function Metric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="rounded-md bg-muted px-3 py-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  );
}

export function EmptyPanelMessage({ message }: { readonly message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export function formatBattery(value: number | null | undefined): string {
  return typeof value === "number" ? `${String(value)}%` : "Non disponible";
}

export function formatConnectionStatus(
  status: DroneOperatorDroneResponseDto["connectionStatus"],
): string {
  const labels: Record<DroneOperatorDroneResponseDto["connectionStatus"], string> = {
    connected: "Connecté",
    offline: "Hors ligne",
    standby: "En attente",
    unknown: "Inconnu",
  };

  return labels[status];
}

export function formatDataSourceStatus(status: string): string {
  const labels: Record<string, string> = {
    available: "Disponible",
    empty: "Vide",
    unavailable: "Indisponible",
  };

  return labels[status] ?? status;
}

export function formatDuration(value: number | null | undefined): string {
  return typeof value === "number" ? `${String(value)} min` : "À confirmer";
}

export function formatTechnicalAlertSeverity(
  severity: DroneOperatorTechnicalAlertResponseDto["severity"],
): string {
  return severity === "critical" ? "Critique" : "Avertissement";
}

export function getBatteryTone(value: number | null | undefined): BadgeTone {
  if (typeof value !== "number") {
    return "muted";
  }

  return value < 25 ? "danger" : "success";
}

export function getConnectionTone(
  status: DroneOperatorDroneResponseDto["connectionStatus"],
): BadgeTone {
  if (status === "connected") {
    return "success";
  }

  return status === "standby" ? "warning" : "muted";
}

export function getDataSourceTone(status: string): BadgeTone {
  if (status === "available") {
    return "success";
  }

  return status === "empty" ? "muted" : "warning";
}

export function getMissionStatusTone(status: DroneOperatorMissionResponseDto["status"]): BadgeTone {
  if (status === "completed") {
    return "success";
  }

  if (status === "failed" || status === "cancelled") {
    return "danger";
  }

  return status === "in_progress" ? "warning" : "muted";
}

export function getTechnicalAlertTone(
  severity: DroneOperatorTechnicalAlertResponseDto["severity"],
): BadgeTone {
  return severity === "critical" ? "danger" : "warning";
}

export function toRoute(path: string): UrlObject {
  return { pathname: path };
}
