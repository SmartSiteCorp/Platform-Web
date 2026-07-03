import {
  dashboardControllerGetSiteManagerDashboard,
  type ApiErrorResponseDto,
  type SiteManagerDashboardResponseDto,
} from "@/generated/api";
import { getApiBaseUrl } from "@/lib/api-config";

export type LoadSiteManagerDashboardResult =
  | { readonly dashboard: SiteManagerDashboardResponseDto; readonly ok: true }
  | { readonly message: string; readonly ok: false; readonly sessionExpired?: true };

export async function loadSiteManagerDashboard(
  accessToken: string,
  siteId: string | null,
): Promise<LoadSiteManagerDashboardResult> {
  const requestOptions = siteId
    ? { auth: accessToken, baseUrl: getApiBaseUrl(), query: { siteId } }
    : { auth: accessToken, baseUrl: getApiBaseUrl() };
  const response = await dashboardControllerGetSiteManagerDashboard(requestOptions);

  if (response.error) {
    return buildDashboardErrorResult(response.error, response.response?.status);
  }

  return { dashboard: response.data, ok: true };
}

function buildDashboardErrorResult(
  error: ApiErrorResponseDto,
  statusCode: number | undefined,
): LoadSiteManagerDashboardResult {
  if (statusCode === 401) {
    return {
      message: "Votre session a expiré. Connectez-vous à nouveau.",
      ok: false,
      sessionExpired: true,
    };
  }

  if (statusCode === 403) {
    return {
      message: "Vous n'avez pas accès au dashboard chef de chantier.",
      ok: false,
    };
  }

  if (statusCode === 404) {
    return { message: "Le chantier demandé est introuvable.", ok: false };
  }

  if (statusCode === undefined) {
    return { message: "Impossible de joindre l'API SmartSite.", ok: false };
  }

  const apiMessage = error.message.join(" ").trim();

  return {
    message: apiMessage.length > 0 ? apiMessage : "Le chargement du dashboard a échoué.",
    ok: false,
  };
}
