import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { organizationRoleCodeValues } from "@smartsite/shared";

import type { AccessTokenPayload } from "../auth/auth.types.js";
import { OrganizationsService } from "../organizations/organizations.service.js";
import type { ProjectUserResponseDto } from "./project-users.dto.js";
import { ProjectUsersRepository } from "./project-users.repository.js";
import { siteManagementRoleCodes } from "./sites.types.js";

@Injectable()
export class ProjectUsersService {
  public constructor(
    @Inject(ProjectUsersRepository) private readonly repository: ProjectUsersRepository,
    @Inject(OrganizationsService) private readonly organizations: OrganizationsService,
  ) {}

  public async add(
    projectId: string,
    userId: string,
    actor: AccessTokenPayload,
  ): Promise<ProjectUserResponseDto> {
    await this.assertAccess(projectId, actor, siteManagementRoleCodes);
    const result = await this.repository.add(projectId, userId, actor.organizationId);
    switch (result) {
      case "missing":
        throw new NotFoundException(["L'utilisateur est introuvable."]);
      case "foreign":
        throw new ForbiddenException(["L'utilisateur appartient à une autre organisation."]);
      case "inactive":
        throw new BadRequestException(["L'utilisateur doit être actif."]);
      case "no_roles":
        throw new BadRequestException(["L'utilisateur ne possède aucun rôle."]);
      case "duplicate":
        throw new ConflictException(["L'utilisateur est déjà associé au chantier."]);
      default:
        return result;
    }
  }

  public async list(
    projectId: string,
    actor: AccessTokenPayload,
  ): Promise<ProjectUserResponseDto[]> {
    await this.assertAccess(projectId, actor, organizationRoleCodeValues);
    return this.repository.list(projectId);
  }

  private async assertAccess(
    projectId: string,
    actor: AccessTokenPayload,
    roleCodes: readonly string[],
  ): Promise<void> {
    await this.organizations.assertUserHasAnyRole(actor.organizationId, actor, roleCodes);
    if (!(await this.repository.siteExists(projectId, actor.organizationId))) {
      throw new NotFoundException(["Le chantier est introuvable."]);
    }
    if (!(await this.repository.canAccess(projectId, actor.sub, roleCodes))) {
      throw new ForbiddenException(["Vous n'avez pas accès à ce chantier."]);
    }
  }
}
