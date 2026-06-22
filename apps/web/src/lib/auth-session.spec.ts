import { beforeEach, describe, expect, it } from "vitest";

import {
  getAuthSessionRemainingMilliseconds,
  getAuthSessionStorageKey,
  isAuthSessionExpired,
  readAuthSession,
  saveAuthSession,
} from "@/lib/auth-session";
import { createAuthSessionFixture } from "@/test/auth-session-fixture";
import { createTestAccessToken } from "@/test/create-test-access-token";

const referenceTimeMilliseconds = Date.UTC(2026, 5, 2, 10, 0, 0);
const referenceTimeSeconds = referenceTimeMilliseconds / 1000;

describe("auth session", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("reads a valid stored session", () => {
    const authSessionFixture = createAuthSessionFixture();

    saveAuthSession(authSessionFixture);

    expect(readAuthSession()).toStrictEqual(authSessionFixture);
  });

  it("clears an expired stored session", () => {
    saveAuthSession(
      createAuthSessionFixture({ expiresAtSeconds: Math.floor(Date.now() / 1000) - 1 }),
    );

    expect(readAuthSession()).toBeNull();
    expect(window.localStorage.getItem(getAuthSessionStorageKey())).toBeNull();
  });

  it("computes the access token remaining time", () => {
    const session = {
      ...createAuthSessionFixture(),
      accessToken: createTestAccessToken(referenceTimeSeconds + 60),
    };

    expect(getAuthSessionRemainingMilliseconds(session, referenceTimeMilliseconds)).toBe(60000);
    expect(isAuthSessionExpired(session, referenceTimeMilliseconds)).toBe(false);
  });
});
