import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";

import type { AccessTokenPayload } from "../auth/auth.types.js";
import { OrganizationsService } from "../organizations/organizations.service.js";
import type {
  CreateDroneRequestRequestDto,
  DroneRequestResponseDto,
  DroneRequestsResponseDto,
} from "./drone-requests.dto.js";
import { DroneRequestsRepository } from "./drone-requests.repository.js";
import {
  droneRequestManagementRoleCodes,
  type CreateDroneRequestInput,
  type DroneRequestsRepositoryPort,
} from "./drone-requests.types.js";

@Injectable()
export class DroneRequestsService {
  public constructor(
    @Inject(DroneRequestsRepository)
    private readonly droneRequestsRepository: DroneRequestsRepositoryPort,
    @Inject(OrganizationsService) private readonly organizationsService: OrganizationsService,
  ) {}

  public async createDroneRequest(
    siteId: string,
    request: CreateDroneRequestRequestDto,
    user: AccessTokenPayload,
  ): Promise<DroneRequestResponseDto> {
    await this.assertUserCanManageDroneRequests(siteId, user);

    const input: CreateDroneRequestInput = {
      missionDescription: this.normalizeOptionalText(request.missionDescription),
      organizationId: user.organizationId,
      requestedBy: user.sub,
      requestedDate: request.requestedDate ?? null,
      siteId,
    };

    return this.droneRequestsRepository.createDroneRequest(input);
  }

  public async listDroneRequests(
    siteId: string,
    user: AccessTokenPayload,
  ): Promise<DroneRequestsResponseDto> {
    await this.assertUserCanManageDroneRequests(siteId, user);

    return {
      droneRequests: await this.droneRequestsRepository.listDroneRequestsBySite(siteId),
      siteId,
    };
  }

  private async assertUserCanManageDroneRequests(
    siteId: string,
    user: AccessTokenPayload,
  ): Promise<void> {
    await this.organizationsService.assertUserHasAnyRole(
      user.organizationId,
      user,
      droneRequestManagementRoleCodes,
    );

    await this.assertSiteInOrganization(siteId, user.organizationId);
    await this.assertUserHasSiteAccess(siteId, user.sub);
  }

  private async assertSiteInOrganization(siteId: string, organizationId: string): Promise<void> {
    const exists = await this.droneRequestsRepository.siteExistsInOrganization(
      siteId,
      organizationId,
    );

    if (!exists) {
      throw new NotFoundException(["Le chantier est introuvable."]);
    }
  }

  private async assertUserHasSiteAccess(siteId: string, userId: string): Promise<void> {
    const hasSiteAccess = await this.droneRequestsRepository.userCanManageSiteDroneRequests(
      siteId,
      userId,
      droneRequestManagementRoleCodes,
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
