import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";

import type { AccessTokenPayload } from "../auth/auth.types.js";
import { OrganizationsService } from "../organizations/organizations.service.js";
import type {
  ArchitectRequestResponseDto,
  ArchitectRequestsResponseDto,
  CreateArchitectRequestRequestDto,
} from "./architect-requests.dto.js";
import { ArchitectRequestsRepository } from "./architect-requests.repository.js";
import {
  architectRequestManagementRoleCodes,
  type ArchitectRequestsRepositoryPort,
  type CreateArchitectRequestInput,
} from "./architect-requests.types.js";

@Injectable()
export class ArchitectRequestsService {
  public constructor(
    @Inject(ArchitectRequestsRepository)
    private readonly architectRequestsRepository: ArchitectRequestsRepositoryPort,
    @Inject(OrganizationsService) private readonly organizationsService: OrganizationsService,
  ) {}

  public async createArchitectRequest(
    siteId: string,
    request: CreateArchitectRequestRequestDto,
    user: AccessTokenPayload,
  ): Promise<ArchitectRequestResponseDto> {
    await this.assertUserCanManageArchitectRequests(siteId, user);

    const input: CreateArchitectRequestInput = {
      missionDescription: this.normalizeOptionalText(request.missionDescription),
      organizationId: user.organizationId,
      requestedBy: user.sub,
      requestedDate: request.requestedDate ?? null,
      siteId,
    };

    return this.architectRequestsRepository.createArchitectRequest(input);
  }

  public async listArchitectRequests(
    siteId: string,
    user: AccessTokenPayload,
  ): Promise<ArchitectRequestsResponseDto> {
    await this.assertUserCanManageArchitectRequests(siteId, user);

    return {
      architectRequests: await this.architectRequestsRepository.listArchitectRequestsBySite(siteId),
      siteId,
    };
  }

  private async assertUserCanManageArchitectRequests(
    siteId: string,
    user: AccessTokenPayload,
  ): Promise<void> {
    await this.organizationsService.assertUserHasAnyRole(
      user.organizationId,
      user,
      architectRequestManagementRoleCodes,
    );

    await this.assertSiteInOrganization(siteId, user.organizationId);
    await this.assertUserHasSiteAccess(siteId, user.sub);
  }

  private async assertSiteInOrganization(siteId: string, organizationId: string): Promise<void> {
    const exists = await this.architectRequestsRepository.siteExistsInOrganization(
      siteId,
      organizationId,
    );

    if (!exists) {
      throw new NotFoundException(["Le chantier est introuvable."]);
    }
  }

  private async assertUserHasSiteAccess(siteId: string, userId: string): Promise<void> {
    const hasSiteAccess = await this.architectRequestsRepository.userCanManageSiteArchitectRequests(
      siteId,
      userId,
      architectRequestManagementRoleCodes,
    );

    if (!hasSiteAccess) {
      throw new ForbiddenException(["Vous n'avez pas accès à ce chantier."]);
    }
  }

  private normalizeOptionalText(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    const normalizedValue = value.trim();

    return normalizedValue.length > 0 ? normalizedValue : null;
  }
}
