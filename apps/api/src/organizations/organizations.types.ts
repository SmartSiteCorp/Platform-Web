export interface OrganizationDetails {
  readonly id: string;
  readonly name: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly address: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface OrganizationUserAccess {
  readonly status: string;
  readonly roleCodes: readonly string[];
}

export interface UpdateOrganizationInput {
  readonly name: string;
  readonly email: string;
  readonly phone: string | null;
  readonly address: string | null;
}

export interface OrganizationsRepositoryPort {
  findById(organizationId: string): Promise<OrganizationDetails | null>;
  findUserAccess(userId: string, organizationId: string): Promise<OrganizationUserAccess | null>;
  updateById(
    organizationId: string,
    input: UpdateOrganizationInput,
  ): Promise<OrganizationDetails | null>;
}
