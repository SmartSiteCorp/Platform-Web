import {
  authControllerRegister,
  type AuthControllerRegisterError,
  type RegisterRequestDto,
  type RegisterResponseDto,
} from "@/generated/api";
import { getApiBaseUrl } from "@/lib/api-config";

export type RegisterAccountResult =
  | {
      readonly account: RegisterResponseDto;
      readonly ok: true;
    }
  | {
      readonly message: string;
      readonly ok: false;
    };

export async function registerAccount(request: RegisterRequestDto): Promise<RegisterAccountResult> {
  const response = await authControllerRegister({
    baseUrl: getApiBaseUrl(),
    body: request,
  });

  if (response.error) {
    return {
      message: getRegistrationErrorMessage(response.error, response.response?.status),
      ok: false,
    };
  }

  return {
    account: response.data,
    ok: true,
  };
}

function getRegistrationErrorMessage(
  error: AuthControllerRegisterError,
  statusCode: number | undefined,
): string {
  if (statusCode === undefined) {
    return "Impossible de joindre l'API SmartSite.";
  }

  const apiMessage = error.message.join(" ");

  if (apiMessage.trim().length > 0) {
    return apiMessage;
  }

  return getFallbackRegistrationErrorMessage(statusCode);
}

function getFallbackRegistrationErrorMessage(statusCode: number): string {
  if (statusCode === 409) {
    return "Un compte existe déjà avec cet email.";
  }

  if (statusCode === 400) {
    return "Les informations d'inscription sont invalides.";
  }

  return "L'inscription n'a pas pu être finalisée.";
}
