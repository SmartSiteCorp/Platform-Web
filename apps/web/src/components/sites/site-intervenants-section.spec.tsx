import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

import type { OrganizationUserResponseDto, ProjectUserResponseDto } from "@/generated/api";
import { addProjectUser, listAvailableProjectUsers, listProjectUsers } from "@/lib/project-users";
import { SiteIntervenantsSection } from "./site-intervenants-section";

vi.mock("@/lib/project-users", () => ({
  addProjectUser: vi.fn(),
  listAvailableProjectUsers: vi.fn(),
  listProjectUsers: vi.fn(),
}));

const manager: ProjectUserResponseDto = {
  projectId: "site",
  userId: "manager",
  firstName: "Alice",
  lastName: "Martin",
  roleCodes: ["chef_chantier"],
};
const worker: OrganizationUserResponseDto = {
  id: "worker",
  organizationId: "org",
  firstName: "Paul",
  lastName: "Durand",
  email: "paul@example.test",
  phone: null,
  status: "active",
  roleCodes: ["ouvrier"],
  createdAt: "2026-07-01",
};
const architect = { ...worker, id: "architect", firstName: "Léa", roleCodes: ["architecte"] };
const props = { accessToken: "token", organizationId: "org", siteId: "site", userId: "manager" };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(listProjectUsers).mockResolvedValue({ ok: true, data: [manager] });
  vi.mocked(listAvailableProjectUsers).mockResolvedValue({ ok: true, data: [worker, architect] });
  vi.mocked(addProjectUser).mockImplementation((_token, siteId, id) => {
    const user = id === worker.id ? worker : architect;
    return Promise.resolve({
      ok: true,
      data: {
        projectId: siteId,
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        roleCodes: user.roleCodes,
      },
    });
  });
});

async function select(name: string) {
  fireEvent.click(await screen.findByRole("checkbox", { name: `Sélectionner ${name}` }));
}

it("charge organisation et intervenants, affiche noms et roles", async () => {
  render(<SiteIntervenantsSection {...props} />);
  expect(screen.getByRole("status")).toHaveTextContent("Chargement");
  expect(await screen.findByText("Alice Martin")).toBeInTheDocument();
  expect(screen.getByText("Chef de chantier")).toBeInTheDocument();
  expect(screen.getByText("Ouvrier")).toBeInTheDocument();
  expect(screen.getByText("Architecte")).toBeInTheDocument();
  expect(listProjectUsers).toHaveBeenCalledWith("token", "site");
  expect(listAvailableProjectUsers).toHaveBeenCalledWith("token", "org");
  expect(screen.getByRole("button", { name: "Ajouter les intervenants (0)" })).toBeDisabled();
});

it("ajoute plusieurs utilisateurs et actualise liste sans rechargement de page", async () => {
  render(<SiteIntervenantsSection {...props} />);
  await select("Paul Durand");
  await select("Léa Durand");
  fireEvent.click(screen.getByRole("button", { name: "Ajouter les intervenants (2)" }));
  expect(await screen.findByRole("status")).toHaveTextContent("2 intervenants ajoutés");
  const members = within(screen.getByRole("list", { name: "Intervenants du chantier" }));
  expect(members.getByText("Paul Durand")).toBeInTheDocument();
  expect(members.getByText("Léa Durand")).toBeInTheDocument();
  expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  expect(addProjectUser).toHaveBeenCalledTimes(2);
});

