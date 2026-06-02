import { Body, Controller, HttpCode, Inject, Post, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { ThrottlerGuard } from "@nestjs/throttler";

import { ApiErrorResponseDto } from "../shared/http/api-error-response.dto.js";
import { createHttpValidationPipe } from "../app-http.js";
import {
  LoginRequestDto,
  LoginResponseDto,
  RegisterRequestDto,
  RegisterResponseDto,
} from "./auth.dto.js";
import { AuthService } from "./auth.service.js";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  public constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post("register")
  @ApiBody({ type: RegisterRequestDto })
  @ApiCreatedResponse({ type: RegisterResponseDto })
  @ApiBadRequestResponse({
    description: "Données d'inscription invalides.",
    type: ApiErrorResponseDto,
  })
  @ApiConflictResponse({ description: "Email déjà utilisé.", type: ApiErrorResponseDto })
  @ApiTooManyRequestsResponse({
    description: "Trop de tentatives d'inscription.",
    type: ApiErrorResponseDto,
  })
  @UseGuards(ThrottlerGuard)
  public register(
    @Body(createHttpValidationPipe(RegisterRequestDto)) request: RegisterRequestDto,
  ): Promise<RegisterResponseDto> {
    return this.authService.register(request);
  }

  @Post("login")
  @HttpCode(200)
  @ApiBody({ type: LoginRequestDto })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiBadRequestResponse({
    description: "Données de connexion invalides.",
    type: ApiErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: "Identifiants incorrects.",
    type: ApiErrorResponseDto,
  })
  public login(
    @Body(createHttpValidationPipe(LoginRequestDto)) request: LoginRequestDto,
  ): Promise<LoginResponseDto> {
    return this.authService.login(request);
  }
}
