import { z } from "zod";

import type { OrganizationResponseDto, RegisterResponseDto } from "@/generated/api";

const authSessionStorageKey = "smartsite.auth.session";

type JsonPrimitive = boolean | null | number | string;
type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];

interface JsonObject {
  readonly [key: string]: JsonValue;
}

const authSessionSchema = z.object({
  accessToken: z.string(),
  organization: z.object({
    createdAt: z.string(),
    email: z.string().nullable(),
    id: z.string(),
    name: z.string(),
  }),
  tokenType: z.string(),
  user: z.object({
    createdAt: z.string(),
    email: z.string(),
    firstName: z.string(),
    id: z.string(),
    lastName: z.string(),
    organizationId: z.string(),
    phone: z.string().nullable(),
    roles: z.array(z.string()),
    status: z.string(),
  }),
});

const accessTokenPayloadSchema = z.object({
  exp: z.number().int().positive(),
});

export function isOrganizationAdmin(session: RegisterResponseDto): boolean {
  return session.user.roles.includes("administrateur");
}

export function saveAuthSession(session: RegisterResponseDto): void {
  window.localStorage.setItem(authSessionStorageKey, JSON.stringify(session));
}

export function clearAuthSession(): void {
  if (!canUseBrowserStorage()) {
    return;
  }

  window.localStorage.removeItem(authSessionStorageKey);
}

export function readAuthSession(): RegisterResponseDto | null {
  if (!canUseBrowserStorage()) {
    return null;
  }

  const serializedSession = window.localStorage.getItem(authSessionStorageKey);

  if (!serializedSession) {
    return null;
  }

  const parsedStorage = parseJsonValue(serializedSession);

  if (!parsedStorage) {
    return null;
  }

  // Lecture défensive : localStorage peut être modifié hors de l'application.
  const parsedSession = authSessionSchema.safeParse(parsedStorage);

  if (!parsedSession.success || isAuthSessionExpired(parsedSession.data)) {
    clearAuthSession();
    return null;
  }

  return parsedSession.data;
}

export function isAuthSessionExpired(
  session: RegisterResponseDto,
  currentTimeMilliseconds = Date.now(),
): boolean {
  return getAuthSessionRemainingMilliseconds(session, currentTimeMilliseconds) <= 0;
}

export function getAuthSessionRemainingMilliseconds(
  session: RegisterResponseDto,
  currentTimeMilliseconds = Date.now(),
): number {
  const expirationTimeMilliseconds = getAccessTokenExpirationTimeMilliseconds(session.accessToken);

  if (expirationTimeMilliseconds === null) {
    return 0;
  }

  return Math.max(expirationTimeMilliseconds - currentTimeMilliseconds, 0);
}

export function saveOrganizationInAuthSession(
  session: RegisterResponseDto,
  organization: OrganizationResponseDto,
): RegisterResponseDto {
  const updatedSession: RegisterResponseDto = {
    ...session,
    organization: {
      createdAt: organization.createdAt,
      email: organization.email,
      id: organization.id,
      name: organization.name,
    },
  };

  saveAuthSession(updatedSession);

  return updatedSession;
}

export function getAuthSessionStorageKey(): string {
  return authSessionStorageKey;
}

function canUseBrowserStorage(): boolean {
  return typeof window !== "undefined";
}

function parseJsonValue(serializedValue: string): JsonValue | null {
  try {
    return JSON.parse(serializedValue) as JsonValue;
  } catch {
    return null;
  }
}

function getAccessTokenExpirationTimeMilliseconds(accessToken: string): number | null {
  const tokenParts = accessToken.split(".");
  const encodedPayload = tokenParts[1];

  if (tokenParts.length !== 3 || !encodedPayload) {
    return null;
  }

  const serializedPayload = decodeBase64Url(encodedPayload);

  if (!serializedPayload) {
    return null;
  }

  const parsedPayload = parseJsonValue(serializedPayload);
  const payload = accessTokenPayloadSchema.safeParse(parsedPayload);

  return payload.success ? payload.data.exp * 1000 : null;
}

function decodeBase64Url(encodedValue: string): string | null {
  const normalizedValue = encodedValue.replaceAll("-", "+").replaceAll("_", "/");
  const paddingLength = (4 - (normalizedValue.length % 4)) % 4;
  const paddedValue = `${normalizedValue}${"=".repeat(paddingLength)}`;

  try {
    return window.atob(paddedValue);
  } catch {
    return null;
  }
}
