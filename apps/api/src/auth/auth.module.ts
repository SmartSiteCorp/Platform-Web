import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerModule } from "@nestjs/throttler";

import { DatabaseModule } from "../database/database.module.js";
import {
  getJwtAccessExpiresInSeconds,
  getJwtAccessSecret,
  getRegisterRateLimitLimit,
  getRegisterRateLimitTtlMilliseconds,
} from "../shared/config/environment.js";
import { AuthController } from "./auth.controller.js";
import { AuthRepository } from "./auth.repository.js";
import { AuthService } from "./auth.service.js";
import { AuthTokenService } from "./auth-token.service.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";
import { PasswordHasherService } from "./password-hasher.service.js";

@Module({
  controllers: [AuthController],
  imports: [
    ConfigModule,
    DatabaseModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: () => ({
        secret: getJwtAccessSecret(),
        signOptions: {
          expiresIn: getJwtAccessExpiresInSeconds(),
        },
      }),
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => [
        {
          limit: getRegisterRateLimitLimit(),
          ttl: getRegisterRateLimitTtlMilliseconds(),
        },
      ],
    }),
  ],
  exports: [AuthTokenService, JwtAuthGuard, JwtModule, PasswordHasherService],
  providers: [AuthRepository, AuthService, AuthTokenService, JwtAuthGuard, PasswordHasherService],
})
export class AuthModule {}
