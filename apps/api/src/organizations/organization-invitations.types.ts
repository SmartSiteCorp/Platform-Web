import type { RegisteredAccount, RegisteredOrganization } from "../auth/auth.types.js";

export interface OrganizationInvitationRole {
  readonly id: string;
  readonly code: string;
}

export interface CreateOrganizationInvitationInput {
  readonly organizationId: string;
  readonly email: string;
  readonly roleCodes: readonly string[];
  readonly tokenHash: string;
  readonly invitedBy: string;
  readonly expiresAt: Date;
}

export interface OrganizationInvitationDetails {
  readonly id: string;
  readonly organizationId: string;
  readonly email: string;
  readonly roleCodes: readonly string[];
  readonly expiresAt: string;
  readonly createdAt: string;
}

export interface OrganizationInvitationWithToken extends OrganizationInvitationDetails {
  readonly token: string;
}

export type CreateOrganizationInvitationResult =
  | {
      readonly status: "created";
      readonly invitation: OrganizationInvitationDetails;
    }
  | {
      readonly status: "emailAlreadyMember";
    }
  | {
      readonly status: "activeInvitationExists";
    }
  | {
      readonly status: "invalidRoles";
      readonly missingRoleCodes: readonly string[];
    };

export interface AcceptOrganizationInvitationInput {
  readonly tokenHash: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly phone: string | null;
}

export type AcceptOrganizationInvitationResult =
  | {
      readonly status: "accepted";
      readonly account: RegisteredAccount;
    }
  | {
      readonly status:
        | "alreadyAccepted"
        | "emailAlreadyUsed"
        | "emailMismatch"
        | "expired"
        | "invalid";
    };

export interface OrganizationInvitationRepositoryPort {
  createInvitation(
    input: CreateOrganizationInvitationInput,
  ): Promise<CreateOrganizationInvitationResult>;
}

export interface OrganizationInvitationAcceptanceRepositoryPort {
  acceptInvitation(
    input: AcceptOrganizationInvitationInput,
  ): Promise<AcceptOrganizationInvitationResult>;
}

export interface StoredOrganizationInvitation {
  readonly id: string;
  readonly organizationId: string;
  readonly email: string;
  readonly expiresAt: Date;
  readonly acceptedAt: Date | null;
  readonly revokedAt: Date | null;
  readonly organization: RegisteredOrganization;
}
