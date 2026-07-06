import type { Route } from "next";

interface DashboardRouteAccount {
  readonly user: {
    readonly roles: readonly string[];
  };
}

export const defaultDashboardPath = "/dashboard" satisfies Route;
export const droneOperatorDashboardPath = "/dashboard/drone-operator" satisfies Route;
export const architectDashboardPath = "/dashboard/architect" satisfies Route;

export type DashboardPath =
  | typeof architectDashboardPath
  | typeof defaultDashboardPath
  | typeof droneOperatorDashboardPath;

export function getDashboardPathForAccount(account: DashboardRouteAccount): DashboardPath {
  const hasArchitectRole = account.user.roles.includes("architecte");
  const hasDroneOperatorRole = account.user.roles.includes("droniste");
  const hasSiteManagerDashboardRole =
    account.user.roles.includes("administrateur") || account.user.roles.includes("chef_chantier");

  if (hasSiteManagerDashboardRole) {
    return defaultDashboardPath;
  }

  if (hasDroneOperatorRole) {
    return droneOperatorDashboardPath;
  }

  if (hasArchitectRole) {
    return architectDashboardPath;
  }

  return defaultDashboardPath;
}
