import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";

import { DatabaseModule } from "../database/database.module.js";
import { getJwtAccessExpiresInSeconds, getJwtAccessSecret } from "../shared/config/environment.js";
import { AuthController } from "./auth.controller.js";
import { AuthRepository } from "./auth.repository.js";
import { AuthService } from "./auth.service.js";
import { AuthTokenService } from "./auth-token.service.js";
import { PasswordHasherService } from "./password-hasher.service.js";

@Module({
  controllers: [AuthController],
  imports: [
    ConfigModule,
    DatabaseModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: getJwtAccessSecret(),
        signOptions: {
          expiresIn: getJwtAccessExpiresInSeconds(),
        },
      }),
    }),
  ],
  providers: [AuthRepository, AuthService, AuthTokenService, PasswordHasherService],
})
export class AuthModule {}
