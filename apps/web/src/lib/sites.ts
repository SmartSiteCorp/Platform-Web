import {
  sitesControllerCreateSite,
  type ApiErrorResponseDto,
  type CreateSiteRequestDto,
  type SiteResponseDto,
} from "@/generated/api";
import { getApiBaseUrl } from "@/lib/api-config";

export type CreateSiteResult =
  | { readonly ok: true; readonly site: SiteResponseDto }
  | { readonly message: string; readonly ok: false; readonly sessionExpired?: true };

export async function createSite(
  accessToken: string,
  request: CreateSiteRequestDto,
): Promise<CreateSiteResult> {
  const response = await sitesControllerCreateSite({
    auth: accessToken,
    baseUrl: getApiBaseUrl(),
    body: request,
  });

  if (response.error) {
    return buildSiteErrorResult(response.error, response.response?.status);
  }

  return { ok: true, site: response.data };
}

function buildSiteErrorResult(
  error: ApiErrorResponseDto,
  statusCode: number | undefined,
): CreateSiteResult {
  if (statusCode === 401) {
    return {
      message: "Votre session a expiré. Connectez-vous à nouveau.",
      ok: false,
      sessionExpired: true,
    };
  }

  if (statusCode === 403) {
    return {
      message: "Vous n'avez pas le rôle requis pour créer un chantier.",
      ok: false,
    };
  }

  if (statusCode === undefined) {
    return { message: "Impossible de joindre l'API SmartSite.", ok: false };
  }

  const apiMessage = error.message.join(" ").trim();

  return {
    message: apiMessage.length > 0 ? apiMessage : "La création du chantier a échoué.",
    ok: false,
  };
}
