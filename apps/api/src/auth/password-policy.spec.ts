import { describe, expect, it } from "vitest";

import { isPasswordCompliant } from "./password-policy.js";

describe("isPasswordCompliant", () => {
  it("accepts a password with the required security rules", () => {
    expect(isPasswordCompliant("Password123!")).toBe(true);
  });

  it("rejects passwords missing one required rule", () => {
    expect(isPasswordCompliant("Password123")).toBe(false);
    expect(isPasswordCompliant("password123!")).toBe(false);
    expect(isPasswordCompliant("PASSWORD123!")).toBe(false);
    expect(isPasswordCompliant("Password!!!")).toBe(false);
  });

  it("rejects passwords outside the expected length", () => {
    expect(isPasswordCompliant("Pass123!")).toBe(false);
    expect(isPasswordCompliant(`Password123!${"a".repeat(128)}`)).toBe(false);
  });
});
