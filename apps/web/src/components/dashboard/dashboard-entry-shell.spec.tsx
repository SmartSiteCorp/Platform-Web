import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RegisterResponseDto } from "@/generated/api";
import { createAuthSessionFixture } from "@/test/auth-session-fixture";
import { DashboardEntryShell } from "./dashboard-entry-shell";

const routerMock = vi.hoisted(() => ({
  replace: vi.fn<(url: string) => void>(),
}));

const authSessionMock = vi.hoisted(() => ({
  isCheckingSession: false,
  session: null as RegisterResponseDto | null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("@/lib/use-auth-session", () => ({
  useRequiredAuthSession: () => authSessionMock,
}));

vi.mock("./dashboard-shell", () => ({
  DashboardShell: () => <div>Dashboard chef de chantier</div>,
}));

beforeEach(() => {
  authSessionMock.isCheckingSession = false;
  authSessionMock.session = null;
  routerMock.replace.mockClear();
  window.history.replaceState(null, "", "/dashboard");
});

describe("DashboardEntryShell", () => {
  it("affiche le dashboard chef pour les roles chantier", () => {
    authSessionMock.session = createAuthSessionFixture({
      roles: ["chef_chantier"],
    });

    render(<DashboardEntryShell />);

    expect(screen.getByText("Dashboard chef de chantier")).toBeInTheDocument();
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it("redirige un droniste seul vers son dashboard", async () => {
    authSessionMock.session = createAuthSessionFixture({
      roles: ["droniste"],
    });
    window.history.replaceState(null, "", "/dashboard?siteId=site-id-1");

    render(<DashboardEntryShell />);

    expect(screen.getByText("Ouverture du dashboard droniste...")).toBeInTheDocument();
    await waitFor(() => {
      expect(routerMock.replace).toHaveBeenCalledWith("/dashboard/drone-operator?siteId=site-id-1");
    });
  });

  it("redirige un architecte seul vers son dashboard", async () => {
    authSessionMock.session = createAuthSessionFixture({
      roles: ["architecte"],
    });
    window.history.replaceState(null, "", "/dashboard?siteId=site-id-2");

    render(<DashboardEntryShell />);

    expect(screen.getByText("Ouverture du dashboard architecte...")).toBeInTheDocument();
    await waitFor(() => {
      expect(routerMock.replace).toHaveBeenCalledWith("/dashboard/architect?siteId=site-id-2");
    });
  });
});
