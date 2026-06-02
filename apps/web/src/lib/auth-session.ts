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

export function saveAuthSession(session: RegisterResponseDto): void {
  window.localStorage.setItem(authSessionStorageKey, JSON.stringify(session));
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

  return parsedSession.success ? parsedSession.data : null;
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
