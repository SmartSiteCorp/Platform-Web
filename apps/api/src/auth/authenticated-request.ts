import type { Request } from "express";

import type { AccessTokenPayload } from "./auth.types.js";

export interface AuthenticatedRequest extends Request {
  readonly auth: AccessTokenPayload;
}

export interface OptionalAuthenticatedRequest extends Request {
  auth?: AccessTokenPayload;
}
