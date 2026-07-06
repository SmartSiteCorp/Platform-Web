"use client";

import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/layout/app-header";
import { Card, CardContent } from "@/components/ui/card";
import { defaultDashboardPath, getDashboardPathForAccount } from "@/lib/dashboard-routing";
import { useRequiredAuthSession } from "@/lib/use-auth-session";
import { DashboardShell } from "./dashboard-shell";

export function DashboardEntryShell() {
  const router = useRouter();
  const { isCheckingSession, session } = useRequiredAuthSession();
  const dashboardPath = session ? getDashboardPathForAccount(session) : defaultDashboardPath;

  useEffect(() => {
    if (!session || dashboardPath === defaultDashboardPath) {
      return;
    }

    const targetDashboardPath = `${dashboardPath}${window.location.search}` as Route;

    router.replace(targetDashboardPath);
  }, [dashboardPath, router, session]);

  if (isCheckingSession || !session) {
    return <DashboardEntryLoading message="Vérification du dashboard..." />;
  }

  if (dashboardPath !== defaultDashboardPath) {
    return <DashboardEntryLoading message="Ouverture du dashboard droniste..." />;
  }

  return <DashboardShell />;
}

function DashboardEntryLoading({ message }: { readonly message: string }) {
  return (
    <main className="min-h-screen bg-background">
      <AppHeader activeItem="dashboard" />
      <section className="container py-8">
        <Card>
          <CardContent className="flex min-h-48 items-center justify-center gap-3 p-8 text-muted-foreground">
            <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
            <span>{message}</span>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
