import {
  documentsControllerListDocuments,
  documentsControllerUploadDocument,
  type ApiErrorResponseDto,
  type DocumentResponseDto,
} from "@/generated/api";
import { getApiBaseUrl } from "@/lib/api-config";

export type DownloadDocumentResult =
  | { readonly ok: true }
  | { readonly message: string; readonly ok: false; readonly sessionExpired?: true };

export type DocumentType = "devis" | "plan" | "rapport" | "contrat" | "autre";

export type UploadDocumentResult =
  | { readonly ok: true; readonly document: DocumentResponseDto }
  | { readonly message: string; readonly ok: false; readonly sessionExpired?: true };

export type ListDocumentsResult =
  | { readonly ok: true; readonly documents: readonly DocumentResponseDto[] }
  | { readonly message: string; readonly ok: false; readonly sessionExpired?: true };

export async function uploadDocument(
  accessToken: string,
  siteId: string,
  title: string,
  documentType: DocumentType,
  file: File,
): Promise<UploadDocumentResult> {
  const response = await documentsControllerUploadDocument({
    auth: accessToken,
    baseUrl: getApiBaseUrl(),
    body: { documentType, file, title },
    path: { siteId },
  });

  if (response.error) {
    return buildDocumentErrorResult(response.error, response.response?.status);
  }

  return { ok: true, document: response.data };
}

export async function listDocuments(
  accessToken: string,
  siteId: string,
): Promise<ListDocumentsResult> {
  const response = await documentsControllerListDocuments({
    auth: accessToken,
    baseUrl: getApiBaseUrl(),
    path: { siteId },
  });

  if (response.error) {
    return buildDocumentErrorResult(response.error, response.response?.status);
  }

  return { ok: true, documents: response.data.documents };
}

export async function downloadDocument(
  accessToken: string,
  siteId: string,
  documentId: string,
  originalName: string,
): Promise<DownloadDocumentResult> {
  const url = `${getApiBaseUrl()}/api/sites/${siteId}/documents/${documentId}/download`;

  let response: Response;

  try {
    response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  } catch {
    return { message: "Impossible de joindre l'API SmartSite.", ok: false };
  }

  if (response.status === 401) {
    return {
      message: "Votre session a expiré. Connectez-vous à nouveau.",
      ok: false,
      sessionExpired: true,
    };
  }

  if (response.status === 404) {
    return { message: "Le document est introuvable.", ok: false };
  }

  if (!response.ok) {
    return { message: "Le téléchargement a échoué.", ok: false };
  }

  // Téléchargement navigateur via blob URL temporaire.
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = originalName;
  anchor.click();
  URL.revokeObjectURL(blobUrl);

  return { ok: true };
}

function buildDocumentErrorResult(
  error: ApiErrorResponseDto,
  statusCode: number | undefined,
): { readonly message: string; readonly ok: false; readonly sessionExpired?: true } {
  if (statusCode === 401) {
    return {
      message: "Votre session a expiré. Connectez-vous à nouveau.",
      ok: false,
      sessionExpired: true,
    };
  }

  if (statusCode === 403) {
    return {
      message: "Vous n'avez pas le rôle requis pour effectuer cette action.",
      ok: false,
    };
  }

  if (statusCode === 404) {
    return { message: "Le chantier est introuvable.", ok: false };
  }

  if (statusCode === undefined) {
    return { message: "Impossible de joindre l'API SmartSite.", ok: false };
  }

  // error.message peut être string ou string[] selon le type d'exception NestJS.
  const messages = Array.isArray(error.message) ? error.message : [String(error.message)];
  const apiMessage = messages.join(" ").trim();

  return {
    message: apiMessage.length > 0 ? apiMessage : "L'opération a échoué.",
    ok: false,
  };
}
