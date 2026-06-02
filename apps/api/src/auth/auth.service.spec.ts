import { BadRequestException, ConflictException, UnauthorizedException } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import { AuthService } from "./auth.service.js";
import type {
  AuthAccountRepository,
  CreateOrganizationAdminInput,
  LoginAccount,
  PasswordHasher,
  RegisteredAccount,
  AuthTokenSigner,
} from "./auth.types.js";

class FakeAuthRepository implements AuthAccountRepository {
  public createdInput: CreateOrganizationAdminInput | null = null;
  public nextAccount: RegisteredAccount | null | undefined;

  public createOrganizationAdmin(
    input: CreateOrganizationAdminInput,
  ): Promise<RegisteredAccount | null> {
    this.createdInput = input;

    return Promise.resolve(
      this.nextAccount === undefined ? createRegisteredAccount(input) : this.nextAccount,
    );
  }

  public findAccountByEmail(email: string): Promise<LoginAccount | null> {
    this.requestedLoginEmail = email;

    return Promise.resolve(this.nextLoginAccount);
  }

  public nextLoginAccount: LoginAccount | null = createLoginAccount();
  public requestedLoginEmail: string | null = null;
}

class FakePasswordHasher implements PasswordHasher {
  public hashedPassword: string | null = null;
  public nextPasswordMatches = true;
  public verifiedPassword: VerifiedPassword | null = null;

  public hashPassword(password: string): Promise<string> {
    this.hashedPassword = password;

    return Promise.resolve(`hashed-${password}`);
  }

  public verifyPassword(passwordHash: string, password: string): Promise<boolean> {
    this.verifiedPassword = { password, passwordHash };

    return Promise.resolve(this.nextPasswordMatches);
  }
}

class FakeTokenSigner implements AuthTokenSigner {
  public signedAccount: RegisteredAccount | null = null;

  public signAccessToken(account: RegisteredAccount): Promise<string> {
    this.signedAccount = account;

    return Promise.resolve("access-token");
  }
}

interface VerifiedPassword {
  readonly password: string;
  readonly passwordHash: string;
}

describe("AuthService register", () => {
  it("creates an organization admin account and returns an access token", async () => {
    const { repository, passwordHasher, service, tokenSigner } = createService();

    const result = await service.register({
      email: " ANDREEA@SMARTSITE.FR ",
      firstName: " Andreea ",
      lastName: " Rauta ",
      organizationName: " Stern Tech ",
      password: "Password123!",
      phone: " +33123456789 ",
    });

    expect(repository.createdInput).toStrictEqual({
      email: "andreea@smartsite.fr",
      firstName: "Andreea",
      lastName: "Rauta",
      organizationName: "Stern Tech",
      passwordHash: "hashed-Password123!",
      phone: "+33123456789",
    });
    expect(passwordHasher.hashedPassword).toBe("Password123!");
    expect(tokenSigner.signedAccount?.user.email).toBe("andreea@smartsite.fr");
    expect(result.accessToken).toBe("access-token");
    expect(result.tokenType).toBe("Bearer");
    expect(result.user.roles).toStrictEqual(["administrateur"]);
    expect(result.organization.name).toBe("Stern Tech");
  });

  it("rejects an email already used by another account", async () => {
    const { repository, service } = createService();
    repository.nextAccount = null;

    await expect(
      service.register({
        email: "andreea@smartsite.fr",
        firstName: "Andreea",
        lastName: "Rauta",
        organizationName: "Stern Tech",
        password: "Password123!",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects a weak password before creating the account", async () => {
    const { repository, service } = createService();

    await expect(
      service.register({
        email: "andreea@smartsite.fr",
        firstName: "Andreea",
        lastName: "Rauta",
        organizationName: "Stern Tech",
        password: "password",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.createdInput).toBeNull();
  });
});

describe("AuthService login", () => {
  it("logs in an existing user and returns an access token", async () => {
    const { passwordHasher, repository, service, tokenSigner } = createService();

    const result = await service.login({
      email: " ANDREEA@SMARTSITE.FR ",
      password: "SmartSite.2026",
    });

    expect(repository.requestedLoginEmail).toBe("andreea@smartsite.fr");
    expect(passwordHasher.verifiedPassword).toStrictEqual({
      password: "SmartSite.2026",
      passwordHash: "stored-password-hash",
    });
    expect(tokenSigner.signedAccount?.user.id).toBe("user-id");
    expect(result.accessToken).toBe("access-token");
    expect(result.organization.id).toBe("organization-id");
    expect(result.user.roles).toStrictEqual(["administrateur"]);
  });

  it("rejects login when the email is unknown", async () => {
    const { passwordHasher, repository, service, tokenSigner } = createService();
    repository.nextLoginAccount = null;

    await expect(
      service.login({
        email: "missing@smartsite.fr",
        password: "SmartSite.2026",
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(passwordHasher.verifiedPassword).toBeNull();
    expect(tokenSigner.signedAccount).toBeNull();
  });

  it("rejects login when the password does not match the stored hash", async () => {
    const { passwordHasher, service, tokenSigner } = createService();
    passwordHasher.nextPasswordMatches = false;

    await expect(
      service.login({
        email: "andreea@smartsite.fr",
        password: "WrongPassword.2026",
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(tokenSigner.signedAccount).toBeNull();
  });
});

function createService(): {
  readonly passwordHasher: FakePasswordHasher;
  readonly repository: FakeAuthRepository;
  readonly service: AuthService;
  readonly tokenSigner: FakeTokenSigner;
} {
  const repository = new FakeAuthRepository();
  const passwordHasher = new FakePasswordHasher();
  const tokenSigner = new FakeTokenSigner();

  return {
    passwordHasher,
    repository,
    service: new AuthService(repository, passwordHasher, tokenSigner),
    tokenSigner,
  };
}

function createRegisteredAccount(input: CreateOrganizationAdminInput): RegisteredAccount {
  return {
    organization: {
      createdAt: "2026-06-01T10:00:00.000Z",
      email: input.email,
      id: "organization-id",
      name: input.organizationName,
    },
    user: {
      createdAt: "2026-06-01T10:00:00.000Z",
      email: input.email,
      firstName: input.firstName,
      id: "user-id",
      lastName: input.lastName,
      organizationId: "organization-id",
      phone: input.phone,
      roles: ["administrateur"],
      status: "active",
    },
  };
}

function createLoginAccount(): LoginAccount {
  return {
    ...createRegisteredAccount({
      email: "andreea@smartsite.fr",
      firstName: "Andreea",
      lastName: "Rauta",
      organizationName: "Stern Tech",
      passwordHash: "stored-password-hash",
      phone: null,
    }),
    passwordHash: "stored-password-hash",
  };
}
