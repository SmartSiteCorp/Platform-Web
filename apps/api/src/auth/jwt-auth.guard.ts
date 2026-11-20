import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

import type { OptionalAuthenticatedRequest } from "./authenticated-request.js";
import type { AccessTokenPayload } from "./auth.types.js";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  public constructor(@Inject(JwtService) private readonly jwtService: JwtService) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<OptionalAuthenticatedRequest>();
    const token = this.extractBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException(["Le token d'authentification est obligatoire."]);
    }

    try {
      // Le payload est attaché à la requête pour les règles d'accès métier.
      request.auth = await this.jwtService.verifyAsync<AccessTokenPayload>(token);

      return true;
    } catch {
      throw new UnauthorizedException(["Le token d'authentification est invalide."]);
    }
  }

  private extractBearerToken(authorizationHeader: string | undefined): string | null {
    if (!authorizationHeader) {
      return null;
    }

    const [scheme, token, extraPart] = authorizationHeader.trim().split(" ");

    if (scheme !== "Bearer" || !token || extraPart) {
      return null;
    }

    return token;
  }
}
