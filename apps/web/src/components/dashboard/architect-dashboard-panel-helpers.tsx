import type { UrlObject } from "url";

import type { ArchitectProjectResponseDto } from "@/generated/api";

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

export function formatBimValidationStatus(
  status: ArchitectProjectResponseDto["bimValidationStatus"],
): string {
  const labels: Record<ArchitectProjectResponseDto["bimValidationStatus"], string> = {
    blocked: "Bloqué",
    pending: "En attente",
    review_required: "À revoir",
    validated: "Validé",
  };

  return labels[status];
}

export function formatIfcStatus(status: ArchitectProjectResponseDto["ifcStatus"]): string {
  const labels: Record<ArchitectProjectResponseDto["ifcStatus"], string> = {
    available: "Disponible",
    invalid: "Invalide",
    missing: "Manquant",
    processing: "Traitement",
  };

  return labels[status];
}

export function getBimValidationTone(
  status: ArchitectProjectResponseDto["bimValidationStatus"],
): BadgeTone {
  if (status === "validated") {
    return "success";
  }

  if (status === "blocked") {
    return "danger";
  }

  return status === "review_required" ? "warning" : "muted";
}

export function getIfcStatusTone(status: ArchitectProjectResponseDto["ifcStatus"]): BadgeTone {
  if (status === "available") {
    return "success";
  }

  if (status === "invalid") {
    return "danger";
  }

  return status === "processing" ? "warning" : "muted";
}

export function toRoute(path: string): UrlObject {
  return { pathname: path };
}
