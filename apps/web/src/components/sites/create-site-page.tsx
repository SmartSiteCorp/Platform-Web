"use client";

import { HardHat, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/layout/app-header";
import { CreateSiteForm, type CreateSiteSubmitter } from "@/components/sites/create-site-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { SiteResponseDto } from "@/generated/api";
import { createSite } from "@/lib/sites";
import { useRequiredAuthSession } from "@/lib/use-auth-session";

interface CreateSitePageProps {
  readonly submitCreateSite?: CreateSiteSubmitter;
}

export function CreateSitePage({ submitCreateSite }: CreateSitePageProps) {
  const router = useRouter();
  const { isCheckingSession, session } = useRequiredAuthSession();

  const handleSiteCreated = (site: SiteResponseDto): void => {
    router.push(`/dashboard?site=${site.id}&created=1`);
  };

  const handleSubmit: CreateSiteSubmitter =
    submitCreateSite ??
    ((request) => {
      if (!session) {
        return Promise.resolve({
          message: "Votre session a expiré. Connectez-vous à nouveau.",
          ok: false,
          sessionExpired: true as const,
        });
      }

      return createSite(session.accessToken, request);
    });

  if (isCheckingSession) {
    return <CreateSitePageLoading />;
  }

  return (
    <main className="min-h-screen bg-background">
      <AppHeader activeItem="dashboard" />
      <section className="container py-8">
        <CreateSiteIntro />
        <div className="mx-auto max-w-2xl">
          <CreateSiteForm onSiteCreated={handleSiteCreated} submitCreateSite={handleSubmit} />
        </div>
      </section>
    </main>
  );
}

function CreateSitePageLoading() {
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

function CreateSiteIntro() {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <Badge tone="success">Chantiers</Badge>
        <h1 className="mt-3 flex items-center gap-3 text-3xl font-bold tracking-normal">
          <HardHat aria-hidden="true" className="h-8 w-8 text-primary" />
          Créer un chantier
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Renseignez les informations du nouveau chantier. Seul le nom est obligatoire.
        </p>
      </div>
    </div>
  );
}
