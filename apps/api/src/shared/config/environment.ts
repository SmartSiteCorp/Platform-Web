import { existsSync } from "node:fs";

import { config as loadDotenvFile } from "dotenv";

const defaultApiPort = 4000;
const defaultJwtAccessExpiresInSeconds = 3600;
const defaultRegisterRateLimitLimit = 5;
const defaultRegisterRateLimitTtlSeconds = 60;
const jwtAccessSecretMinLength = 32;
const supportedNodeEnvironments = ["development", "test", "production"] as const;

export type NodeEnvironment = (typeof supportedNodeEnvironments)[number];

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
