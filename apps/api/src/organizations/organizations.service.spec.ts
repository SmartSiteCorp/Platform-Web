import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import type { AccessTokenPayload } from "../auth/auth.types.js";
import { OrganizationsService } from "./organizations.service.js";
import type {
  OrganizationDetails,
  OrganizationsRepositoryPort,
  OrganizationUserAccess,
  OrganizationUserSummary,
  UpdateOrganizationInput,
} from "./organizations.types.js";

class FakeOrganizationsRepository implements OrganizationsRepositoryPort {
  public access: OrganizationUserAccess | null = {
    roleCodes: ["administrateur"],
    status: "active",
  };
  public organization: OrganizationDetails | null = createOrganization();
  public updatedByUserId: string | null = null;
  public updatedInput: UpdateOrganizationInput | null = null;
  public users: readonly OrganizationUserSummary[] = [
    {
      createdAt: "2026-06-01T10:00:00.000Z",
      email: "admin@smartsite.fr",
      firstName: "Andreea",
      id: "user-id",
      lastName: "Rauta",
      organizationId: "organization-id",
      phone: null,
      roleCodes: ["administrateur"],
      status: "active",
    },
  ];

  public findById(): Promise<OrganizationDetails | null> {
    return Promise.resolve(this.organization);
  }

  public findUserAccess(): Promise<OrganizationUserAccess | null> {
    return Promise.resolve(this.access);
  }

  public findUsersByOrganizationId(): Promise<readonly OrganizationUserSummary[]> {
    return Promise.resolve(this.users);
  }

  public updateById(
    organizationId: string,
    input: UpdateOrganizationInput,
    actorUserId: string,
  ): Promise<OrganizationDetails | null> {
    this.updatedByUserId = actorUserId;
    this.updatedInput = input;

    return Promise.resolve({
      ...createOrganization(),
      ...input,
      id: organizationId,
    });
  }
}

describe("OrganizationsService", () => {
  it("returns an organization for an active organization admin", async () => {
    const { service } = createService();

    await expect(service.getOrganization("organization-id", createUser())).resolves.toMatchObject({
      email: "contact@smartsite.fr",
      id: "organization-id",
      name: "Stern Tech",
    });
  });

  it("normalizes organization data before saving it", async () => {
    const { repository, service } = createService();

    const result = await service.updateOrganization(
      "organization-id",
      {
        address: "  ",
        email: " CONTACT@SMARTSITE.FR ",
        name: " Stern Tech Renovation ",
        phone: " +33123456789 ",
      },
      createUser(),
    );

    expect(repository.updatedInput).toStrictEqual({
      address: null,
      email: "contact@smartsite.fr",
      name: "Stern Tech Renovation",
      phone: "+33123456789",
    });
    expect(repository.updatedByUserId).toBe("user-id");
    expect(result).toMatchObject({
      email: "contact@smartsite.fr",
      name: "Stern Tech Renovation",
      phone: "+33123456789",
    });
  });

  it("rejects users from another organization", async () => {
    const { service } = createService();

    await expect(
      service.getOrganization(
        "organization-id",
        createUser({ organizationId: "other-organization-id" }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects users without the organization admin role", async () => {
    const { repository, service } = createService();
    repository.access = {
      roleCodes: ["ouvrier"],
      status: "active",
    };

    await expect(service.getOrganization("organization-id", createUser())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("rejects blank required fields after trimming", async () => {
    const { service } = createService();

    await expect(
      service.updateOrganization(
        "organization-id",
        {
          email: "contact@smartsite.fr",
          name: "  ",
        },
        createUser(),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("returns not found when the organization no longer exists", async () => {
    const { repository, service } = createService();
    repository.organization = null;

    await expect(service.getOrganization("organization-id", createUser())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe("OrganizationsService users", () => {
  it("returns organization users for an active organization admin", async () => {
    const { service } = createService();

    await expect(
      service.listOrganizationUsers("organization-id", createUser()),
    ).resolves.toStrictEqual({
      organizationId: "organization-id",
      users: [
        expect.objectContaining({
          email: "admin@smartsite.fr",
          roleCodes: ["administrateur"],
        }),
      ],
    });
  });
});

function createService(): {
  readonly repository: FakeOrganizationsRepository;
  readonly service: OrganizationsService;
} {
  const repository = new FakeOrganizationsRepository();

  return {
    repository,
    service: new OrganizationsService(repository),
  };
}

function createUser(overrides: Partial<AccessTokenPayload> = {}): AccessTokenPayload {
  return {
    email: "admin@smartsite.fr",
    organizationId: "organization-id",
    roles: ["administrateur"],
    sub: "user-id",
    ...overrides,
  };
}

function createOrganization(): OrganizationDetails {
  return {
    address: null,
    createdAt: "2026-06-01T10:00:00.000Z",
    email: "contact@smartsite.fr",
    id: "organization-id",
    name: "Stern Tech",
    phone: null,
    updatedAt: "2026-06-01T10:00:00.000Z",
  };
}
