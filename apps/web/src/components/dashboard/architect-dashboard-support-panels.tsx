"use client";

import { AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";

import type {
  ArchitectAiAnomalyResponseDto,
  ArchitectDashboardResponseDto,
  ArchitectDataSourceResponseDto,
} from "@/generated/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatDataSourceStatus,
  formatDateTime,
  formatSeverity,
  getAlertTone,
  getDataSourceTone,
} from "./dashboard-formatters";
import { EmptyPanelMessage, toRoute } from "./architect-dashboard-panel-helpers";

export function ArchitectAiAnomaliesPanel({
  anomalies,
}: {
  readonly anomalies: readonly ArchitectAiAnomalyResponseDto[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Anomalies IA</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {anomalies.length === 0 ? (
          <EmptyPanelMessage message="Aucune anomalie IA active sur les projets accessibles." />
        ) : (
          anomalies.map((anomaly) => <AiAnomalyRow anomaly={anomaly} key={anomaly.id} />)
        )}
      </CardContent>
    </Card>
  );
}

function AiAnomalyRow({ anomaly }: { readonly anomaly: ArchitectAiAnomalyResponseDto }) {
  return (
    <Link
      className="block rounded-lg border border-border bg-background p-3 transition-colors hover:bg-muted/60"
      href={toRoute(anomaly.detailsPath)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={getAlertTone(anomaly.severity)}>{formatSeverity(anomaly.severity)}</Badge>
            <span className="text-xs text-muted-foreground">
              {formatDateTime(anomaly.detectedAt)}
            </span>
          </div>
          <p className="mt-2 font-medium">{anomaly.description}</p>
          <p className="mt-1 text-sm text-muted-foreground">{anomaly.siteName}</p>
        </div>
        <AlertTriangle aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-destructive" />
      </div>
    </Link>
  );
}

export function ArchitectNavigationShortcutsPanel({
  dashboard,
}: {
  readonly dashboard: ArchitectDashboardResponseDto;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Accès rapides</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {dashboard.navigationShortcuts.length === 0 ? (
          <EmptyPanelMessage message="Aucun raccourci modèle disponible pour ce périmètre." />
        ) : (
          dashboard.navigationShortcuts.map((shortcut) => (
            <Link
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-muted/60"
              href={toRoute(shortcut.path)}
              key={`${shortcut.type}-${shortcut.path}`}
            >
              <div>
                <p className="font-medium">{shortcut.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{shortcut.description}</p>
              </div>
              <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function ArchitectDataSourcesPanel({
  dataSources,
}: {
  readonly dataSources: readonly ArchitectDataSourceResponseDto[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>État des données</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {dataSources.map((source) => (
          <div
            className="flex flex-col justify-between gap-2 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-start"
            key={source.key}
          >
            <div>
              <p className="font-medium">{source.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{source.message}</p>
            </div>
            <Badge tone={getDataSourceTone(source.status)}>
              {formatDataSourceStatus(source.status)}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
