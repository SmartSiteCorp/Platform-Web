import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  getApiPort,
  getAppOrigin,
  getEmailProviderConfiguration,
  getEnvironmentFilePaths,
  getJwtAccessExpiresInSeconds,
  getJwtAccessSecret,
  getNodeEnvironment,
  getOrganizationInvitationExpiresInSeconds,
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
    delete process.env.EMAIL_PROVIDER;
    delete process.env.EMAIL_FROM_ADDRESS;
    delete process.env.ORGANIZATION_INVITATION_EXPIRES_IN_SECONDS;
    process.env.NODE_ENV = "development";

    expect(getApiPort()).toBe(4000);
    expect(getAppOrigin()).toBe("http://localhost:3000");
    expect(getEmailProviderConfiguration()).toStrictEqual({
      fromAddress: "no-reply@smartsite.local",
      httpBearerToken: null,
      httpEndpoint: null,
      provider: "log",
      smtp: null,
    });
    expect(getOrganizationInvitationExpiresInSeconds()).toBe(604800);
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
});

describe("environment file loading", () => {
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

describe("email environment", () => {
  it("uses the configured HTTP email provider", () => {
    process.env.EMAIL_PROVIDER = "http";
    process.env.EMAIL_FROM_ADDRESS = "no-reply@smartsite.fr";
    process.env.EMAIL_HTTP_BEARER_TOKEN = "provider-token";
    process.env.EMAIL_HTTP_ENDPOINT = "https://email.smartsite.test/send";

    expect(getEmailProviderConfiguration()).toStrictEqual({
      fromAddress: "no-reply@smartsite.fr",
      httpBearerToken: "provider-token",
      httpEndpoint: "https://email.smartsite.test/send",
      provider: "http",
      smtp: null,
    });
  });

  it("uses the configured SMTP email provider", () => {
    process.env.EMAIL_PROVIDER = "smtp";
    process.env.EMAIL_FROM_ADDRESS = "andreearbb@gmail.com";
    process.env.EMAIL_SMTP_HOST = "smtp.gmail.com";
    process.env.EMAIL_SMTP_PASSWORD = "application-password";
    process.env.EMAIL_SMTP_PORT = "465";
    process.env.EMAIL_SMTP_SECURE = "true";
    process.env.EMAIL_SMTP_USER = "andreearbb@gmail.com";

    expect(getEmailProviderConfiguration()).toStrictEqual({
      fromAddress: "andreearbb@gmail.com",
      httpBearerToken: null,
      httpEndpoint: null,
      provider: "smtp",
      smtp: {
        host: "smtp.gmail.com",
        password: "application-password",
        port: 465,
        secure: true,
        user: "andreearbb@gmail.com",
      },
    });
  });

  it("rejects invalid email provider configuration", () => {
    process.env.EMAIL_PROVIDER = "graph";

    expect(() => getEmailProviderConfiguration()).toThrow("EMAIL_PROVIDER must be one of");

    process.env.EMAIL_PROVIDER = "http";
    process.env.EMAIL_FROM_ADDRESS = "no-reply@smartsite.fr";
    process.env.EMAIL_HTTP_ENDPOINT = "not-an-url";

    expect(() => getEmailProviderConfiguration()).toThrow(
      "EMAIL_HTTP_ENDPOINT must be a valid URL.",
    );

    process.env.EMAIL_PROVIDER = "smtp";
    process.env.EMAIL_FROM_ADDRESS = "andreearbb@gmail.com";
    process.env.EMAIL_SMTP_HOST = "smtp.gmail.com";
    process.env.EMAIL_SMTP_PASSWORD = "application-password";
    process.env.EMAIL_SMTP_SECURE = "yes";
    process.env.EMAIL_SMTP_USER = "andreearbb@gmail.com";

    expect(() => getEmailProviderConfiguration()).toThrow(
      "EMAIL_SMTP_SECURE must be true or false.",
    );
  });

  it("requires explicit email configuration in production", () => {
    process.env.NODE_ENV = "production";
    delete process.env.EMAIL_PROVIDER;
    delete process.env.EMAIL_FROM_ADDRESS;

    expect(() => getEmailProviderConfiguration()).toThrow(
      "EMAIL_PROVIDER is required in production.",
    );

    process.env.EMAIL_PROVIDER = "log";

    expect(() => getEmailProviderConfiguration()).toThrow(
      "EMAIL_FROM_ADDRESS is required for the configured email provider.",
    );
  });

  it("uses the configured organization invitation expiration", () => {
    process.env.ORGANIZATION_INVITATION_EXPIRES_IN_SECONDS = "3600";

    expect(getOrganizationInvitationExpiresInSeconds()).toBe(3600);
  });
});
