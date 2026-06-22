import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { organizationAdminRoleCode, type AccessTokenPayload } from "../auth/auth.types.js";
import { UpdateOrganizationRequestDto, type OrganizationResponseDto } from "./organizations.dto.js";
import { OrganizationsRepository } from "./organizations.repository.js";
import type {
  OrganizationsRepositoryPort,
  UpdateOrganizationInput,
} from "./organizations.types.js";

interface NormalizedOrganizationUpdate {
  readonly name: string;
  readonly email: string;
  readonly phone: string | null;
  readonly address: string | null;
}

@Injectable()
export class OrganizationsService {
  public constructor(
    @Inject(OrganizationsRepository)
    private readonly organizationsRepository: OrganizationsRepositoryPort,
  ) {}

  public async getOrganization(
    organizationId: string,
    user: AccessTokenPayload,
  ): Promise<OrganizationResponseDto> {
    await this.assertCanManageOrganization(organizationId, user);

    const organization = await this.organizationsRepository.findById(organizationId);

    if (!organization) {
      throw new NotFoundException(["L'organisation est introuvable."]);
    }

    return organization;
  }

  public async updateOrganization(
    organizationId: string,
    request: UpdateOrganizationRequestDto,
    user: AccessTokenPayload,
  ): Promise<OrganizationResponseDto> {
    await this.assertCanManageOrganization(organizationId, user);

    const organization = await this.organizationsRepository.updateById(
      organizationId,
      this.normalizeUpdateRequest(request),
      user.sub,
    );

    if (!organization) {
      throw new NotFoundException(["L'organisation est introuvable."]);
    }

    return organization;
  }

  private async assertCanManageOrganization(
    organizationId: string,
    user: AccessTokenPayload,
  ): Promise<void> {
    if (user.organizationId !== organizationId) {
      throw new ForbiddenException(["Vous n'avez pas accès à cette organisation."]);
    }

    const access = await this.organizationsRepository.findUserAccess(user.sub, organizationId);

    if (!access || access.status !== "active") {
      throw new ForbiddenException(["Vous n'avez pas accès à cette organisation."]);
    }

    // Les rôles sont relus en base pour appliquer les changements immédiatement.
    if (!access.roleCodes.includes(organizationAdminRoleCode)) {
      throw new ForbiddenException(["Le rôle administrateur organisation est requis."]);
    }
  }

  private normalizeUpdateRequest(request: UpdateOrganizationRequestDto): UpdateOrganizationInput {
    const normalizedRequest: NormalizedOrganizationUpdate = {
      address: this.normalizeOptionalText(request.address),
      email: this.normalizeEmail(request.email),
      name: this.normalizeRequiredText(request.name, "Le nom d'entreprise est obligatoire."),
      phone: this.normalizeOptionalText(request.phone),
    };

    return normalizedRequest;
  }

  private normalizeEmail(email: string): string {
    return this.normalizeRequiredText(email, "L'email est obligatoire.").toLowerCase();
  }

  private normalizeRequiredText(value: string, message: string): string {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
      throw new BadRequestException([message]);
    }

    return normalizedValue;
  }

  private normalizeOptionalText(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    const normalizedValue = value.trim();

    // Une valeur vide efface les coordonnées optionnelles.
    return normalizedValue.length > 0 ? normalizedValue : null;
  }
}
