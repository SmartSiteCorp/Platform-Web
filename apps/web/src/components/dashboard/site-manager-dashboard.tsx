"use client";

import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Users,
} from "lucide-react";
import Link from "next/link";

import type { SiteManagerDashboardResponseDto } from "@/generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardStat } from "./dashboard-data";
import {
  AlertsPanel,
  DataSourcesPanel,
  DeadlinesPanel,
  NavigationShortcutsPanel,
  SitesProgressPanel,
} from "./site-manager-dashboard-panels";
import { StatCard } from "./stat-card";

interface SiteManagerDashboardProps {
  readonly dashboard: SiteManagerDashboardResponseDto;
  readonly isRefreshing: boolean;
  readonly onRefresh: () => void;
}

export function SiteManagerDashboard({
  dashboard,
  isRefreshing,
  onRefresh,
}: SiteManagerDashboardProps) {
  return (
    <>
      <DashboardIntro dashboard={dashboard} isRefreshing={isRefreshing} onRefresh={onRefresh} />
      <DashboardStats dashboard={dashboard} />
      {dashboard.emptyState ? (
        <DashboardEmptyState dashboard={dashboard} />
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
          <SitesProgressPanel sites={dashboard.sites} />
          <div className="grid gap-6">
            <DeadlinesPanel deadlines={dashboard.upcomingDeadlines} />
            <AlertsPanel alerts={dashboard.alerts} />
          </div>
        </div>
      )}
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <NavigationShortcutsPanel dashboard={dashboard} />
        <DataSourcesPanel dataSources={dashboard.dataSources} />
      </div>
    </>
  );
}

function DashboardIntro({ dashboard, isRefreshing, onRefresh }: SiteManagerDashboardProps) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <Badge tone="success">Chef de chantier</Badge>
        <h1 className="mt-3 text-3xl font-bold tracking-normal">Tableau de bord SmartSite</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Vue globale des chantiers accessibles, calculée depuis les données planning, équipes et
          alertes autorisées.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Badge tone={dashboard.realTimeAvailable ? "success" : "muted"}>
          {dashboard.realTimeAvailable
            ? "Temps réel actif"
            : `Rafraîchissement ${String(dashboard.refreshIntervalSeconds)}s`}
        </Badge>
        <Button disabled={isRefreshing} onClick={onRefresh} variant="secondary">
          {isRefreshing ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
          )}
          Actualiser
        </Button>
      </div>
    </div>
  );
}

function DashboardStats({ dashboard }: { readonly dashboard: SiteManagerDashboardResponseDto }) {
  const stats: readonly DashboardStat[] = [
    {
      icon: Building2,
      label: "Chantiers actifs",
      tone: "default",
      value: String(dashboard.stats.activeSitesCount),
    },
    {
      icon: CheckCircle2,
      label: "Progression globale",
      tone: "success",
      value: `${String(dashboard.stats.globalProgressPercent)}%`,
    },
    {
      icon: Clock,
      label: "Tâches en cours",
      tone: "warning",
      value: String(dashboard.stats.taskInProgressCount),
    },
    {
      icon: CheckCircle2,
      label: "Tâches terminées",
      tone: "success",
      value: String(dashboard.stats.taskCompletedCount),
    },
    {
      icon: Users,
      label: "Ouvriers actifs",
      tone: "default",
      value: String(dashboard.stats.activeWorkersCount),
    },
    {
      icon: AlertTriangle,
      label: "Alertes actives",
      tone: dashboard.stats.activeAlertsCount > 0 ? "danger" : "success",
      value: String(dashboard.stats.activeAlertsCount),
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {stats.map((stat) => (
        <StatCard key={stat.label} stat={stat} />
      ))}
    </div>
  );
}

function DashboardEmptyState({
  dashboard,
}: {
  readonly dashboard: SiteManagerDashboardResponseDto;
}) {
  const emptyState = dashboard.emptyState;

  if (!emptyState) return null;

  return (
    <Card className="mt-6">
      <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{emptyState.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{emptyState.message}</p>
        </div>
        <Link
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          href="/sites/new"
        >
          Créer un chantier
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
}
