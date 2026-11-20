import { describe, expect, it } from "vitest";

import { areOrganizationRoleCodesCompatible } from "./organization-role-compatibility.js";

describe("areOrganizationRoleCodesCompatible", () => {
  it("accepts valid organization role combinations", () => {
    expect(areOrganizationRoleCodesCompatible(["administrateur"])).toBe(true);
    expect(areOrganizationRoleCodesCompatible(["architecte"])).toBe(true);
    expect(areOrganizationRoleCodesCompatible(["chef_chantier", "droniste"])).toBe(true);
    expect(
      areOrganizationRoleCodesCompatible(["administrateur", "chef_chantier", "droniste"]),
    ).toBe(true);
  });

  it("rejects incompatible organization role combinations", () => {
    expect(areOrganizationRoleCodesCompatible([])).toBe(false);
    expect(areOrganizationRoleCodesCompatible(["ouvrier", "droniste"])).toBe(false);
    expect(areOrganizationRoleCodesCompatible(["architecte", "droniste"])).toBe(false);
    expect(areOrganizationRoleCodesCompatible(["architecte", "chef_chantier"])).toBe(false);
  });
});
