import type { Route } from "next";

interface DashboardRouteAccount {
  readonly user: {
    readonly roles: readonly string[];
  };
}

export const defaultDashboardPath = "/dashboard" satisfies Route;
export const droneOperatorDashboardPath = "/dashboard/drone-operator" satisfies Route;

export type DashboardPath = typeof defaultDashboardPath | typeof droneOperatorDashboardPath;

export function getDashboardPathForAccount(account: DashboardRouteAccount): DashboardPath {
  const hasDroneOperatorRole = account.user.roles.includes("droniste");
  const hasSiteManagerDashboardRole =
    account.user.roles.includes("administrateur") || account.user.roles.includes("chef_chantier");

  if (hasDroneOperatorRole && !hasSiteManagerDashboardRole) {
    return droneOperatorDashboardPath;
  }

  return defaultDashboardPath;
}
