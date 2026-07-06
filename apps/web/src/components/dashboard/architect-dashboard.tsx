"use client";

import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  FileCode2,
  Loader2,
  MessageSquareText,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

import type { ArchitectDashboardResponseDto } from "@/generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardStat } from "./dashboard-data";
import {
  ArchitectAnnotationsPanel,
  ArchitectIfcModelsPanel,
  ArchitectProjectsPanel,
} from "./architect-dashboard-panels";
import {
  ArchitectAiAnomaliesPanel,
  ArchitectDataSourcesPanel,
  ArchitectNavigationShortcutsPanel,
} from "./architect-dashboard-support-panels";
import { StatCard } from "./stat-card";

interface ArchitectDashboardProps {
  readonly dashboard: ArchitectDashboardResponseDto;
  readonly isRefreshing: boolean;
  readonly onRefresh: () => void;
}

export function ArchitectDashboard({
  dashboard,
  isRefreshing,
  onRefresh,
}: ArchitectDashboardProps) {
  return (
    <>
      <DashboardIntro dashboard={dashboard} isRefreshing={isRefreshing} onRefresh={onRefresh} />
      <DashboardStats dashboard={dashboard} />
      {dashboard.emptyState ? (
        <DashboardEmptyState dashboard={dashboard} />
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
          <ArchitectProjectsPanel projects={dashboard.projects} />
          <div className="grid gap-6">
            <ArchitectIfcModelsPanel ifcModels={dashboard.ifcModels} />
            <ArchitectAnnotationsPanel annotations={dashboard.annotations} />
            <ArchitectAiAnomaliesPanel anomalies={dashboard.aiAnomalies} />
          </div>
        </div>
      )}
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <ArchitectNavigationShortcutsPanel dashboard={dashboard} />
        <ArchitectDataSourcesPanel dataSources={dashboard.dataSources} />
      </div>
    </>
  );
}

function DashboardIntro({ dashboard, isRefreshing, onRefresh }: ArchitectDashboardProps) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <Badge tone="success">Architecte</Badge>
        <h1 className="mt-3 text-3xl font-bold tracking-normal">Dashboard architecte SmartSite</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Vue BIM des projets autorisés, fichiers IFC, annotations et écarts détectés par l'IA.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Badge tone={dashboard.realTimeAvailable ? "success" : "muted"}>
          {dashboard.realTimeAvailable
            ? "Synchronisation temps réel"
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

function DashboardStats({ dashboard }: { readonly dashboard: ArchitectDashboardResponseDto }) {
  const stats: readonly DashboardStat[] = [
    {
      icon: Building2,
      label: "Projets associés",
      tone: "default",
      value: String(dashboard.stats.accessibleProjectsCount),
    },
    {
      icon: FileCode2,
      label: "Fichiers IFC",
      tone: dashboard.stats.ifcFilesCount > 0 ? "success" : "warning",
      value: String(dashboard.stats.ifcFilesCount),
    },
    {
      icon: MessageSquareText,
      label: "Annotations récentes",
      tone: dashboard.stats.recentAnnotationsCount > 0 ? "default" : "success",
      value: String(dashboard.stats.recentAnnotationsCount),
    },
    {
      icon: AlertTriangle,
      label: "Anomalies IA",
      tone: dashboard.stats.activeAiAnomaliesCount > 0 ? "danger" : "success",
      value: String(dashboard.stats.activeAiAnomaliesCount),
    },
    {
      icon: CheckCircle2,
      label: "Validations BIM",
      tone: dashboard.stats.bimReviewRequiredProjectsCount > 0 ? "warning" : "success",
      value: String(dashboard.stats.validatedBimProjectsCount),
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

function DashboardEmptyState({ dashboard }: { readonly dashboard: ArchitectDashboardResponseDto }) {
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
