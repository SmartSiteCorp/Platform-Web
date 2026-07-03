import { existsSync } from "node:fs";

import { config as loadDotenvFile } from "dotenv";

const defaultApiPort = 4000;
const defaultDashboardRefreshIntervalSeconds = 30;
const defaultInvitationExpiresInSeconds = 604800;
const defaultJwtAccessExpiresInSeconds = 25200;
const defaultRegisterRateLimitLimit = 5;
const defaultRegisterRateLimitTtlSeconds = 60;
const defaultEmailSmtpPort = 587;
const defaultEmailSmtpSecure = false;
const supportedEmailProviders = ["log", "http", "smtp"] as const;
const jwtAccessSecretMinLength = 32;
const supportedNodeEnvironments = ["development", "test", "production"] as const;

export type EmailProvider = (typeof supportedEmailProviders)[number];

export type NodeEnvironment = (typeof supportedNodeEnvironments)[number];

export interface EmailSmtpConfiguration {
  readonly host: string;
  readonly password: string;
  readonly port: number;
  readonly secure: boolean;
  readonly user: string;
}

export type EmailProviderConfiguration =
  | {
      readonly fromAddress: string;
      readonly httpBearerToken: string | null;
      readonly httpEndpoint: null;
      readonly provider: "log";
      readonly smtp: null;
    }
  | {
      readonly fromAddress: string;
      readonly httpBearerToken: string | null;
      readonly httpEndpoint: string;
      readonly provider: "http";
      readonly smtp: null;
    }
  | {
      readonly fromAddress: string;
      readonly httpBearerToken: null;
      readonly httpEndpoint: null;
      readonly provider: "smtp";
      readonly smtp: EmailSmtpConfiguration;
    };

export function getNodeEnvironment(): NodeEnvironment {
  const rawEnvironment = process.env.NODE_ENV?.trim();

  if (!rawEnvironment) {
    return "development";
  }

  if (isNodeEnvironment(rawEnvironment)) {
    return rawEnvironment;
  }

  throw new Error("NODE_ENV must be one of: development, test, production.");
}

export function getEnvironmentFilePaths(): string[] {
  const environment = getNodeEnvironment();

  return [
    `apps/api/.env.${environment}.local`,
    `apps/api/.env.${environment}`,
    `.env.${environment}.local`,
    `.env.${environment}`,
    "apps/api/.env.local",
    "apps/api/.env",
    ".env.local",
    ".env",
  ];
}

export function loadEnvironmentVariables(): void {
  for (const environmentFilePath of getEnvironmentFilePaths()) {
    if (existsSync(environmentFilePath)) {
      loadDotenvFile({ path: environmentFilePath, override: false, quiet: true });
    }
  }
}

export function getDatabaseUrl(): string {
  return getRequiredEnv("DATABASE_URL");
}

export function getAppOrigin(): string {
  const origin = process.env.APP_ORIGIN?.trim();

  if (origin) {
    return origin;
  }

  if (getNodeEnvironment() === "production") {
    throw new Error("APP_ORIGIN is required in production.");
  }

  return "http://localhost:3000";
}

export function getApiPort(): number {
  return getOptionalPositiveIntegerEnv("API_PORT", defaultApiPort);
}

export function getJwtAccessSecret(): string {
  const secret = getRequiredEnv("JWT_ACCESS_SECRET");

  if (secret.length < jwtAccessSecretMinLength) {
    throw new Error("JWT_ACCESS_SECRET must contain at least 32 characters.");
  }

  return secret;
}

export function getJwtAccessExpiresInSeconds(): number {
  return getOptionalPositiveIntegerEnv(
    "JWT_ACCESS_EXPIRES_IN_SECONDS",
    defaultJwtAccessExpiresInSeconds,
  );
}

export function getDashboardRefreshIntervalSeconds(): number {
  return getOptionalPositiveIntegerEnv(
    "DASHBOARD_REFRESH_INTERVAL_SECONDS",
    defaultDashboardRefreshIntervalSeconds,
  );
}

export function getOrganizationInvitationExpiresInSeconds(): number {
  return getOptionalPositiveIntegerEnv(
    "ORGANIZATION_INVITATION_EXPIRES_IN_SECONDS",
    defaultInvitationExpiresInSeconds,
  );
}

