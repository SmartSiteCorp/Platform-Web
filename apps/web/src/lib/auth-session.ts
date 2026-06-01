import type { RegisterResponseDto } from "@/generated/api";

const authSessionStorageKey = "smartsite.auth.session";

export function saveAuthSession(session: RegisterResponseDto): void {
  window.localStorage.setItem(authSessionStorageKey, JSON.stringify(session));
}

export function getAuthSessionStorageKey(): string {
  return authSessionStorageKey;
}
