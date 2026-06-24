"use client";

import { HardHat, Loader2 } from "lucide-react";

import { AppHeader } from "@/components/layout/app-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { downloadDocument, listDocuments, uploadDocument } from "@/lib/documents";
import { useRequiredAuthSession } from "@/lib/use-auth-session";

import {
  SiteDocumentsSection,
  type DocumentDownloader,
  type ListDocumentsLoader,
} from "./site-documents-section";
import type { UploadDocumentSubmitter } from "./upload-document-form";

interface SitePageProps {
  readonly downloadDocumentLoader?: DocumentDownloader;
  readonly listDocumentsLoader?: ListDocumentsLoader;
  readonly siteId: string;
  readonly submitUpload?: UploadDocumentSubmitter;
}

export function SitePage({
  downloadDocumentLoader,
  listDocumentsLoader,
  siteId,
  submitUpload,
}: SitePageProps) {
  const { isCheckingSession, session } = useRequiredAuthSession();

  if (isCheckingSession) {
    return <SitePageLoading />;
  }

  const loader: ListDocumentsLoader =
    listDocumentsLoader ??
    ((id) => {
      if (!session) {
        return Promise.resolve({
          message: "Votre session a expiré. Connectez-vous à nouveau.",
          ok: false as const,
          sessionExpired: true as const,
        });
      }
      return listDocuments(session.accessToken, id);
    });

  const uploader: UploadDocumentSubmitter =
    submitUpload ??
    ((title, documentType, file) => {
      if (!session) {
        return Promise.resolve({
          message: "Votre session a expiré. Connectez-vous à nouveau.",
          ok: false as const,
          sessionExpired: true as const,
        });
      }
      return uploadDocument(session.accessToken, siteId, title, documentType, file);
    });

  const downloader: DocumentDownloader =
    downloadDocumentLoader ??
    ((documentId, originalName) => {
      if (!session) {
        return Promise.resolve({
          message: "Votre session a expiré. Connectez-vous à nouveau.",
          ok: false as const,
        });
      }
      return downloadDocument(session.accessToken, siteId, documentId, originalName);
    });

  return (
    <main className="min-h-screen bg-background">
      <AppHeader activeItem="dashboard" />
      <section className="container py-8">
        <SitePageIntro />
        <SiteDocumentsSection
          downloadDocument={downloader}
          listDocuments={loader}
          siteId={siteId}
          submitUpload={uploader}
        />
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
          Consultez et gérez les documents associés à ce chantier.
        </p>
      </div>
    </div>
  );
}