it("confirme aussi un seul ajout", async () => {
  render(<SiteIntervenantsSection {...props} />);
  await select("Paul Durand");
  fireEvent.click(screen.getByRole("button", { name: "Ajouter les intervenants (1)" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Intervenant ajouté au chantier.");
  expect(screen.getByRole("checkbox", { name: "Sélectionner Léa Durand" })).not.toBeChecked();
});

it("conserve succes partiels et selection des echecs pour reessayer", async () => {
  vi.mocked(addProjectUser)
    .mockResolvedValueOnce({
      ok: true,
      data: {
        projectId: "site",
        userId: worker.id,
        firstName: worker.firstName,
        lastName: worker.lastName,
        roleCodes: worker.roleCodes,
      },
    })
    .mockResolvedValueOnce({ ok: false, message: "Accès refusé." });
  render(<SiteIntervenantsSection {...props} />);
  await select("Paul Durand");
  await select("Léa Durand");
  fireEvent.click(screen.getByRole("button", { name: "Ajouter les intervenants (2)" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Léa Durand : Accès refusé.");
  expect(screen.getByRole("status")).toHaveTextContent("Intervenant ajouté");
  expect(screen.getByRole("checkbox", { name: "Sélectionner Léa Durand" })).toBeChecked();
  expect(
    screen.queryByRole("checkbox", { name: "Sélectionner Paul Durand" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Ajouter les intervenants (1)" }));
  await waitFor(() => {
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  expect(addProjectUser).toHaveBeenCalledTimes(3);
});

it("ne propose pas utilisateurs deja associes", async () => {
  vi.mocked(listAvailableProjectUsers).mockResolvedValue({
    ok: true,
    data: [
      worker,
      { ...worker, id: manager.userId, firstName: manager.firstName, lastName: manager.lastName },
    ],
  });
  render(<SiteIntervenantsSection {...props} />);
  await screen.findByText("Alice Martin");
  expect(
    screen.queryByRole("checkbox", { name: "Sélectionner Alice Martin" }),
  ).not.toBeInTheDocument();
});

it("garde liste visible si chargement des utilisateurs disponibles echoue", async () => {
  vi.mocked(listAvailableProjectUsers).mockResolvedValueOnce({
    ok: false,
    message: "Droits insuffisants.",
  });
  render(<SiteIntervenantsSection {...props} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Droits insuffisants.");
  expect(screen.getByText("Alice Martin")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
  expect(
    await screen.findByRole("checkbox", { name: "Sélectionner Paul Durand" }),
  ).toBeInTheDocument();
});

it("affiche erreur de chantier et ne charge pas organisation sans acces", async () => {
  vi.mocked(listProjectUsers).mockResolvedValue({
    ok: false,
    message: "Le chantier est introuvable.",
  });
  render(<SiteIntervenantsSection {...props} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Le chantier est introuvable.");
  expect(listAvailableProjectUsers).not.toHaveBeenCalled();
});

it("reserve ajout aux roles de gestion effectivement associes", async () => {
  vi.mocked(listProjectUsers).mockResolvedValue({
    ok: true,
    data: [{ ...manager, roleCodes: ["ouvrier"] }],
  });
  render(<SiteIntervenantsSection {...props} />);
  expect(await screen.findByText("Alice Martin")).toBeInTheDocument();
  expect(screen.queryByRole("form")).not.toBeInTheDocument();
  expect(listAvailableProjectUsers).not.toHaveBeenCalled();
});

it("bloque double soumission et selection pendant ajout", async () => {
  let resolveAdd: ((value: Awaited<ReturnType<typeof addProjectUser>>) => void) | undefined;
  vi.mocked(addProjectUser).mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveAdd = resolve;
      }),
  );
  render(<SiteIntervenantsSection {...props} />);
  await select("Paul Durand");
  fireEvent.submit(screen.getByRole("form"));
  fireEvent.submit(screen.getByRole("form"));
  expect(addProjectUser).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("checkbox", { name: "Sélectionner Paul Durand" })).toBeDisabled();
  await act(async () => {
    await Promise.resolve();
    resolveAdd?.({ ok: false, message: "Erreur réseau." });
  });
  expect(await screen.findByRole("alert")).toHaveTextContent("Erreur réseau.");
});

it("ignore reponse ancienne apres changement de chantier", async () => {
  let resolveList: ((value: Awaited<ReturnType<typeof listProjectUsers>>) => void) | undefined;
  vi.mocked(listProjectUsers).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveList = resolve;
      }),
  );
  const view = render(<SiteIntervenantsSection {...props} />);
  view.rerender(<SiteIntervenantsSection {...props} siteId="other" />);
  await screen.findByText("Alice Martin");
  await act(async () => {
    await Promise.resolve();
    resolveList?.({ ok: true, data: [{ ...manager, firstName: "Ancien" }] });
  });
  expect(screen.queryByText("Ancien Martin")).not.toBeInTheDocument();
});