export function getEmailProviderConfiguration(): EmailProviderConfiguration {
  const provider = getEmailProvider();
  const fromAddress = getEmailFromAddress(provider);
  const httpBearerToken = getOptionalEnv("EMAIL_HTTP_BEARER_TOKEN");

  if (provider === "http") {
    return {
      fromAddress,
      httpBearerToken,
      httpEndpoint: getRequiredEmailHttpEndpoint(),
      provider,
      smtp: null,
    };
  }

  if (provider === "smtp") {
    return {
      fromAddress,
      httpBearerToken: null,
      httpEndpoint: null,
      provider,
      smtp: getRequiredEmailSmtpConfiguration(),
    };
  }

  return {
    fromAddress,
    httpBearerToken,
    httpEndpoint: null,
    provider,
    smtp: null,
  };
}

export function getRegisterRateLimitLimit(): number {
  return getOptionalPositiveIntegerEnv(
    "AUTH_REGISTER_RATE_LIMIT_LIMIT",
    defaultRegisterRateLimitLimit,
  );
}

export function getRegisterRateLimitTtlMilliseconds(): number {
  return (
    getOptionalPositiveIntegerEnv(
      "AUTH_REGISTER_RATE_LIMIT_TTL_SECONDS",
      defaultRegisterRateLimitTtlSeconds,
    ) * 1000
  );
}

function getOptionalPositiveIntegerEnv(name: string, defaultValue: number): number {
  const rawValue = process.env[name]?.trim();

  if (!rawValue) {
    return defaultValue;
  }

  return parsePositiveInteger(name, rawValue);
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function getOptionalEnv(name: string): string | null {
  const value = process.env[name]?.trim();

  return value ? value : null;
}

function getOptionalBooleanEnv(name: string, defaultValue: boolean): boolean {
  const rawValue = process.env[name]?.trim().toLowerCase();

  if (!rawValue) {
    return defaultValue;
  }

  if (rawValue === "true") {
    return true;
  }

  if (rawValue === "false") {
    return false;
  }

  throw new Error(`${name} must be true or false.`);
}

function getEmailProvider(): EmailProvider {
  const rawProvider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();

  if (!rawProvider) {
    if (getNodeEnvironment() === "production") {
      throw new Error("EMAIL_PROVIDER is required in production.");
    }

    return "log";
  }

  if (isEmailProvider(rawProvider)) {
    return rawProvider;
  }

  throw new Error("EMAIL_PROVIDER must be one of: log, http, smtp.");
}

function getEmailFromAddress(provider: EmailProvider): string {
  const fromAddress = getOptionalEnv("EMAIL_FROM_ADDRESS");

  if (fromAddress) {
    return fromAddress;
  }

  if (getNodeEnvironment() === "production" || provider === "http" || provider === "smtp") {
    throw new Error("EMAIL_FROM_ADDRESS is required for the configured email provider.");
  }

  return "no-reply@smartsite.local";
}

function getRequiredEmailSmtpConfiguration(): EmailSmtpConfiguration {
  return {
    host: getRequiredEnv("EMAIL_SMTP_HOST"),
    password: getRequiredEnv("EMAIL_SMTP_PASSWORD"),
    port: getOptionalPositiveIntegerEnv("EMAIL_SMTP_PORT", defaultEmailSmtpPort),
    secure: getOptionalBooleanEnv("EMAIL_SMTP_SECURE", defaultEmailSmtpSecure),
    user: getRequiredEnv("EMAIL_SMTP_USER"),
  };
}

function getRequiredEmailHttpEndpoint(): string {
  const endpoint = getRequiredEnv("EMAIL_HTTP_ENDPOINT");

  try {
    return new URL(endpoint).toString();
  } catch {
    throw new Error("EMAIL_HTTP_ENDPOINT must be a valid URL.");
  }
}

function parsePositiveInteger(name: string, value: string): number {
  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0 || parsedValue.toString() !== value) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsedValue;
}

function isNodeEnvironment(value: string): value is NodeEnvironment {
  for (const environment of supportedNodeEnvironments) {
    if (environment === value) {
      return true;
    }
  }

  return false;
}

function isEmailProvider(value: string): value is EmailProvider {
  for (const provider of supportedEmailProviders) {
    if (provider === value) {
      return true;
    }
  }

  return false;
}
