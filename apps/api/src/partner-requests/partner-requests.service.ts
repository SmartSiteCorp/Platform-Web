import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";

import type { AccessTokenPayload } from "../auth/auth.types.js";
import { OrganizationsService } from "../organizations/organizations.service.js";
import type {
  ListPartnerRequestsQueryDto,
  PartnerRequestsResponseDto,
} from "./partner-requests.dto.js";
import { PartnerRequestsRepository } from "./partner-requests.repository.js";
import {
  partnerRequestManagementRoleCodes,
  partnerRequestsDefaultPageSize,
  type ListPartnerRequestsFilters,
  type PartnerRequestsRepositoryPort,
} from "./partner-requests.types.js";

@Injectable()
export class PartnerRequestsService {
  public constructor(
    @Inject(PartnerRequestsRepository)
    private readonly partnerRequestsRepository: PartnerRequestsRepositoryPort,
    @Inject(OrganizationsService) private readonly organizationsService: OrganizationsService,
  ) {}

  public async listPartnerRequests(
    query: ListPartnerRequestsQueryDto,
    user: AccessTokenPayload,
  ): Promise<PartnerRequestsResponseDto> {
    await this.organizationsService.assertUserHasAnyRole(
      user.organizationId,
      user,
      partnerRequestManagementRoleCodes,
    );

    if (query.siteId) {
      await this.assertSiteInOrganization(query.siteId, user.organizationId);
      await this.assertUserHasSiteAccess(query.siteId, user.sub);
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? partnerRequestsDefaultPageSize;

    const filters: ListPartnerRequestsFilters = {
      limit: pageSize,
      offset: (page - 1) * pageSize,
      organizationId: user.organizationId,
      partnerType: query.partnerType ?? null,
      roleCodes: partnerRequestManagementRoleCodes,
      siteId: query.siteId ?? null,
      userId: user.sub,
    };

    const result = await this.partnerRequestsRepository.listPartnerRequests(filters);

    return {
      items: result.items,
      page,
      pageSize,
      total: result.total,
    };
  }

  private async assertSiteInOrganization(siteId: string, organizationId: string): Promise<void> {
    const exists = await this.partnerRequestsRepository.siteExistsInOrganization(
      siteId,
      organizationId,
    );

    if (!exists) {
      throw new NotFoundException(["Le chantier est introuvable."]);
    }
  }

  private async assertUserHasSiteAccess(siteId: string, userId: string): Promise<void> {
    const hasSiteAccess = await this.partnerRequestsRepository.userCanAccessSite(
      siteId,
      userId,
      partnerRequestManagementRoleCodes,
    );

    if (!hasSiteAccess) {
      throw new ForbiddenException(["Vous n'avez pas accès à ce chantier."]);
    }
  }
}
