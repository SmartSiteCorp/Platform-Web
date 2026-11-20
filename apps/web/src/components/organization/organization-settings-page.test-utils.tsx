import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, vi } from "vitest";

import type {
  CreateOrganizationInvitationRequestDto,
  OrganizationInvitationResponseDto,
  OrganizationResponseDto,
  OrganizationUserResponseDto,
  RegisterResponseDto,
  UpdateOrganizationUserRolesRequestDto,
  UpdateOrganizationRequestDto,
} from "@/generated/api";
import { saveAuthSession } from "@/lib/auth-session";
import type { CreateOrganizationInvitationResult } from "@/lib/organization-invitations";
import type { OrganizationSettingsResult } from "@/lib/organization-settings";
import type {
  LoadOrganizationUsersResult,
  UpdateOrganizationUserRolesResult,
} from "@/lib/organization-user-roles";
import { createTestAccessToken } from "@/test/create-test-access-token";
import {
  OrganizationSettingsPage,
  type OrganizationInvitationCreator,
  type OrganizationSettingsLoader,
  type OrganizationSettingsSubmitter,
  type OrganizationUserRolesUpdater,
  type OrganizationUsersFetcher,
} from "./organization-settings-page";

const routerMock = vi.hoisted(() => ({
  replace: vi.fn<(url: string) => void>(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

interface SubmittedOrganizationUpdate {
  readonly organizationId: string;
  readonly request: UpdateOrganizationRequestDto;
}

interface SubmittedOrganizationInvitation {
  readonly organizationId: string;
  readonly request: CreateOrganizationInvitationRequestDto;
}

interface SubmittedOrganizationUserRoles {
  readonly organizationId: string;
  readonly request: UpdateOrganizationUserRolesRequestDto;
  readonly userId: string;
}

interface RenderReadyPageOptions {
  readonly loadResult?: OrganizationSettingsResult;
  readonly loadUsersResult?: LoadOrganizationUsersResult;
  readonly submitInvitationResult?: CreateOrganizationInvitationResult;
  readonly submitResult?: OrganizationSettingsResult;
  readonly submitUserRolesResult?: UpdateOrganizationUserRolesResult;
}

export const responsiveViewports: readonly [string, number][] = [
  ["mobile", 390],
  ["tablette", 768],
];

export const registeredAccount: RegisterResponseDto = {
  accessToken: createTestAccessToken(Math.floor(Date.now() / 1000) + 3600),
  organization: {
    createdAt: "2026-06-01T10:00:00.000Z",
    email: "contact@smartsite.fr",
    id: "organization-id",
    name: "Stern Tech",
  },
  tokenType: "Bearer",
  user: {
    createdAt: "2026-06-01T10:00:00.000Z",
    email: "andreea@smartsite.fr",
    firstName: "Andreea",
    id: "user-id",
    lastName: "Rauta",
    organizationId: "organization-id",
    phone: null,
    roles: ["administrateur"],
    status: "active",
  },
};

export const organization: OrganizationResponseDto = {
  address: "12 rue des Chantiers, Paris",
  createdAt: "2026-06-01T10:00:00.000Z",
  email: "contact@smartsite.fr",
  id: "organization-id",
  name: "Stern Tech",
  phone: "+33123456789",
  updatedAt: "2026-06-01T10:00:00.000Z",
};

const updatedOrganization: OrganizationResponseDto = {
  ...organization,
  address: "14 rue du Chantier, Lyon",
  email: "contact@smartsite.fr",
  name: "Stern Tech Renovation",
  phone: null,
  updatedAt: "2026-06-02T09:00:00.000Z",
};

const createdInvitation: OrganizationInvitationResponseDto = {
  createdAt: "2026-06-01T11:00:00.000Z",
  email: "ouvrier@smartsite.fr",
  expiresAt: "2026-06-08T11:00:00.000Z",
  id: "invitation-id",
  organizationId: "organization-id",
  roleCodes: ["ouvrier"],
  token: "invitation-token",
};

export const organizationUsers: readonly OrganizationUserResponseDto[] = [
  {
    createdAt: "2026-06-01T10:00:00.000Z",
    email: registeredAccount.user.email,
    firstName: registeredAccount.user.firstName,
    id: registeredAccount.user.id,
    lastName: registeredAccount.user.lastName,
    organizationId: registeredAccount.organization.id,
    phone: null,
    roleCodes: ["administrateur"],
    status: "active",
  },
  {
    createdAt: "2026-06-01T11:00:00.000Z",
    email: "armand.braud@smartsite.fr",
    firstName: "Armand",
    id: "organization-user-id",
    lastName: "Braud",
    organizationId: registeredAccount.organization.id,
    phone: "+33111111111",
    roleCodes: ["ouvrier"],
    status: "active",
  },
];

export function resetOrganizationSettingsPageTest(): void {
  routerMock.replace.mockClear();
  setViewportWidth(1280);
  window.localStorage.clear();
}

export function expectRouterRedirectTo(path: string): void {
  expect(routerMock.replace).toHaveBeenCalledWith(path);
}

export function renderOrganizationSettingsPageWithLoader(
  loadOrganizationDetails: OrganizationSettingsLoader,
): void {
  render(<OrganizationSettingsPage loadOrganizationDetails={loadOrganizationDetails} />);
}

export function renderDefaultOrganizationSettingsPage(): void {
  render(<OrganizationSettingsPage />);
}

export function renderReadyPage({
  loadResult = { ok: true, organization },
  loadUsersResult = { ok: true, users: organizationUsers },
  submitInvitationResult = { invitation: createdInvitation, ok: true },
  submitResult = { ok: true, organization: updatedOrganization },
  submitUserRolesResult,
}: RenderReadyPageOptions = {}): {
  readonly getSubmittedInvitation: () => SubmittedOrganizationInvitation | null;
  readonly getSubmittedUpdate: () => SubmittedOrganizationUpdate | null;
  readonly getSubmittedUserRoles: () => SubmittedOrganizationUserRoles | null;
} {
  let submittedInvitation: SubmittedOrganizationInvitation | null = null;
  let submittedUpdate: SubmittedOrganizationUpdate | null = null;
  let submittedUserRoles: SubmittedOrganizationUserRoles | null = null;
  saveAuthSession(registeredAccount);

  const loadOrganizationDetails: OrganizationSettingsLoader = () => Promise.resolve(loadResult);
  const loadOrganizationUsersList: OrganizationUsersFetcher = () =>
    Promise.resolve(loadUsersResult);
  const submitOrganizationSettings: OrganizationSettingsSubmitter = (
    _session,
    organizationId,
    request,
  ) => {
    submittedUpdate = { organizationId, request };
    return Promise.resolve(submitResult);
  };
  const submitOrganizationInvitation: OrganizationInvitationCreator = (
    _session,
    organizationId,
    request,
  ) => {
    submittedInvitation = { organizationId, request };
    return Promise.resolve(submitInvitationResult);
  };
  const submitOrganizationUserRoles: OrganizationUserRolesUpdater = (
    _session,
    organizationId,
    userId,
    request,
  ) => {
    submittedUserRoles = { organizationId, request, userId };

    return Promise.resolve(
      submitUserRolesResult ?? {
        ok: true,
        userRoles: {
          organizationId,
          roleCodes: request.roleCodes,
          userId,
        },
      },
    );
  };

  render(
    <OrganizationSettingsPage
      loadOrganizationUsersList={loadOrganizationUsersList}
      loadOrganizationDetails={loadOrganizationDetails}
      submitOrganizationInvitation={submitOrganizationInvitation}
      submitOrganizationSettings={submitOrganizationSettings}
      submitOrganizationUserRoles={submitOrganizationUserRoles}
    />,
  );

  return {
    getSubmittedInvitation: () => submittedInvitation,
    getSubmittedUpdate: () => submittedUpdate,
    getSubmittedUserRoles: () => submittedUserRoles,
  };
}

export function fillOrganizationForm(): void {
  const organizationForm = getOrganizationSettingsForm();

  fireEvent.change(within(organizationForm).getByLabelText("Nom entreprise"), {
    target: { value: " Stern Tech Renovation " },
  });
  fireEvent.change(within(organizationForm).getByLabelText("Email"), {
    target: { value: " CONTACT@SMARTSITE.FR " },
  });
  fireEvent.change(within(organizationForm).getByLabelText("Téléphone"), {
    target: { value: " " },
  });
  fireEvent.change(within(organizationForm).getByLabelText("Adresse"), {
    target: { value: " 14 rue du Chantier, Lyon " },
  });
}

export function getOrganizationSettingsForm(): HTMLElement {
  return screen.getByRole("form", { name: "Formulaire informations entreprise" });
}

export async function fillInvitationForm(): Promise<void> {
  let invitationForm = screen.queryByRole("form", {
    name: "Formulaire invitation utilisateur",
  });

  if (!invitationForm) {
    fireEvent.click(await screen.findByRole("button", { name: "Inviter un utilisateur" }));
    invitationForm = await screen.findByRole("form", {
      name: "Formulaire invitation utilisateur",
    });
  }

  fireEvent.change(within(invitationForm).getByLabelText("Email"), {
    target: { value: " OUVRIER@SMARTSITE.FR " },
  });
  fireEvent.click(within(invitationForm).getByRole("checkbox", { name: /Ouvrier/ }));
}

export function setViewportWidth(width: number): void {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
    writable: true,
  });
  window.dispatchEvent(new Event("resize"));
}
