import { Inject, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

import type {
  AccessTokenPayload,
  RegisteredAccount,
  RegistrationTokenSigner,
} from "./auth.types.js";

@Injectable()
export class AuthTokenService implements RegistrationTokenSigner {
  public constructor(@Inject(JwtService) private readonly jwtService: JwtService) {}

  public async signRegistrationToken(account: RegisteredAccount): Promise<string> {
    const payload: AccessTokenPayload = {
      email: account.user.email,
      organizationId: account.organization.id,
      roles: account.user.roles,
      sub: account.user.id,
    };

    return this.jwtService.signAsync(payload);
  }
}
