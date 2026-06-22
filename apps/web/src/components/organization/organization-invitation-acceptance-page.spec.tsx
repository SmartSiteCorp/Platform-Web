import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  AcceptOrganizationInvitationRequestDto,
  AcceptOrganizationInvitationResponseDto,
} from "@/generated/api";
import { readAuthSession } from "@/lib/auth-session";
import type { AcceptOrganizationInvitationResult } from "@/lib/organization-invitations";
import { createTestAccessToken } from "@/test/create-test-access-token";
import { OrganizationInvitationAcceptancePage } from "./organization-invitation-acceptance-page";

const routerMock = vi.hoisted(() => ({
  push: vi.fn<(url: string) => void>(),
}));

const searchParamsMock = vi.hoisted(() => ({
  token: "invitation-token",
}));

const invitationsMock = vi.hoisted(() => ({
  acceptOrganizationInvitation:
    vi.fn<
      (
        request: AcceptOrganizationInvitationRequestDto,
      ) => Promise<AcceptOrganizationInvitationResult>
    >(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerMock.push,
  }),
  useSearchParams: () => {
    if (searchParamsMock.token.length === 0) {
      return new URLSearchParams();
    }

    return new URLSearchParams({ token: searchParamsMock.token });
  },
}));

vi.mock("@/lib/organization-invitations", () => ({
  acceptOrganizationInvitation: invitationsMock.acceptOrganizationInvitation,
}));

describe("OrganizationInvitationAcceptancePage", () => {
  beforeEach(() => {
    routerMock.push.mockClear();
    invitationsMock.acceptOrganizationInvitation.mockReset();
    searchParamsMock.token = "invitation-token";
    window.localStorage.clear();
  });

  it("affiche un message si le token est absent", () => {
    searchParamsMock.token = "";

    render(<OrganizationInvitationAcceptancePage />);

    expect(screen.getByText("Lien d'invitation invalide")).toBeInTheDocument();
    expect(
      screen.getByText("Le lien d'invitation ne contient pas de token valide."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour à la connexion" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(invitationsMock.acceptOrganizationInvitation).not.toHaveBeenCalled();
  });

  it("sauvegarde la session et redirige apres acceptation", async () => {
    const acceptedAccount = createAcceptedAccount();

    invitationsMock.acceptOrganizationInvitation.mockResolvedValue({
      account: acceptedAccount,
      ok: true,
    });

    render(<OrganizationInvitationAcceptancePage />);
    fillValidAcceptanceForm();
    fireEvent.click(screen.getByRole("button", { name: "Créer mon compte" }));

    await waitFor(() => {
      expect(routerMock.push).toHaveBeenCalledWith("/dashboard");
    });
    expect(readAuthSession()).toStrictEqual(acceptedAccount);
    expect(invitationsMock.acceptOrganizationInvitation).toHaveBeenCalledWith({
      email: "ouvrier@smartsite.fr",
      firstName: "Alex",
      lastName: "Martin",
      password: "SmartSite.2026",
      phone: "+33123456789",
      token: "invitation-token",
    });
  });
});

function createAcceptedAccount(): AcceptOrganizationInvitationResponseDto {
  return {
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
      email: "ouvrier@smartsite.fr",
      firstName: "Alex",
      id: "user-id",
      lastName: "Martin",
      organizationId: "organization-id",
      phone: "+33123456789",
      roles: ["ouvrier"],
      status: "active",
    },
  };
}

function fillValidAcceptanceForm(): void {
  fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: " Alex " } });
  fireEvent.change(screen.getByLabelText("Nom"), { target: { value: " Martin " } });
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: " OUVRIER@SMARTSITE.FR " },
  });
  fireEvent.change(screen.getByLabelText("Téléphone"), {
    target: { value: " +33123456789 " },
  });
  fireEvent.change(screen.getByLabelText("Mot de passe"), {
    target: { value: "SmartSite.2026" },
  });
  fireEvent.change(screen.getByLabelText("Confirmation mot de passe"), {
    target: { value: "SmartSite.2026" },
  });
}
