import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  getApiPort,
  getAppOrigin,
  getEnvironmentFilePaths,
  getJwtAccessExpiresInSeconds,
  getJwtAccessSecret,
  getNodeEnvironment,
  getRegisterRateLimitLimit,
  getRegisterRateLimitTtlMilliseconds,
  loadEnvironmentVariables,
} from "./environment.js";

const originalEnvironment = { ...process.env };
const originalWorkingDirectory = process.cwd();

afterEach(() => {
  process.env = { ...originalEnvironment };
  process.chdir(originalWorkingDirectory);
});

describe("environment", () => {
  it("loads the environment-specific files before shared files", () => {
    process.env.NODE_ENV = "test";

    expect(getEnvironmentFilePaths()).toStrictEqual([
      "apps/api/.env.test.local",
      "apps/api/.env.test",
      ".env.test.local",
      ".env.test",
      "apps/api/.env.local",
      "apps/api/.env",
      ".env.local",
      ".env",
    ]);
  });

  it("accepts the supported runtime environments", () => {
    process.env.NODE_ENV = "production";

    expect(getNodeEnvironment()).toBe("production");
  });

  it("rejects an unsupported runtime environment", () => {
    process.env.NODE_ENV = "staging";

    expect(() => getNodeEnvironment()).toThrow("NODE_ENV must be one of");
  });

  it("keeps local defaults for non-sensitive values", () => {
    delete process.env.API_PORT;
    delete process.env.APP_ORIGIN;
    delete process.env.AUTH_REGISTER_RATE_LIMIT_LIMIT;
    delete process.env.AUTH_REGISTER_RATE_LIMIT_TTL_SECONDS;
    process.env.NODE_ENV = "development";

    expect(getApiPort()).toBe(4000);
    expect(getAppOrigin()).toBe("http://localhost:3000");
    expect(getRegisterRateLimitLimit()).toBe(5);
    expect(getRegisterRateLimitTtlMilliseconds()).toBe(60000);
  });

  it("requires production app origin and a strong JWT secret", () => {
    delete process.env.APP_ORIGIN;
    process.env.JWT_ACCESS_SECRET = "too-short";
    process.env.NODE_ENV = "production";

    expect(() => getAppOrigin()).toThrow("APP_ORIGIN is required in production.");
    expect(() => getJwtAccessSecret()).toThrow("JWT_ACCESS_SECRET must contain");
  });

  it("rejects malformed numeric environment values", () => {
    process.env.API_PORT = "4000-dev";

    expect(() => getApiPort()).toThrow("API_PORT must be a positive integer.");
  });

  it("loads existing env files without overriding process values", () => {
    const temporaryDirectory = mkdtempSync(join(tmpdir(), "smartsite-env-"));

    try {
      process.chdir(temporaryDirectory);
      mkdirSync("apps/api", { recursive: true });
      writeFileSync(
        "apps/api/.env.test.local",
        [
          "DATABASE_URL=postgres://specific",
          "JWT_ACCESS_SECRET=specific-secret-with-more-than-32-characters",
          "APP_ORIGIN=http://specific.local",
        ].join("\n"),
        "utf8",
      );
      writeFileSync(
        ".env",
        ["DATABASE_URL=postgres://shared", "AUTH_REGISTER_RATE_LIMIT_LIMIT=9"].join("\n"),
        "utf8",
      );
      process.env.NODE_ENV = "test";
      process.env.JWT_ACCESS_SECRET = "existing-secret-with-more-than-32-characters";
      delete process.env.DATABASE_URL;
      delete process.env.APP_ORIGIN;
      delete process.env.AUTH_REGISTER_RATE_LIMIT_LIMIT;

      loadEnvironmentVariables();

      expect(process.env.DATABASE_URL).toBe("postgres://specific");
      expect(process.env.APP_ORIGIN).toBe("http://specific.local");
      expect(process.env.JWT_ACCESS_SECRET).toBe("existing-secret-with-more-than-32-characters");
      expect(process.env.AUTH_REGISTER_RATE_LIMIT_LIMIT).toBe("9");
    } finally {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  });
});

describe("JWT environment", () => {
  it("requires the JWT secret from the environment", () => {
    delete process.env.JWT_ACCESS_SECRET;

    expect(() => getJwtAccessSecret()).toThrow("JWT_ACCESS_SECRET is required.");
  });

  it("uses the configured JWT access token expiration", () => {
    delete process.env.JWT_ACCESS_EXPIRES_IN_SECONDS;

    expect(getJwtAccessExpiresInSeconds()).toBe(25200);

    process.env.JWT_ACCESS_EXPIRES_IN_SECONDS = "900";

    expect(getJwtAccessExpiresInSeconds()).toBe(900);
  });
});
