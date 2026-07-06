import { describe, expect, it } from "vitest";

import { getDashboardPathForAccount } from "./dashboard-routing";

describe("getDashboardPathForAccount", () => {
  it("redirige un droniste seul vers le dashboard droniste", () => {
    expect(createDashboardPath(["droniste"])).toBe("/dashboard/drone-operator");
  });

  it("garde le dashboard global pour les roles chantier et administrateur", () => {
    expect(createDashboardPath(["chef_chantier"])).toBe("/dashboard");
    expect(createDashboardPath(["administrateur"])).toBe("/dashboard");
  });

  it("redirige un architecte seul vers le dashboard architecte", () => {
    expect(createDashboardPath(["architecte"])).toBe("/dashboard/architect");
  });

  it("priorise le dashboard global quand un utilisateur cumule les roles", () => {
    expect(createDashboardPath(["chef_chantier", "droniste"])).toBe("/dashboard");
    expect(createDashboardPath(["architecte", "administrateur"])).toBe("/dashboard");
  });
});

function createDashboardPath(roles: readonly string[]): string {
  return getDashboardPathForAccount({ user: { roles } });
}
