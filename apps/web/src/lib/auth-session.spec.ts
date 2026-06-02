import { beforeEach, describe, expect, it } from "vitest";

import type { RegisterResponseDto } from "@/generated/api";
import {
  getAuthSessionRemainingMilliseconds,
  getAuthSessionStorageKey,
  isAuthSessionExpired,
  readAuthSession,
  saveAuthSession,
} from "@/lib/auth-session";
import { createTestAccessToken } from "@/test/create-test-access-token";

const referenceTimeMilliseconds = Date.UTC(2026, 5, 2, 10, 0, 0);
const referenceTimeSeconds = referenceTimeMilliseconds / 1000;

const authSessionFixture: RegisterResponseDto = {
  accessToken: createTestAccessToken(Math.floor(Date.now() / 1000) + 3600),
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
    roles: ["administrateur"],
    status: "active",
  },
};

describe("auth session", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("reads a valid stored session", () => {
    saveAuthSession(authSessionFixture);

    expect(readAuthSession()).toStrictEqual(authSessionFixture);
  });

  it("clears an expired stored session", () => {
    saveAuthSession({
      ...authSessionFixture,
      accessToken: createTestAccessToken(Math.floor(Date.now() / 1000) - 1),
    });

    expect(readAuthSession()).toBeNull();
    expect(window.localStorage.getItem(getAuthSessionStorageKey())).toBeNull();
  });

  it("computes the access token remaining time", () => {
    const session = {
      ...authSessionFixture,
      accessToken: createTestAccessToken(referenceTimeSeconds + 60),
    };

    expect(getAuthSessionRemainingMilliseconds(session, referenceTimeMilliseconds)).toBe(60000);
    expect(isAuthSessionExpired(session, referenceTimeMilliseconds)).toBe(false);
  });
});
