import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthControllerLoginError, LoginRequestDto, LoginResponseDto } from "@/generated/api";
import { loginAccount } from "@/lib/login-account";

interface LoginApiOptions {
  readonly baseUrl: string;
  readonly body: LoginRequestDto;
}

type LoginApiResult =
  | {
      readonly data: LoginResponseDto;
      readonly error: undefined;
      readonly response: { readonly status: 200 };
    }
  | {
      readonly data: undefined;
      readonly error: AuthControllerLoginError;
      readonly response?: { readonly status: number };
    };

const loginApiMock = vi.hoisted(() => ({
  authControllerLogin: vi.fn<(options: LoginApiOptions) => Promise<LoginApiResult>>(),
}));

vi.mock("@/generated/api", () => ({
  authControllerLogin: loginApiMock.authControllerLogin,
}));

const loginRequest: LoginRequestDto = {
  email: "andreea@smartsite.fr",
  password: "SmartSite.2026",
};

const loggedAccount: LoginResponseDto = {
  accessToken: "access-token",
  organization: {
    createdAt: "2026-06-01T10:00:00.000Z",
    email: "andreea@smartsite.fr",
    id: "organization-id",
    name: "Stern Tech",
  },
  tokenType: "Bearer",
  user: {
    createdAt: "2026-06-01T10:00:00.000Z",
    email: "andreea@smartsite.fr",
    firstName: "Andreea",
    id: "user-id",
    lastName: "Rauta",
    organizationId: "organization-id",
    phone: null,
    roles: ["administrateur"],
    status: "active",
  },
};

describe("loginAccount", () => {
  beforeEach(() => {
    loginApiMock.authControllerLogin.mockReset();
  });

  it("calls the generated login client and returns the account", async () => {
    loginApiMock.authControllerLogin.mockResolvedValue({
      data: loggedAccount,
      error: undefined,
      response: { status: 200 },
    });

    const result = await loginAccount(loginRequest);

    expect(loginApiMock.authControllerLogin).toHaveBeenCalledWith({
      baseUrl: "http://localhost:4000",
      body: loginRequest,
    });
    expect(result).toStrictEqual({ account: loggedAccount, ok: true });
  });

  it("returns a generic message for incorrect credentials", async () => {
    loginApiMock.authControllerLogin.mockResolvedValue({
      data: undefined,
      error: { message: ["Compte introuvable"], statusCode: 401 },
      response: { status: 401 },
    });

    const result = await loginAccount(loginRequest);

    expect(result).toStrictEqual({ message: "Email ou mot de passe incorrect.", ok: false });
  });

  it("returns a network message when the API cannot be reached", async () => {
    loginApiMock.authControllerLogin.mockResolvedValue({
      data: undefined,
      error: { message: [], statusCode: 500 },
    });

    const result = await loginAccount(loginRequest);

    expect(result).toStrictEqual({ message: "Impossible de joindre l'API SmartSite.", ok: false });
  });
});
