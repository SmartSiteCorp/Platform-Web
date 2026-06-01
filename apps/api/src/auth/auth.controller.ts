import { Body, Controller, Inject, Post } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiTags,
} from "@nestjs/swagger";

import { RegisterRequestDto, RegisterResponseDto } from "./auth.dto.js";
import { AuthService } from "./auth.service.js";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  public constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post("register")
  @ApiCreatedResponse({ type: RegisterResponseDto })
  @ApiBadRequestResponse({ description: "Données d'inscription invalides." })
  @ApiConflictResponse({ description: "Email déjà utilisé." })
  public register(@Body() request: RegisterRequestDto): Promise<RegisterResponseDto> {
    return this.authService.register(request);
  }
}
