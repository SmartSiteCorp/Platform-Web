import type { RegisterResponseDto } from "@/generated/api";
import { createTestAccessToken } from "@/test/create-test-access-token";

interface AuthSessionFixtureOptions {
  readonly expiresAtSeconds?: number;
  readonly roles?: readonly string[];
}

export function createAuthSessionFixture({
  expiresAtSeconds = Math.floor(Date.now() / 1000) + 3600,
  roles = ["administrateur"],
}: AuthSessionFixtureOptions = {}): RegisterResponseDto {
  return {
    accessToken: createTestAccessToken(expiresAtSeconds),
    organization: {
      createdAt: "2026-06-01T10:00:00.000Z",
      email: "contact@smartsite.fr",
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
      roles: [...roles],
      status: "active",
    },
  };
}
