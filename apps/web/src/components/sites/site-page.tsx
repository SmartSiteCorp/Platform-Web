"use client";

import { HardHat, Loader2 } from "lucide-react";

import { AppHeader } from "@/components/layout/app-header";
import { SitePhasesSection } from "@/components/sites/site-phases-section";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { RegisterResponseDto } from "@/generated/api";
import { downloadDocument, listDocuments, uploadDocument } from "@/lib/documents";
import { createPhase, updatePhase } from "@/lib/phases";
import { useRequiredAuthSession } from "@/lib/use-auth-session";

import {
  SiteDocumentsSection,
  type DocumentDownloader,
  type ListDocumentsLoader,
} from "./site-documents-section";
import type { CreatePhaseSubmitter } from "./create-phase-form";
import type { UpdatePhaseSubmitter } from "./edit-phase-form";
import type { UploadDocumentSubmitter } from "./upload-document-form";

interface SitePageProps {
  readonly downloadDocumentLoader?: DocumentDownloader;
  readonly listDocumentsLoader?: ListDocumentsLoader;
  readonly submitCreatePhase?: CreatePhaseSubmitter;
  readonly submitUpdatePhase?: UpdatePhaseSubmitter;
  readonly siteId: string;
  readonly submitUpload?: UploadDocumentSubmitter;
}

export function SitePage({
  downloadDocumentLoader,
  listDocumentsLoader,
  submitCreatePhase,
  submitUpdatePhase,
  siteId,
  submitUpload,
}: SitePageProps) {
  const { isCheckingSession, session } = useRequiredAuthSession();

  if (isCheckingSession) {
    return <SitePageLoading />;
  }

  const loader = listDocumentsLoader ?? createDocumentsLoader(session);
  const phaseSubmitter = submitCreatePhase ?? createPhaseSubmitter(session, siteId);
  const phaseUpdateSubmitter = submitUpdatePhase ?? createPhaseUpdateSubmitter(session, siteId);
  const uploader = submitUpload ?? createDocumentUploader(session, siteId);
  const downloader = downloadDocumentLoader ?? createDocumentDownloader(session, siteId);

  return (
    <main className="min-h-screen bg-background">
      <AppHeader activeItem="dashboard" />
      <section className="container py-8">
        <SitePageIntro />
        <div className="space-y-6">
          <SitePhasesSection
            submitCreatePhase={phaseSubmitter}
            submitUpdatePhase={phaseUpdateSubmitter}
          />
          <SiteDocumentsSection
            downloadDocument={downloader}
            listDocuments={loader}
            siteId={siteId}
            submitUpload={uploader}
          />
        </div>
      </section>
    </main>
  );
}

function createDocumentsLoader(session: RegisterResponseDto | null): ListDocumentsLoader {
  return (id) => {
    if (!session) {
      return Promise.resolve({
        message: "Votre session a expiré. Connectez-vous à nouveau.",
        ok: false as const,
        sessionExpired: true as const,
      });
    }

    return listDocuments(session.accessToken, id);
  };
}

function createPhaseSubmitter(
  session: RegisterResponseDto | null,
  siteId: string,
): CreatePhaseSubmitter {
  return (request) => {
    if (!session) {
      return Promise.resolve(createSessionExpiredResult());
    }

    return createPhase(session.accessToken, siteId, request);
  };
}

function createPhaseUpdateSubmitter(
  session: RegisterResponseDto | null,
  siteId: string,
): UpdatePhaseSubmitter {
  return (phaseId, request) => {
    if (!session) {
      return Promise.resolve(createSessionExpiredResult());
    }

    return updatePhase(session.accessToken, siteId, phaseId, request);
  };
}

function createDocumentUploader(
  session: RegisterResponseDto | null,
  siteId: string,
): UploadDocumentSubmitter {
  return (title, documentType, file) => {
    if (!session) {
      return Promise.resolve(createSessionExpiredResult());
    }

    return uploadDocument(session.accessToken, siteId, title, documentType, file);
  };
}

function createDocumentDownloader(
  session: RegisterResponseDto | null,
  siteId: string,
): DocumentDownloader {
  return (documentId, originalName) => {
    if (!session) {
      return Promise.resolve({
        message: "Votre session a expiré. Connectez-vous à nouveau.",
        ok: false as const,
      });
    }

    return downloadDocument(session.accessToken, siteId, documentId, originalName);
  };
}

function createSessionExpiredResult() {
  return {
    message: "Votre session a expiré. Connectez-vous à nouveau.",
    ok: false as const,
    sessionExpired: true as const,
  };
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
