"use client";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Battery,
  CalendarDays,
  Loader2,
  Radio,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

import type { DroneOperatorDashboardResponseDto } from "@/generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardStat } from "./dashboard-data";
import {
  DroneDataSourcesPanel,
  DroneMissionsPanel,
  DroneNavigationShortcutsPanel,
  DronesStatusPanel,
  TechnicalAlertsPanel,
} from "./drone-operator-dashboard-panels";
import { StatCard } from "./stat-card";

interface DroneOperatorDashboardProps {
  readonly dashboard: DroneOperatorDashboardResponseDto;
  readonly isRefreshing: boolean;
  readonly onRefresh: () => void;
}

export function DroneOperatorDashboard({
  dashboard,
  isRefreshing,
  onRefresh,
}: DroneOperatorDashboardProps) {
  return (
    <>
      <DashboardIntro dashboard={dashboard} isRefreshing={isRefreshing} onRefresh={onRefresh} />
      <DashboardStats dashboard={dashboard} />
      {dashboard.emptyState ? (
        <DashboardEmptyState dashboard={dashboard} />
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
          <DroneMissionsPanel missions={dashboard.missions} />
          <div className="grid gap-6">
            <DronesStatusPanel drones={dashboard.drones} />
            <TechnicalAlertsPanel alerts={dashboard.technicalAlerts} />
          </div>
        </div>
      )}
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <DroneNavigationShortcutsPanel dashboard={dashboard} />
        <DroneDataSourcesPanel dataSources={dashboard.dataSources} />
      </div>
    </>
  );
}

function DashboardIntro({ dashboard, isRefreshing, onRefresh }: DroneOperatorDashboardProps) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <Badge tone="success">Droniste</Badge>
        <h1 className="mt-3 text-3xl font-bold tracking-normal">Dashboard droniste SmartSite</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Suivi des missions drone, des appareils connectés et des alertes techniques autorisées.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Badge tone={dashboard.realTimeAvailable ? "success" : "muted"}>
          {dashboard.realTimeAvailable
            ? "Télémétrie temps réel"
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

function DashboardStats({ dashboard }: { readonly dashboard: DroneOperatorDashboardResponseDto }) {
  const stats: readonly DashboardStat[] = [
    {
      icon: CalendarDays,
      label: "Missions planifiées",
      tone: "default",
      value: String(dashboard.stats.plannedMissionsCount),
    },
    {
      icon: Activity,
      label: "Missions en cours",
      tone: dashboard.stats.activeMissionsCount > 0 ? "warning" : "success",
      value: String(dashboard.stats.activeMissionsCount),
    },
    {
      icon: Radio,
      label: "Drones connectés",
      tone: dashboard.stats.connectedDronesCount > 0 ? "success" : "warning",
      value: String(dashboard.stats.connectedDronesCount),
    },
    {
      icon: Battery,
      label: "Batterie moyenne",
      tone: getBatteryStatTone(dashboard.stats.averageBatteryPercent),
      value: formatBatteryPercent(dashboard.stats.averageBatteryPercent),
    },
    {
      icon: AlertTriangle,
      label: "Alertes techniques",
      tone: dashboard.stats.technicalAlertsCount > 0 ? "danger" : "success",
      value: String(dashboard.stats.technicalAlertsCount),
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {stats.map((stat) => (
        <StatCard key={stat.label} stat={stat} />
      ))}
    </div>
  );
}

function DashboardEmptyState({
  dashboard,
}: {
  readonly dashboard: DroneOperatorDashboardResponseDto;
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
          href="/dashboard"
        >
          Voir le dashboard général
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
}

function formatBatteryPercent(value: number | null | undefined): string {
  return typeof value === "number" ? `${String(value)}%` : "N/A";
}

function getBatteryStatTone(value: number | null | undefined): DashboardStat["tone"] {
  if (typeof value !== "number") {
    return "warning";
  }

  return value < 25 ? "danger" : "success";
}
