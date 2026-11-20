import type { CanActivate, Type } from "@nestjs/common";
import { GUARDS_METADATA } from "@nestjs/common/constants.js";
import { ThrottlerGuard } from "@nestjs/throttler";
import { describe, expect, it } from "vitest";

import { AuthController } from "./auth.controller.js";

type GuardMetadata = readonly Type<CanActivate>[];

describe("AuthController", () => {
  it("protects registration with rate limiting", () => {
    const registerHandler = getRegisterHandler();
    const guards = Reflect.getMetadata(GUARDS_METADATA, registerHandler) as GuardMetadata;

    expect(guards).toContain(ThrottlerGuard);
  });
});

function getRegisterHandler(): AuthController["register"] {
  const descriptor = Object.getOwnPropertyDescriptor(AuthController.prototype, "register");

  if (!descriptor || typeof descriptor.value !== "function") {
    throw new Error("AuthController.register handler is missing.");
  }

  return descriptor.value as AuthController["register"];
}
