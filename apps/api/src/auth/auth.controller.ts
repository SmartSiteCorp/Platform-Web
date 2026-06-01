import { Body, Controller, Inject, Post, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from "@nestjs/swagger";
import { ThrottlerGuard } from "@nestjs/throttler";

import { ApiErrorResponseDto } from "../shared/http/api-error-response.dto.js";
import { RegisterRequestDto, RegisterResponseDto } from "./auth.dto.js";
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
  public register(@Body() request: RegisterRequestDto): Promise<RegisterResponseDto> {
    return this.authService.register(request);
  }
}
