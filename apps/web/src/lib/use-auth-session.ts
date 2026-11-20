"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { RegisterResponseDto } from "@/generated/api";
import {
  clearAuthSession,
  getAuthSessionRemainingMilliseconds,
  readAuthSession,
} from "@/lib/auth-session";

const loginPath = "/login";

export interface RequiredAuthSessionState {
  readonly isCheckingSession: boolean;
  readonly session: RegisterResponseDto | null;
}

export function useRequiredAuthSession(): RequiredAuthSessionState {
  const router = useRouter();
  const [sessionState, setSessionState] = useState<RequiredAuthSessionState>({
    isCheckingSession: true,
    session: null,
  });

  useEffect(() => {
    const storedSession = readAuthSession();

    if (!storedSession) {
      clearAuthSession();
      router.replace(loginPath);
      setSessionState({ isCheckingSession: false, session: null });
      return;
    }

    setSessionState({ isCheckingSession: false, session: storedSession });
  }, [router]);

  useAuthSessionExpiration(sessionState.session);

  return sessionState;
}

export function useAuthSessionExpiration(session: RegisterResponseDto | null): void {
  const router = useRouter();

  useEffect(() => {
    if (!session) {
      return;
    }

    const remainingMilliseconds = getAuthSessionRemainingMilliseconds(session);

    if (remainingMilliseconds <= 0) {
      clearAuthSession();
      router.replace(loginPath);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      clearAuthSession();
      router.replace(loginPath);
    }, remainingMilliseconds);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [router, session]);
}
