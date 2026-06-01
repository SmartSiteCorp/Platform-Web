export const organizationAdminRoleCode = "administrateur";

export interface CreateOrganizationAdminInput {
  readonly organizationName: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly passwordHash: string;
  readonly phone: string | null;
}

export interface RegisteredOrganization {
  readonly id: string;
  readonly name: string;
  readonly email: string | null;
  readonly createdAt: string;
}

export interface RegisteredUser {
  readonly id: string;
  readonly organizationId: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly phone: string | null;
  readonly status: string;
  readonly roles: readonly string[];
  readonly createdAt: string;
}

export interface RegisteredAccount {
  readonly organization: RegisteredOrganization;
  readonly user: RegisteredUser;
}

export interface AuthAccountRepository {
  createOrganizationAdmin(input: CreateOrganizationAdminInput): Promise<RegisteredAccount | null>;
}

export interface PasswordHasher {
  hashPassword(password: string): Promise<string>;
}

export interface RegistrationTokenSigner {
  signRegistrationToken(account: RegisteredAccount): Promise<string>;
}

export interface AccessTokenPayload {
  readonly sub: string;
  readonly email: string;
  readonly organizationId: string;
  readonly roles: readonly string[];
}
