const defaultApiPort = 4000;
const defaultLocalDatabaseUrl = "postgres://smartsite:smartsite@127.0.0.1:5433/smartsite";

export function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    return databaseUrl;
  }

  if (process.env.NODE_ENV === "production") {
    return getRequiredEnv("DATABASE_URL");
  }

  return defaultLocalDatabaseUrl;
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

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}
