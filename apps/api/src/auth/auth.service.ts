import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import {
  LoginRequestDto,
  type LoginResponseDto,
  RegisterRequestDto,
  type RegisterResponseDto,
} from "./auth.dto.js";
import { AuthRepository } from "./auth.repository.js";
import { AuthTokenService } from "./auth-token.service.js";
import type {
  AuthAccountRepository,
  AuthTokenSigner,
  PasswordHasher,
  RegisteredAccount,
} from "./auth.types.js";
import { isPasswordCompliant } from "./password-policy.js";
import { PasswordHasherService } from "./password-hasher.service.js";

interface NormalizedRegisterInput {
  readonly organizationName: string;
  readonly email: string;
  readonly password: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly phone: string | null;
}

interface NormalizedLoginInput {
  readonly email: string;
  readonly password: string;
}

@Injectable()
export class AuthService {
  public constructor(
    @Inject(AuthRepository)
    private readonly authRepository: AuthAccountRepository,
    @Inject(PasswordHasherService)
    private readonly passwordHasher: PasswordHasher,
    @Inject(AuthTokenService)
    private readonly tokenSigner: AuthTokenSigner,
  ) {}

  public async register(request: RegisterRequestDto): Promise<RegisterResponseDto> {
    const normalizedRequest = this.normalizeRegisterRequest(request);

    if (!isPasswordCompliant(normalizedRequest.password)) {
      throw new BadRequestException(["Le mot de passe ne respecte pas les règles de sécurité."]);
    }

    const passwordHash = await this.passwordHasher.hashPassword(normalizedRequest.password);
    const account = await this.authRepository.createOrganizationAdmin({
      email: normalizedRequest.email,
      firstName: normalizedRequest.firstName,
      lastName: normalizedRequest.lastName,
      organizationName: normalizedRequest.organizationName,
      passwordHash,
      phone: normalizedRequest.phone,
    });

    if (!account) {
      throw new ConflictException(["Un compte existe déjà avec cet email."]);
    }

    const accessToken = await this.tokenSigner.signAccessToken(account);

    return this.createAuthResponse(account, accessToken);
  }

  public async login(request: LoginRequestDto): Promise<LoginResponseDto> {
    const normalizedRequest = this.normalizeLoginRequest(request);
    const account = await this.authRepository.findAccountByEmail(normalizedRequest.email);

    if (!account) {
      throw this.createInvalidCredentialsException();
    }

    const passwordMatches = await this.passwordHasher.verifyPassword(
      account.passwordHash,
      normalizedRequest.password,
    );

    if (!passwordMatches) {
      throw this.createInvalidCredentialsException();
    }

    const accessToken = await this.tokenSigner.signAccessToken(account);

    return this.createAuthResponse(account, accessToken);
  }

  private normalizeRegisterRequest(request: RegisterRequestDto): NormalizedRegisterInput {
    return {
      email: this.normalizeEmail(request.email),
      firstName: this.normalizeRequiredText(request.firstName, "Le prénom est obligatoire."),
      lastName: this.normalizeRequiredText(request.lastName, "Le nom est obligatoire."),
      organizationName: this.normalizeRequiredText(
        request.organizationName,
        "Le nom d'entreprise est obligatoire.",
      ),
      password: request.password,
      phone: this.normalizeOptionalText(request.phone),
    };
  }

  private normalizeLoginRequest(request: LoginRequestDto): NormalizedLoginInput {
    return {
      email: this.normalizeEmail(request.email),
      password: this.normalizeRequiredText(request.password, "Le mot de passe est obligatoire."),
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

  private createAuthResponse(account: RegisteredAccount, accessToken: string): RegisterResponseDto {
    return {
      accessToken,
      organization: account.organization,
      tokenType: "Bearer",
      user: account.user,
    };
  }

  private createInvalidCredentialsException(): UnauthorizedException {
    return new UnauthorizedException(["Email ou mot de passe incorrect."]);
  }
}
