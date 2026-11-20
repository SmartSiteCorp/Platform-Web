"use client";

import { AlertTriangle, ArrowRight, Radio } from "lucide-react";
import Link from "next/link";

import type {
  DroneOperatorDashboardResponseDto,
  DroneOperatorDataSourceResponseDto,
  DroneOperatorDroneResponseDto,
  DroneOperatorMissionResponseDto,
  DroneOperatorTechnicalAlertResponseDto,
} from "@/generated/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDateTime, formatStatus } from "./dashboard-formatters";
import {
  EmptyPanelMessage,
  Metric,
  formatBattery,
  formatConnectionStatus,
  formatDataSourceStatus,
  formatDuration,
  formatTechnicalAlertSeverity,
  getBatteryTone,
  getConnectionTone,
  getDataSourceTone,
  getMissionStatusTone,
  getTechnicalAlertTone,
  toRoute,
} from "./drone-operator-dashboard-panel-helpers";

const maxVisibleMissions = 5;
const maxVisibleDrones = 4;

export function DroneMissionsPanel({
  missions,
}: {
  readonly missions: readonly DroneOperatorMissionResponseDto[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Missions drone</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {missions.length === 0 ? (
          <EmptyPanelMessage message="Aucune mission drone accessible sur ce périmètre." />
        ) : (
          missions
            .slice(0, maxVisibleMissions)
            .map((mission) => <MissionRow key={mission.id} mission={mission} />)
        )}
      </CardContent>
    </Card>
  );
}

function MissionRow({ mission }: { readonly mission: DroneOperatorMissionResponseDto }) {
  const missionTitle = mission.flightName ?? "Mission drone";

  return (
    <Link
      className="block rounded-lg border border-border bg-background p-4 transition-colors hover:bg-muted/60"
      href={toRoute(mission.detailsPath)}
    >
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{missionTitle}</h3>
            <Badge tone={getMissionStatusTone(mission.status)}>
              {formatStatus(mission.status)}
            </Badge>
            <Badge tone={getConnectionTone(mission.connectionStatus)}>
              {formatConnectionStatus(mission.connectionStatus)}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {mission.siteName} · {formatDateTime(mission.missionDate)}
          </p>
        </div>
        <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
      </div>
      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <Metric label="Drone" value={mission.droneName ?? "Non affecté"} />
        <Metric label="Durée" value={formatDuration(mission.estimatedDurationMinutes)} />
        <Metric label="Batterie" value={formatBattery(mission.batteryPercent)} />
      </div>
    </Link>
  );
}

export function DronesStatusPanel({
  drones,
}: {
  readonly drones: readonly DroneOperatorDroneResponseDto[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>État des drones</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {drones.length === 0 ? (
          <EmptyPanelMessage message="Aucun drone connecté ou affecté à vos missions." />
        ) : (
          drones
            .slice(0, maxVisibleDrones)
            .map((drone) => <DroneStatusRow drone={drone} key={drone.id} />)
        )}
      </CardContent>
    </Card>
  );
}

function DroneStatusRow({ drone }: { readonly drone: DroneOperatorDroneResponseDto }) {
  return (
    <Link
      className="block rounded-lg border border-border bg-background p-3 transition-colors hover:bg-muted/60"
      href={toRoute(drone.detailsPath)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{drone.name}</p>
            <Badge tone={getConnectionTone(drone.connectionStatus)}>
              {formatConnectionStatus(drone.connectionStatus)}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {drone.currentMissionStatus
              ? `Mission ${formatStatus(drone.currentMissionStatus).toLowerCase()}`
              : "Aucune mission active"}
          </p>
        </div>
        <Radio aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-primary" />
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Batterie</span>
        <Badge tone={getBatteryTone(drone.batteryPercent)}>
          {formatBattery(drone.batteryPercent)}
        </Badge>
      </div>
      {typeof drone.batteryPercent === "number" ? (
        <div className="mt-2">
          <Progress value={drone.batteryPercent} />
        </div>
      ) : null}
    </Link>
  );
}

export function TechnicalAlertsPanel({
  alerts,
}: {
  readonly alerts: readonly DroneOperatorTechnicalAlertResponseDto[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertes techniques</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.length === 0 ? (
          <EmptyPanelMessage message="Aucune alerte technique active." />
        ) : (
          alerts.map((alert) => <TechnicalAlertRow alert={alert} key={alert.id} />)
        )}
      </CardContent>
    </Card>
  );
}

function TechnicalAlertRow({ alert }: { readonly alert: DroneOperatorTechnicalAlertResponseDto }) {
  return (
    <Link
      className="block rounded-lg border border-border bg-background p-3 transition-colors hover:bg-muted/60"
      href={toRoute(alert.detailsPath)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={getTechnicalAlertTone(alert.severity)}>
              {formatTechnicalAlertSeverity(alert.severity)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDateTime(alert.detectedAt)}
            </span>
          </div>
          <p className="mt-2 font-medium">{alert.message}</p>
          <p className="mt-1 text-sm text-muted-foreground">{alert.type}</p>
        </div>
        <AlertTriangle aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-destructive" />
      </div>
    </Link>
  );
}

export function DroneNavigationShortcutsPanel({
  dashboard,
}: {
  readonly dashboard: DroneOperatorDashboardResponseDto;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Accès rapides</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {dashboard.navigationShortcuts.length === 0 ? (
          <EmptyPanelMessage message="Aucun raccourci mission disponible." />
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

export function DroneDataSourcesPanel({
  dataSources,
}: {
  readonly dataSources: readonly DroneOperatorDataSourceResponseDto[];
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
