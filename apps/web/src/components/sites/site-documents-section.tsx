"use client";

import { FileText, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { OrganizationFormStatusMessage } from "@/components/organization/organization-form-status-message";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DocumentResponseDto } from "@/generated/api";
import type { ListDocumentsResult } from "@/lib/documents";

import { UploadDocumentForm, type UploadDocumentSubmitter } from "./upload-document-form";

const documentTypeLabels: Record<string, string> = {
  autre: "Autre",
  contrat: "Contrat",
  devis: "Devis",
  plan: "Plan",
  rapport: "Rapport",
};

export type ListDocumentsLoader = (siteId: string) => Promise<ListDocumentsResult>;

interface SiteDocumentsSectionProps {
  readonly listDocuments: ListDocumentsLoader;
  readonly siteId: string;
  readonly submitUpload: UploadDocumentSubmitter;
}

export function SiteDocumentsSection({
  listDocuments,
  siteId,
  submitUpload,
}: SiteDocumentsSectionProps) {
  const [documents, setDocuments] = useState<readonly DocumentResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadDocuments = useCallback(async (): Promise<void> => {
    const result = await listDocuments(siteId);

    if (!result.ok) {
      setLoadError(result.message);
      setIsLoading(false);
      return;
    }

    setDocuments(result.documents);
    setIsLoading(false);
  }, [listDocuments, siteId]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const handleDocumentUploaded = (document: DocumentResponseDto): void => {
    setDocuments((prev) => [document, ...prev]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ajouter un document</CardTitle>
        </CardHeader>
        <CardContent>
          <UploadDocumentForm
            onDocumentUploaded={handleDocumentUploaded}
            submitUpload={submitUpload}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents du chantier</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentList documents={documents} isLoading={isLoading} loadError={loadError} />
        </CardContent>
      </Card>
    </div>
  );
}

interface DocumentListProps {
  readonly documents: readonly DocumentResponseDto[];
  readonly isLoading: boolean;
  readonly loadError: string | null;
}

function DocumentList({ documents, isLoading, loadError }: DocumentListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 py-6 text-muted-foreground">
        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        <span>Chargement des documents...</span>
      </div>
    );
  }

  if (loadError) {
    return <OrganizationFormStatusMessage message={loadError} tone="error" />;
  }

  if (documents.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Aucun document associé à ce chantier.
      </p>
    );
  }

  return (
    <ul aria-label="Liste des documents" className="divide-y divide-border">
      {documents.map((document) => (
        <DocumentItem document={document} key={document.id} />
      ))}
    </ul>
  );
}

interface DocumentItemProps {
  readonly document: DocumentResponseDto;
}

function DocumentItem({ document }: DocumentItemProps) {
  const sizeKo = (document.file.sizeBytes / 1024).toFixed(0);
  const typeLabel = documentTypeLabels[document.documentType] ?? document.documentType;
  const date = new Date(document.createdAt).toLocaleDateString("fr-FR");

  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <FileText aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{document.title}</p>
          <p className="text-xs text-muted-foreground">
            {document.file.originalName} · {sizeKo} Ko
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-xs font-medium text-muted-foreground">{typeLabel}</span>
        <span className="text-xs text-muted-foreground">{date}</span>
      </div>
    </li>
  );
}
