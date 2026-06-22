import { randomBytes, createHash } from "node:crypto";

import { Injectable } from "@nestjs/common";

const invitationTokenByteLength = 32;

@Injectable()
export class OrganizationInvitationTokenService {
  public createToken(): string {
    return randomBytes(invitationTokenByteLength).toString("base64url");
  }

  public hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
