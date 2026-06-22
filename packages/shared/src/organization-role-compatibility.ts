export const organizationRoleCodeValues = [
  "administrateur",
  "chef_chantier",
  "ouvrier",
  "architecte",
  "droniste",
] as const;

export type OrganizationRoleCode = (typeof organizationRoleCodeValues)[number];

export const organizationRoleCompatibilityErrorMessage =
  "Cette combinaison de rôles n'est pas autorisée.";

const compatibleRoleCodeKeys = new Set<string>([
  "administrateur",
  "architecte",
  "chef_chantier",
  "droniste",
  "ouvrier",
  "administrateur|architecte",
  "administrateur|chef_chantier",
  "administrateur|droniste",
  "chef_chantier|droniste",
  "administrateur|chef_chantier|droniste",
]);

export function isOrganizationRoleCode(roleCode: string): roleCode is OrganizationRoleCode {
  return organizationRoleCodeValues.some((knownRoleCode) => knownRoleCode === roleCode);
}

export function areOrganizationRoleCodesCompatible(roleCodes: readonly string[]): boolean {
  if (roleCodes.length === 0) {
    return false;
  }

  return compatibleRoleCodeKeys.has(buildRoleCombinationKey(roleCodes));
}

function buildRoleCombinationKey(roleCodes: readonly string[]): string {
  return [...new Set(roleCodes)].sort().join("|");
}
