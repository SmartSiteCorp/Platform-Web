import { type ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { describe, expect, it } from "vitest";

import type { OptionalAuthenticatedRequest } from "./authenticated-request.js";
import type { AccessTokenPayload } from "./auth.types.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";

const jwtSecret = "smartsite-test-route-protection-secret";

const accessTokenPayload: AccessTokenPayload = {
  email: "andreea@smartsite.test",
  organizationId: "organization-id",
  roles: ["administrateur"],
  sub: "user-id",
};

describe("JwtAuthGuard", () => {
  it("attache le payload JWT valide a la requete", async () => {
    const jwtService = createJwtService();
    const guard = new JwtAuthGuard(jwtService);
    const accessToken = await jwtService.signAsync(accessTokenPayload);
    const request = createRequest(`Bearer ${accessToken}`);

    await expect(guard.canActivate(createExecutionContext(request))).resolves.toBe(true);

    expect(request.auth).toMatchObject(accessTokenPayload);
  });

  it("refuse les routes privees sans token", async () => {
    const guard = new JwtAuthGuard(createJwtService());
    const request = createRequest();

    await expect(guard.canActivate(createExecutionContext(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("refuse un header Authorization mal forme", async () => {
    const guard = new JwtAuthGuard(createJwtService());
    const request = createRequest("Basic token-invalide");

    await expect(guard.canActivate(createExecutionContext(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("refuse un token JWT invalide", async () => {
    const guard = new JwtAuthGuard(createJwtService());
    const request = createRequest("Bearer token-invalide");

    await expect(guard.canActivate(createExecutionContext(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

function createJwtService(): JwtService {
  return new JwtService({ secret: jwtSecret });
}

function createRequest(authorizationHeader?: string): OptionalAuthenticatedRequest {
  return {
    headers: authorizationHeader ? { authorization: authorizationHeader } : {},
  } as OptionalAuthenticatedRequest;
}

function createExecutionContext(request: OptionalAuthenticatedRequest): ExecutionContext {
  // Contexte minimal pour tester le guard sans serveur Nest complet.
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}
