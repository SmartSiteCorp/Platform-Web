"use client";

import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { DroneOperatorDashboardResponseDto, RegisterResponseDto } from "@/generated/api";
import { clearAuthSession, isOrganizationAdmin } from "@/lib/auth-session";
import { droneOperatorDashboardPath } from "@/lib/dashboard-routing";
import { loadDroneOperatorDashboard, type LoadDroneOperatorDashboardResult } from "@/lib/dashboard";
import { useRequiredAuthSession } from "@/lib/use-auth-session";
import { DroneOperatorDashboard } from "./drone-operator-dashboard";

export type DroneOperatorDashboardLoader = (
  accessToken: string,
  siteId: string | null,
) => Promise<LoadDroneOperatorDashboardResult>;

interface DroneOperatorDashboardShellProps {
  readonly dashboardLoader?: DroneOperatorDashboardLoader;
}

type DashboardLoadMode = "background" | "initial" | "manual";

type DashboardLoadState =
  | {
      readonly dashboard: null;
      readonly isRefreshing: false;
      readonly message: null;
      readonly status: "loading";
    }
  | {
      readonly dashboard: null;
      readonly isRefreshing: false;
      readonly message: string;
      readonly status: "error";
    }
  | {
      readonly dashboard: DroneOperatorDashboardResponseDto;
      readonly isRefreshing: boolean;
      readonly message: null;
      readonly status: "success";
    };

interface DroneOperatorDashboardAuthenticatedContentProps {
  readonly dashboardLoader: DroneOperatorDashboardLoader;
  readonly session: RegisterResponseDto;
}

interface UseDroneOperatorDashboardParams {
  readonly accessToken: string;
  readonly dashboardLoader: DroneOperatorDashboardLoader;
  readonly siteId: string | null;
}

const dashboardLoginPath = "/login";

export function DroneOperatorDashboardShell({
  dashboardLoader = loadDroneOperatorDashboard,
}: DroneOperatorDashboardShellProps) {
  const { isCheckingSession, session } = useRequiredAuthSession();

  if (isCheckingSession || !session) {
    return <DashboardSessionLoading />;
  }

  return (
    <main className="min-h-screen bg-background">
      <AppHeader
        activeItem="dashboard"
        dashboardHref={droneOperatorDashboardPath}
        showSettingsLink={isOrganizationAdmin(session)}
      />

      <section className="container py-8">
        <Suspense fallback={<DashboardLoadingCard message="Chargement du dashboard droniste..." />}>
          <DroneOperatorDashboardAuthenticatedContent
            dashboardLoader={dashboardLoader}
            session={session}
          />
        </Suspense>
      </section>
    </main>
  );
}

function DroneOperatorDashboardAuthenticatedContent({
  dashboardLoader,
  session,
}: DroneOperatorDashboardAuthenticatedContentProps) {
  const searchParams = useSearchParams();
  const siteId = searchParams.get("siteId");
  const { loadState, refreshDashboard } = useDroneOperatorDashboard({
    accessToken: session.accessToken,
    dashboardLoader,
    siteId,
  });
  const handleRefresh = useCallback(() => {
    void refreshDashboard("manual");
  }, [refreshDashboard]);

  return <DashboardBody loadState={loadState} onRefresh={handleRefresh} />;
}

function useDroneOperatorDashboard({
  accessToken,
  dashboardLoader,
  siteId,
}: UseDroneOperatorDashboardParams) {
  const router = useRouter();
  const [loadState, setLoadState] = useState<DashboardLoadState>({
    dashboard: null,
    isRefreshing: false,
    message: null,
    status: "loading",
  });
  const handleSessionExpired = useCallback(() => {
    clearAuthSession();
    router.replace(dashboardLoginPath);
  }, [router]);
  const refreshDashboard = useCallback(
    async (mode: DashboardLoadMode) => {
      startDashboardLoad(mode, setLoadState);
      const result = await dashboardLoader(accessToken, siteId);
      applyDashboardLoadResult(result, setLoadState, handleSessionExpired);
    },
    [accessToken, dashboardLoader, handleSessionExpired, siteId],
  );
  const refreshIntervalMilliseconds = getRefreshIntervalMilliseconds(loadState);

  useEffect(() => {
    void refreshDashboard("initial");
  }, [refreshDashboard]);

  useEffect(() => {
    if (refreshIntervalMilliseconds === null) {
      return;
    }

    // TODOOOOO : à remplacer avec la vraie donnée temps réel DroneControl quand le module sera pret
    const intervalId = window.setInterval(() => {
      void refreshDashboard("background");
    }, refreshIntervalMilliseconds);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refreshDashboard, refreshIntervalMilliseconds]);

  return { loadState, refreshDashboard };
}

function DashboardBody({
  loadState,
  onRefresh,
}: {
  readonly loadState: DashboardLoadState;
  readonly onRefresh: () => void;
}) {
  if (loadState.status === "loading") {
    return <DashboardLoadingCard message="Chargement des missions drone accessibles..." />;
  }

  if (loadState.status === "error") {
    return <DashboardErrorCard message={loadState.message} onRetry={onRefresh} />;
  }

  return (
    <DroneOperatorDashboard
      dashboard={loadState.dashboard}
      isRefreshing={loadState.isRefreshing}
      onRefresh={onRefresh}
    />
  );
}

function DashboardSessionLoading() {
  return (
    <main className="min-h-screen bg-background">
      <AppHeader activeItem="dashboard" />
      <section className="container py-8">
        <DashboardLoadingCard message="Vérification de la session..." />
      </section>
    </main>
  );
}

function DashboardLoadingCard({ message }: { readonly message: string }) {
  return (
    <Card>
      <CardContent className="flex min-h-48 items-center justify-center gap-3 p-8 text-muted-foreground">
        <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
        <span>{message}</span>
      </CardContent>
    </Card>
  );
}

function DashboardErrorCard({
  message,
  onRetry,
}: {
  readonly message: string;
  readonly onRetry: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 text-destructive" />
          <div>
            <h1 className="text-lg font-semibold">Dashboard droniste indisponible</h1>
            <p className="mt-1 text-sm text-muted-foreground">{message}</p>
          </div>
        </div>
        <Button onClick={onRetry} variant="secondary">
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          Réessayer
        </Button>
      </CardContent>
    </Card>
  );
}

function startDashboardLoad(
  mode: DashboardLoadMode,
  setLoadState: Dispatch<SetStateAction<DashboardLoadState>>,
): void {
  setLoadState((currentState) => {
    if (mode !== "initial" && currentState.status === "success") {
      return { ...currentState, isRefreshing: true };
    }

    return {
      dashboard: null,
      isRefreshing: false,
      message: null,
      status: "loading",
    };
  });
}

function applyDashboardLoadResult(
  result: LoadDroneOperatorDashboardResult,
  setLoadState: Dispatch<SetStateAction<DashboardLoadState>>,
  onSessionExpired: () => void,
): void {
  if (result.ok) {
    setLoadState({
      dashboard: result.dashboard,
      isRefreshing: false,
      message: null,
      status: "success",
    });
    return;
  }

  if (result.sessionExpired) {
    onSessionExpired();
    return;
  }

  setLoadState({
    dashboard: null,
    isRefreshing: false,
    message: result.message,
    status: "error",
  });
}

function getRefreshIntervalMilliseconds(loadState: DashboardLoadState): number | null {
  if (loadState.status !== "success") {
    return null;
  }

  return Math.max(loadState.dashboard.refreshIntervalSeconds, 15) * 1000;
}
