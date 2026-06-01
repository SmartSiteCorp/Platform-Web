const defaultApiPort = 4000;
const defaultJwtAccessExpiresInSeconds = 3600;

export function getDatabaseUrl(): string {
  return getRequiredEnv("DATABASE_URL");
}

export function getAppOrigin(): string {
  return process.env.APP_ORIGIN ?? "http://localhost:3000";
}

export function getApiPort(): number {
  const rawPort = process.env.API_PORT;

  if (!rawPort) {
    return defaultApiPort;
  }

  const port = Number.parseInt(rawPort, 10);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("API_PORT must be a positive integer.");
  }

  return port;
}

export function getJwtAccessSecret(): string {
  return getRequiredEnv("JWT_ACCESS_SECRET");
}

export function getJwtAccessExpiresInSeconds(): number {
  const rawValue = process.env.JWT_ACCESS_EXPIRES_IN_SECONDS;

  if (!rawValue) {
    return defaultJwtAccessExpiresInSeconds;
  }

  const expiresInSeconds = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(expiresInSeconds) || expiresInSeconds <= 0) {
    throw new Error("JWT_ACCESS_EXPIRES_IN_SECONDS must be a positive integer.");
  }

  return expiresInSeconds;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}
