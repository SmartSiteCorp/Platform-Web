import {
  authControllerLogin,
  type AuthControllerLoginError,
  type LoginRequestDto,
  type LoginResponseDto,
} from "@/generated/api";
import { getApiBaseUrl } from "@/lib/api-config";

export type LoginAccountResult =
  | {
      readonly account: LoginResponseDto;
      readonly ok: true;
    }
  | {
      readonly message: string;
      readonly ok: false;
    };

export async function loginAccount(request: LoginRequestDto): Promise<LoginAccountResult> {
  const response = await authControllerLogin({
    baseUrl: getApiBaseUrl(),
    body: request,
  });

  if (response.error) {
    return {
      message: getLoginErrorMessage(response.error, response.response?.status),
      ok: false,
    };
  }

  return {
    account: response.data,
    ok: true,
  };
}

function getLoginErrorMessage(
  error: AuthControllerLoginError,
  statusCode: number | undefined,
): string {
  if (statusCode === undefined) {
    return "Impossible de joindre l'API SmartSite.";
  }

  if (statusCode === 401) {
    // Message volontairement unique pour ne pas indiquer quel champ est faux.
    return "Email ou mot de passe incorrect.";
  }

  const apiMessage = error.message.join(" ").trim();

  if (apiMessage.length > 0) {
    return apiMessage;
  }

  return getFallbackLoginErrorMessage(statusCode);
}

function getFallbackLoginErrorMessage(statusCode: number): string {
  if (statusCode === 400) {
    return "Les informations de connexion sont invalides.";
  }

  return "La connexion n'a pas pu être finalisée.";
}
