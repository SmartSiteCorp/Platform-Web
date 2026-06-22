import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import { AuthTokenService } from "../auth/auth-token.service.js";
import type { AccessTokenPayload, AuthTokenSigner, PasswordHasher } from "../auth/auth.types.js";
import { isPasswordCompliant } from "../auth/password-policy.js";
import { PasswordHasherService } from "../auth/password-hasher.service.js";
import { OrganizationInvitationAcceptanceRepository } from "./organization-invitation-acceptance.repository.js";
import { OrganizationInvitationTokenService } from "./organization-invitation-token.service.js";
import {
  AcceptOrganizationInvitationRequestDto,
  type AcceptOrganizationInvitationResponseDto,
  CreateOrganizationInvitationRequestDto,
  type OrganizationInvitationResponseDto,
} from "./organization-invitations.dto.js";
import { OrganizationInvitationsRepository } from "./organization-invitations.repository.js";
import type {
  OrganizationInvitationAcceptanceRepositoryPort,
  OrganizationInvitationRepositoryPort,
} from "./organization-invitations.types.js";
import { OrganizationsService } from "./organizations.service.js";

interface NormalizedCreateInvitationInput {
  readonly email: string;
  readonly roleCodes: readonly string[];
}

interface NormalizedAcceptInvitationInput {
  readonly token: string;
  readonly email: string;
  readonly password: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly phone: string | null;
}

const invitationExpiresInMilliseconds = 7 * 24 * 60 * 60 * 1000;
const assignableInvitationRoleCodes = new Set([
  "architecte",
  "chef_chantier",
  "droniste",
  "ouvrier",
]);

@Injectable()
export class OrganizationInvitationsService {
  public constructor(
    @Inject(OrganizationInvitationsRepository)
    private readonly invitationsRepository: OrganizationInvitationRepositoryPort,
    @Inject(OrganizationInvitationAcceptanceRepository)
    private readonly acceptanceRepository: OrganizationInvitationAcceptanceRepositoryPort,
    @Inject(OrganizationInvitationTokenService)
    private readonly invitationTokenService: OrganizationInvitationTokenService,
    @Inject(OrganizationsService)
    private readonly organizationsService: OrganizationsService,
    @Inject(PasswordHasherService)
    private readonly passwordHasher: PasswordHasher,
    @Inject(AuthTokenService)
    private readonly tokenSigner: AuthTokenSigner,
  ) {}

  public async createInvitation(
    organizationId: string,
    request: CreateOrganizationInvitationRequestDto,
    user: AccessTokenPayload,
  ): Promise<OrganizationInvitationResponseDto> {
    await this.organizationsService.assertCanManageOrganization(organizationId, user);

    const normalizedRequest = this.normalizeCreateInvitationRequest(request);
    const token = this.invitationTokenService.createToken();
    const result = await this.invitationsRepository.createInvitation({
      email: normalizedRequest.email,
      expiresAt: new Date(Date.now() + invitationExpiresInMilliseconds),
      invitedBy: user.sub,
      organizationId,
      roleCodes: normalizedRequest.roleCodes,
      tokenHash: this.invitationTokenService.hashToken(token),
    });

    if (result.status === "created") {
      return {
        ...result.invitation,
        token,
      };
    }

    if (result.status === "emailAlreadyMember") {
      throw new ConflictException(["Cet email est déjà membre de l'organisation."]);
    }

    if (result.status === "activeInvitationExists") {
      throw new ConflictException(["Une invitation active existe déjà pour cet email."]);
    }

    throw new BadRequestException(["Un ou plusieurs rôles sont invalides."]);
  }

  public async acceptInvitation(
    request: AcceptOrganizationInvitationRequestDto,
  ): Promise<AcceptOrganizationInvitationResponseDto> {
    const normalizedRequest = this.normalizeAcceptInvitationRequest(request);

    if (!isPasswordCompliant(normalizedRequest.password)) {
      throw new BadRequestException(["Le mot de passe ne respecte pas les règles de sécurité."]);
    }

    const passwordHash = await this.passwordHasher.hashPassword(normalizedRequest.password);
    const result = await this.acceptanceRepository.acceptInvitation({
      email: normalizedRequest.email,
      firstName: normalizedRequest.firstName,
      lastName: normalizedRequest.lastName,
      passwordHash,
      phone: normalizedRequest.phone,
      tokenHash: this.invitationTokenService.hashToken(normalizedRequest.token),
    });

    if (result.status === "accepted") {
      const accessToken = await this.tokenSigner.signAccessToken(result.account);

      return {
        accessToken,
        organization: result.account.organization,
        tokenType: "Bearer",
        user: result.account.user,
      };
    }

    if (result.status === "emailAlreadyUsed") {
      throw new ConflictException(["Un compte existe déjà avec cet email."]);
    }

    if (result.status === "alreadyAccepted") {
      throw new ConflictException(["Cette invitation a déjà été acceptée."]);
    }

    if (result.status === "expired") {
      throw new BadRequestException(["L'invitation a expiré."]);
    }

    throw new UnauthorizedException(["L'invitation est invalide."]);
  }

  private normalizeCreateInvitationRequest(
    request: CreateOrganizationInvitationRequestDto,
  ): NormalizedCreateInvitationInput {
    const roleCodes = request.roleCodes.map((roleCode) => roleCode.trim().toLowerCase());

    if (new Set(roleCodes).size !== roleCodes.length) {
      throw new BadRequestException(["Un rôle ne doit pas être sélectionné plusieurs fois."]);
    }

    if (roleCodes.some((roleCode) => !assignableInvitationRoleCodes.has(roleCode))) {
      throw new BadRequestException(["Un ou plusieurs rôles sont invalides."]);
    }

    return {
      email: this.normalizeEmail(request.email),
      roleCodes,
    };
  }

  private normalizeAcceptInvitationRequest(
    request: AcceptOrganizationInvitationRequestDto,
  ): NormalizedAcceptInvitationInput {
    return {
      email: this.normalizeEmail(request.email),
      firstName: this.normalizeRequiredText(request.firstName, "Le prénom est obligatoire."),
      lastName: this.normalizeRequiredText(request.lastName, "Le nom est obligatoire."),
      password: request.password,
      phone: this.normalizeOptionalText(request.phone),
      token: this.normalizeRequiredText(request.token, "Le token d'invitation est obligatoire."),
    };
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

  private normalizeOptionalText(value: string | undefined): string | null {
    if (!value) {
      return null;
    }

    const normalizedValue = value.trim();

    return normalizedValue.length > 0 ? normalizedValue : null;
  }
}
