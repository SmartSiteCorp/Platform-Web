const fallbackApiBaseUrl = "http://localhost:4000";

export function getApiBaseUrl(): string {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  return configuredBaseUrl && configuredBaseUrl.length > 0 ? configuredBaseUrl : fallbackApiBaseUrl;
}
