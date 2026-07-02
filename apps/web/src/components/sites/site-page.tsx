"use client";

import { HardHat, Loader2 } from "lucide-react";

import { AppHeader } from "@/components/layout/app-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useRequiredAuthSession } from "@/lib/use-auth-session";

import { PlanningBlock, WorkerTasksBlock } from "./site-page-role-blocks";
import {
  resolveSitePagePermissions,
  resolveSitePageServices,
  type SitePageServiceOverrides,
} from "./site-page-services";
import { SiteDocumentsSection } from "./site-documents-section";

interface SitePageProps extends SitePageServiceOverrides {
  readonly siteId: string;
}

export function SitePage({ siteId, ...serviceOverrides }: SitePageProps) {
  const { isCheckingSession, session } = useRequiredAuthSession();

  if (isCheckingSession) {
    return <SitePageLoading />;
  }

  const permissions = resolveSitePagePermissions(session);
  const services = resolveSitePageServices({ ...serviceOverrides, session, siteId });

  return (
    <main className="min-h-screen bg-background">
      <AppHeader activeItem="dashboard" />
      <section className="container py-8">
        <SitePageIntro />
        <div className="space-y-6">
          <WorkerTasksBlock
            canViewWorkerTasks={permissions.canViewWorkerTasks}
            services={services}
            siteId={siteId}
          />
          <PlanningBlock canManagePlanning={permissions.canManagePlanning} services={services} />
          <SiteDocumentsSection
            downloadDocument={services.downloader}
            listDocuments={services.documentsLoader}
            siteId={siteId}
            submitUpload={services.uploader}
          />
        </div>
      </section>
    </main>
  );
}

function SitePageLoading() {
  return (
    <main className="min-h-screen bg-background">
      <AppHeader activeItem="dashboard" />
      <section className="container py-8">
        <Card>
          <CardContent className="flex min-h-48 items-center justify-center gap-3 p-8 text-muted-foreground">
            <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
            <span>Vérification de la session...</span>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function SitePageIntro() {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <Badge tone="success">Chantier</Badge>
        <h1 className="mt-3 flex items-center gap-3 text-3xl font-bold tracking-normal">
          <HardHat aria-hidden="true" className="h-8 w-8 text-primary" />
          Fiche chantier
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Consultez le planning et gérez les documents associés à ce chantier.
        </p>
      </div>
    </div>
  );
}
