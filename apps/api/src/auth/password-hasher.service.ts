import { Injectable } from "@nestjs/common";
import { hash } from "argon2";

import type { PasswordHasher } from "./auth.types.js";

@Injectable()
export class PasswordHasherService implements PasswordHasher {
  public async hashPassword(password: string): Promise<string> {
    return hash(password);
  }
}
