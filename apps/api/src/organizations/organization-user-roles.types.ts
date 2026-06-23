import type { OrganizationRoleCode } from "@smartsite/shared";

export const organizationUserRolesUpdatedAuditAction = "organization.user_roles_updated";

export interface OrganizationUserRoles {
  readonly organizationId: string;
  readonly userId: string;
  readonly roleCodes: readonly OrganizationRoleCode[];
}

export interface ReplaceOrganizationUserRolesInput {
  readonly actorUserId: string;
  readonly organizationId: string;
  readonly userId: string;
  readonly roleCodes: readonly OrganizationRoleCode[];
}

export interface OrganizationUserRolesRepositoryPort {
  findUserRoles(organizationId: string, userId: string): Promise<OrganizationUserRoles | null>;
  replaceUserRoles(input: ReplaceOrganizationUserRolesInput): Promise<OrganizationUserRoles | null>;
}
