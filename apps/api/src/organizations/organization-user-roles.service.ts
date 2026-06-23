import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  areOrganizationRoleCodesCompatible,
  isAssignableOrganizationRoleCode,
  isOrganizationRoleCode,
  organizationRoleCompatibilityErrorMessage,
  type AssignableOrganizationRoleCode,
  type OrganizationRoleCode,
} from "@smartsite/shared";

import type { AccessTokenPayload } from "../auth/auth.types.js";
import { AddOrganizationUserRoleRequestDto } from "./organization-user-roles.dto.js";
import { OrganizationUserRolesRepository } from "./organization-user-roles.repository.js";
import type {
  OrganizationUserRoles,
  OrganizationUserRolesRepositoryPort,
} from "./organization-user-roles.types.js";
import { OrganizationsService } from "./organizations.service.js";

@Injectable()
export class OrganizationUserRolesService {
  public constructor(
    @Inject(OrganizationUserRolesRepository)
    private readonly userRolesRepository: OrganizationUserRolesRepositoryPort,
    @Inject(OrganizationsService)
    private readonly organizationsService: OrganizationsService,
  ) {}

  public async getUserRoles(
    organizationId: string,
    targetUserId: string,
    user: AccessTokenPayload,
  ): Promise<OrganizationUserRoles> {
    await this.organizationsService.assertCanManageOrganization(organizationId, user);

    return this.getExistingUserRoles(organizationId, targetUserId);
  }

  public async addUserRole(
    organizationId: string,
    targetUserId: string,
    request: AddOrganizationUserRoleRequestDto,
    user: AccessTokenPayload,
  ): Promise<OrganizationUserRoles> {
    await this.organizationsService.assertCanManageOrganization(organizationId, user);

    const roleCode = this.normalizeAssignableRoleCode(request.roleCode);
    const userRoles = await this.getExistingUserRoles(organizationId, targetUserId);

    if (userRoles.roleCodes.includes(roleCode)) {
      return userRoles;
    }

    return this.saveNextRoleCodes(organizationId, targetUserId, [...userRoles.roleCodes, roleCode]);
  }

  public async removeUserRole(
    organizationId: string,
    targetUserId: string,
    roleCodeValue: string,
    user: AccessTokenPayload,
  ): Promise<OrganizationUserRoles> {
    await this.organizationsService.assertCanManageOrganization(organizationId, user);

    const roleCode = this.normalizeAssignableRoleCode(roleCodeValue);
    const userRoles = await this.getExistingUserRoles(organizationId, targetUserId);

    if (!userRoles.roleCodes.includes(roleCode)) {
      throw new NotFoundException(["Ce rôle n'est pas associé à cet utilisateur."]);
    }

    return this.saveNextRoleCodes(
      organizationId,
      targetUserId,
      userRoles.roleCodes.filter((currentRoleCode) => currentRoleCode !== roleCode),
    );
  }

  private async getExistingUserRoles(
    organizationId: string,
    targetUserId: string,
  ): Promise<OrganizationUserRoles> {
    const userRoles = await this.userRolesRepository.findUserRoles(organizationId, targetUserId);

    if (!userRoles) {
      throw new NotFoundException(["L'utilisateur est introuvable dans cette organisation."]);
    }

    return userRoles;
  }

  private async saveNextRoleCodes(
    organizationId: string,
    targetUserId: string,
    nextRoleCodes: readonly OrganizationRoleCode[],
  ): Promise<OrganizationUserRoles> {
    this.assertRoleCombinationIsAllowed(nextRoleCodes);

    const updatedUserRoles = await this.userRolesRepository.replaceUserRoles({
      organizationId,
      roleCodes: nextRoleCodes,
      userId: targetUserId,
    });

    if (!updatedUserRoles) {
      throw new NotFoundException(["L'utilisateur est introuvable dans cette organisation."]);
    }

    return updatedUserRoles;
  }

  private normalizeAssignableRoleCode(roleCodeValue: string): AssignableOrganizationRoleCode {
    const roleCode = roleCodeValue.trim().toLowerCase();

    if (!isOrganizationRoleCode(roleCode) || !isAssignableOrganizationRoleCode(roleCode)) {
      throw new BadRequestException(["Ce rôle ne peut pas être attribué manuellement."]);
    }

    return roleCode;
  }

  private assertRoleCombinationIsAllowed(roleCodes: readonly OrganizationRoleCode[]): void {
    if (!areOrganizationRoleCodesCompatible(roleCodes)) {
      throw new BadRequestException([organizationRoleCompatibilityErrorMessage]);
    }
  }
}
