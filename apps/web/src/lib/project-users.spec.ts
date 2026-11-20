import { afterEach, beforeEach, expect, it, vi } from "vitest";

import type { OrganizationUserResponseDto, ProjectUserResponseDto } from "@/generated/api";
import { addProjectUser, listAvailableProjectUsers, listProjectUsers } from "./project-users";

const fetchMock = vi.fn<typeof fetch>();
const member: ProjectUserResponseDto = {
  projectId: "site",
  userId: "worker",
  firstName: "Paul",
  lastName: "Durand",
  roleCodes: ["ouvrier"],
};
const user: OrganizationUserResponseDto = {
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

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:4000");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("utilise GET projets et transmet token", async () => {
  fetchMock.mockResolvedValue(Response.json([member]));
  expect(await listProjectUsers("token", "site")).toEqual({ ok: true, data: [member] });
  const input = fetchMock.mock.calls[0]?.[0];
  expect(input).toBe("http://localhost:4000/api/projects/site/users");
  const options = fetchMock.mock.calls[0]?.[1];
  expect(options?.method).toBe("GET");
  expect(new Headers(options?.headers).get("Authorization")).toBe("Bearer token");
});

it("envoie uniquement userId au POST", async () => {
  fetchMock.mockResolvedValue(Response.json(member, { status: 201 }));
  expect(await addProjectUser("token", "site", "worker")).toEqual({ ok: true, data: member });
  const input = fetchMock.mock.calls[0]?.[0];
  expect(input).toBe("http://localhost:4000/api/projects/site/users");
  const options = fetchMock.mock.calls[0]?.[1];
  expect(options?.method).toBe("POST");
  expect(options?.body).toBe(JSON.stringify({ userId: "worker" }));
});

it("filtre comptes inactifs, sans role et hors organisation", async () => {
  fetchMock.mockResolvedValue(
    Response.json({
      organizationId: "org",
      users: [
        user,
        { ...user, id: "disabled", status: "disabled" },
        { ...user, id: "norole", roleCodes: [] },
        { ...user, id: "foreign", organizationId: "other" },
      ],
    }),
  );
  expect(await listAvailableProjectUsers("token", "org")).toEqual({ ok: true, data: [user] });
  const input = fetchMock.mock.calls[0]?.[0];
  expect(input).toBe("http://localhost:4000/api/organizations/org/users");
});

it.each([400, 403, 404, 409])("affiche message API pour statut %s", async (status) => {
  fetchMock.mockResolvedValue(
    Response.json({ message: ["Erreur API."], statusCode: status }, { status }),
  );
  expect(await addProjectUser("token", "site", "worker")).toEqual({
    ok: false,
    message: "Erreur API.",
  });
});

it("explique expiration session", async () => {
  fetchMock.mockResolvedValue(
    Response.json({ message: ["Unauthorized"], statusCode: 401 }, { status: 401 }),
  );
  expect(await listProjectUsers("token", "site")).toEqual({
    ok: false,
    message: "Votre session a expiré. Connectez-vous à nouveau.",
  });
});

it("gere panne reseau pour les trois appels", async () => {
  fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
  const results = await Promise.all([
    listProjectUsers("token", "site"),
    listAvailableProjectUsers("token", "org"),
    addProjectUser("token", "site", "worker"),
  ]);
  expect(results).toEqual(
    Array.from({ length: 3 }, () => ({
      ok: false,
      message: "Impossible de joindre l'API SmartSite.",
    })),
  );
});
