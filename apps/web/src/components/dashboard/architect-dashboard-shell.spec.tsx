import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { readAuthSession, saveAuthSession } from "@/lib/auth-session";
import type { LoadArchitectDashboardResult } from "@/lib/dashboard";
import { createAuthSessionFixture } from "@/test/auth-session-fixture";
import {
  ArchitectDashboardShell,
  type ArchitectDashboardLoader,
} from "./architect-dashboard-shell";
import { createArchitectDashboardFixture } from "./architect-dashboard-test-fixtures";

const routerMock = vi.hoisted(() => ({
  replace: vi.fn<(url: string) => void>(),
}));

const searchParamsMock = vi.hoisted(() => new URLSearchParams());

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  useSearchParams: () => searchParamsMock,
}));

beforeEach(() => {
  routerMock.replace.mockClear();
  resetSearchParams();
  window.localStorage.clear();
});

describe("ArchitectDashboardShell rendu nominal", () => {
  it("affiche les indicateurs CDC et les liens vers les modeles IFC", async () => {
    const { loader, session } = renderAuthenticatedDashboard();

    expect(await screen.findByRole("heading", { name: "Maison Berger" })).toBeInTheDocument();
    expectStatValue("Projets associés", "1");
    expectStatValue("Fichiers IFC", "2");
    expectStatValue("Annotations récentes", "1");
    expectStatValue("Anomalies IA", "1");
    expectStatValue("Validations BIM", "0");
    expect(screen.getAllByText("maison-berger-v3.ifc").length).toBeGreaterThan(0);
    expect(screen.getByText("Alignement baie vitrée")).toBeInTheDocument();
    expect(screen.getByText("Écart de cote détecté sur le mur porteur nord")).toBeInTheDocument();
    expectLinkHref(/Ouvrir modèle IFC Maison Berger/i, "/bim/models/bim-model-id-1");
    expect(loader).toHaveBeenCalledWith(session.accessToken, null);
  });

  it("transmet le chantier cible a l'appel API", async () => {
    searchParamsMock.set("siteId", "site-id-1");

    const { loader, session } = renderAuthenticatedDashboard();

    await screen.findByRole("heading", { name: "Maison Berger" });
    expect(loader).toHaveBeenCalledWith(session.accessToken, "site-id-1");
  });

  it("affiche l'etat vide quand aucun projet n'est accessible", async () => {
    const baseDashboard = createArchitectDashboardFixture();
    const dashboard = createArchitectDashboardFixture({
      aiAnomalies: [],
      annotations: [],
      emptyState: {
        message: "Aucun projet BIM ne correspond encore à votre périmètre.",
        title: "Aucun projet architecte accessible",
      },
      ifcModels: [],
      navigationShortcuts: [],
      projects: [],
      stats: {
        ...baseDashboard.stats,
        accessibleProjectsCount: 0,
        activeAiAnomaliesCount: 0,
        bimReviewRequiredProjectsCount: 0,
        ifcFilesCount: 0,
        recentAnnotationsCount: 0,
        validatedBimProjectsCount: 0,
      },
    });
    const loader = createDashboardLoader({ dashboard, ok: true });

    renderAuthenticatedDashboard(loader);

    expect(await screen.findByText("Aucun projet architecte accessible")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Voir le dashboard général/i })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });
});

describe("ArchitectDashboardShell erreurs et rafraichissement", () => {
  it("affiche une erreur claire et permet de reessayer", async () => {
    const loader = createDashboardLoader({
      message: "Impossible de joindre l'API SmartSite.",
      ok: false,
    });

    renderAuthenticatedDashboard(loader);

    expect(await screen.findByText("Dashboard architecte indisponible")).toBeInTheDocument();
    expect(screen.getByText("Impossible de joindre l'API SmartSite.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));

    await waitFor(() => {
      expect(loader).toHaveBeenCalledTimes(2);
    });
  });

  it("redirige quand l'API signale une session expiree", async () => {
    const loader = createDashboardLoader({
      message: "Votre session a expiré. Connectez-vous à nouveau.",
      ok: false,
      sessionExpired: true,
    });

    renderAuthenticatedDashboard(loader);

    await waitFor(() => {
      expect(routerMock.replace).toHaveBeenCalledWith("/login");
    });
    expect(readAuthSession()).toBeNull();
  });

  it("programme le rafraichissement selon l'intervalle retourne par l'API", async () => {
    const setIntervalSpy = vi.spyOn(window, "setInterval");

    try {
      renderAuthenticatedDashboard();

      expect(await screen.findByRole("heading", { name: "Maison Berger" })).toBeInTheDocument();

      await waitFor(() => {
        expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 45000);
      });
    } finally {
      setIntervalSpy.mockRestore();
    }
  });
});

function renderAuthenticatedDashboard(
  loader = createDashboardLoader({
    dashboard: createArchitectDashboardFixture(),
    ok: true,
  }),
) {
  const session = createAuthSessionFixture({ roles: ["architecte"] });

  saveAuthSession(session);
  render(<ArchitectDashboardShell dashboardLoader={loader} />);

  return { loader, session };
}

function createDashboardLoader(result: LoadArchitectDashboardResult) {
  return vi.fn<ArchitectDashboardLoader>().mockResolvedValue(result);
}

function expectLinkHref(label: RegExp, href: string): void {
  const hasMatchingLink = screen
    .getAllByRole("link", { name: label })
    .some((linkElement) => linkElement.getAttribute("href") === href);

  expect(hasMatchingLink).toBe(true);
}

function expectStatValue(label: string, value: string): void {
  const hasMatchingStat = screen.getAllByText(label).some((labelElement) => {
    const statContainer = labelElement.parentElement;

    return statContainer ? within(statContainer).queryByText(value) !== null : false;
  });

  expect(hasMatchingStat).toBe(true);
}

function resetSearchParams(): void {
  Array.from(searchParamsMock.keys()).forEach((key) => {
    searchParamsMock.delete(key);
  });
}
