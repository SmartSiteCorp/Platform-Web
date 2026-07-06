import {
  dashboardControllerGetDroneOperatorDashboard,
  dashboardControllerGetSiteManagerDashboard,
  type ApiErrorResponseDto,
  type DroneOperatorDashboardResponseDto,
  type SiteManagerDashboardResponseDto,
} from "@/generated/api";
import { getApiBaseUrl } from "@/lib/api-config";

interface DashboardErrorMessages {
  readonly default: string;
  readonly forbidden: string;
  readonly notFound: string;
}

type DashboardLoadErrorResult = {
  readonly message: string;
  readonly ok: false;
  readonly sessionExpired?: true;
};

export type LoadSiteManagerDashboardResult =
  | { readonly dashboard: SiteManagerDashboardResponseDto; readonly ok: true }
  | DashboardLoadErrorResult;

export type LoadDroneOperatorDashboardResult =
  | { readonly dashboard: DroneOperatorDashboardResponseDto; readonly ok: true }
  | DashboardLoadErrorResult;

export async function loadSiteManagerDashboard(
  accessToken: string,
  siteId: string | null,
): Promise<LoadSiteManagerDashboardResult> {
  const requestOptions = siteId
    ? { auth: accessToken, baseUrl: getApiBaseUrl(), query: { siteId } }
    : { auth: accessToken, baseUrl: getApiBaseUrl() };
  const response = await dashboardControllerGetSiteManagerDashboard(requestOptions);

  if (response.error) {
    return buildDashboardErrorResult(response.error, response.response?.status, {
      default: "Le chargement du dashboard a échoué.",
      forbidden: "Vous n'avez pas accès au dashboard chef de chantier.",
      notFound: "Le chantier demandé est introuvable.",
    });
  }

  return { dashboard: response.data, ok: true };
}

export async function loadDroneOperatorDashboard(
  accessToken: string,
  siteId: string | null,
): Promise<LoadDroneOperatorDashboardResult> {
  const requestOptions = siteId
    ? { auth: accessToken, baseUrl: getApiBaseUrl(), query: { siteId } }
    : { auth: accessToken, baseUrl: getApiBaseUrl() };
  const response = await dashboardControllerGetDroneOperatorDashboard(requestOptions);

  if (response.error) {
    return buildDashboardErrorResult(response.error, response.response?.status, {
      default: "Le chargement du dashboard droniste a échoué.",
      forbidden: "Vous n'avez pas accès au dashboard droniste.",
      notFound: "Le chantier demandé est introuvable pour ce droniste.",
    });
  }

  return { dashboard: response.data, ok: true };
}

function buildDashboardErrorResult(
  error: ApiErrorResponseDto,
  statusCode: number | undefined,
  messages: DashboardErrorMessages,
): DashboardLoadErrorResult {
  if (statusCode === 401) {
    return {
      message: "Votre session a expiré. Connectez-vous à nouveau.",
      ok: false,
      sessionExpired: true,
    };
  }

  if (statusCode === 403) {
    return {
      message: messages.forbidden,
      ok: false,
    };
  }

  if (statusCode === 404) {
    return { message: messages.notFound, ok: false };
  }

  if (statusCode === undefined) {
    return { message: "Impossible de joindre l'API SmartSite.", ok: false };
  }

  const apiMessage = error.message.join(" ").trim();

  return {
    message: apiMessage.length > 0 ? apiMessage : messages.default,
    ok: false,
  };
}
