import { Injectable } from "@nestjs/common";
import { hash, verify } from "argon2";

import type { PasswordHasher } from "./auth.types.js";

@Injectable()
export class PasswordHasherService implements PasswordHasher {
  public async hashPassword(password: string): Promise<string> {
    return hash(password);
  }

  public async verifyPassword(passwordHash: string, password: string): Promise<boolean> {
    return verify(passwordHash, password);
  }
}
