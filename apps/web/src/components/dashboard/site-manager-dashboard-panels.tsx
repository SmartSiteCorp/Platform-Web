"use client";

import { AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { UrlObject } from "url";

import type {
  SiteManagerDashboardAlertResponseDto,
  SiteManagerDashboardDataSourceResponseDto,
  SiteManagerDashboardDeadlineResponseDto,
  SiteManagerDashboardResponseDto,
  SiteManagerDashboardSiteResponseDto,
} from "@/generated/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  formatDataSourceStatus,
  formatDate,
  formatDateTime,
  formatSeverity,
  formatStatus,
  getAlertTone,
  getDataSourceTone,
} from "./dashboard-formatters";

const maxVisibleSites = 4;

export function SitesProgressPanel({
  sites,
}: {
  readonly sites: readonly SiteManagerDashboardSiteResponseDto[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Avancement des chantiers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sites.slice(0, maxVisibleSites).map((site) => (
          <SiteProgressRow key={site.id} site={site} />
        ))}
      </CardContent>
    </Card>
  );
}

function SiteProgressRow({ site }: { readonly site: SiteManagerDashboardSiteResponseDto }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{site.name}</h3>
            <Badge tone="muted">{formatStatus(site.status)}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {site.address ?? "Adresse non renseignée"}
          </p>
        </div>
        <Link
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-semibold transition-colors hover:bg-muted"
          href={toRoute(site.detailsPath)}
        >
          Ouvrir
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Progression</span>
        <span className="font-semibold">{site.progressPercent}%</span>
      </div>
      <div className="mt-2">
        <Progress value={site.progressPercent} />
      </div>
      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <Metric label="En cours" value={site.taskInProgressCount} />
        <Metric label="Terminées" value={site.taskCompletedCount} />
        <Metric label="Ouvriers" value={site.activeWorkersCount} />
      </div>
    </div>
  );
}

export function DeadlinesPanel({
  deadlines,
}: {
  readonly deadlines: readonly SiteManagerDashboardDeadlineResponseDto[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Prochaines échéances</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {deadlines.length === 0 ? (
          <EmptyPanelMessage message="Aucune échéance importante à afficher." />
        ) : (
          deadlines.map((deadline) => <DeadlineRow deadline={deadline} key={deadline.id} />)
        )}
      </CardContent>
    </Card>
  );
}

function DeadlineRow({ deadline }: { readonly deadline: SiteManagerDashboardDeadlineResponseDto }) {
  return (
    <Link
      className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-muted/60"
      href={toRoute(deadline.detailsPath)}
    >
      <div className="min-w-0">
        <p className="font-medium">{deadline.label}</p>
        <p className="mt-1 text-sm text-muted-foreground">{deadline.siteName}</p>
      </div>
      <Badge tone="warning">{formatDate(deadline.dueDate)}</Badge>
    </Link>
  );
}

export function AlertsPanel({
  alerts,
}: {
  readonly alerts: readonly SiteManagerDashboardAlertResponseDto[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertes et anomalies</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.length === 0 ? (
          <EmptyPanelMessage message="Aucune alerte active sur les chantiers accessibles." />
        ) : (
          alerts.map((alert) => <AlertRow alert={alert} key={alert.id} />)
        )}
      </CardContent>
    </Card>
  );
}

function AlertRow({ alert }: { readonly alert: SiteManagerDashboardAlertResponseDto }) {
  return (
    <Link
      className="block rounded-lg border border-border bg-background p-3 transition-colors hover:bg-muted/60"
      href={toRoute(alert.detailsPath)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={getAlertTone(alert.severity)}>{formatSeverity(alert.severity)}</Badge>
            <span className="text-xs text-muted-foreground">
              {formatDateTime(alert.detectedAt)}
            </span>
          </div>
          <p className="mt-2 font-medium">{alert.description}</p>
          <p className="mt-1 text-sm text-muted-foreground">{alert.siteName}</p>
        </div>
        <AlertTriangle aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-destructive" />
      </div>
    </Link>
  );
}

export function NavigationShortcutsPanel({
  dashboard,
}: {
  readonly dashboard: SiteManagerDashboardResponseDto;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Accès rapides</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {dashboard.navigationShortcuts.length === 0 ? (
          <EmptyPanelMessage message="Aucun raccourci disponible pour ce périmètre." />
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

export function DataSourcesPanel({
  dataSources,
}: {
  readonly dataSources: readonly SiteManagerDashboardDataSourceResponseDto[];
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

function Metric({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <div className="rounded-md bg-muted px-3 py-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function EmptyPanelMessage({ message }: { readonly message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function toRoute(path: string): UrlObject {
  return { pathname: path };
}
