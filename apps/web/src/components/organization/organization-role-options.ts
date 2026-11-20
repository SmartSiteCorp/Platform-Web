import {
  areOrganizationRoleCodesCompatible,
  isAssignableOrganizationRoleCode,
  isOrganizationRoleCode,
  type AssignableOrganizationRoleCode,
  type OrganizationRoleCode,
} from "@smartsite/shared";

export interface OrganizationAssignableRoleOption {
  readonly code: AssignableOrganizationRoleCode;
  readonly description: string;
  readonly label: string;
}

export interface OrganizationRoleOption {
  readonly code: OrganizationRoleCode;
  readonly label: string;
}

const organizationRoleLabels: Record<OrganizationRoleCode, string> = {
  administrateur: "Administrateur",
  architecte: "Architecte",
  chef_chantier: "Chef de chantier",
  droniste: "Droniste",
  ouvrier: "Ouvrier",
};

export const organizationRoleOptions: readonly OrganizationRoleOption[] = [
  { code: "administrateur", label: organizationRoleLabels.administrateur },
  { code: "chef_chantier", label: organizationRoleLabels.chef_chantier },
  { code: "ouvrier", label: organizationRoleLabels.ouvrier },
  { code: "architecte", label: organizationRoleLabels.architecte },
  { code: "droniste", label: organizationRoleLabels.droniste },
];

export const organizationAssignableRoleOptions: readonly OrganizationAssignableRoleOption[] = [
  {
    code: "chef_chantier",
    description: "Planification, tâches et suivi d'avancement.",
    label: organizationRoleLabels.chef_chantier,
  },
  {
    code: "ouvrier",
    description: "Consultation et validation des tâches terrain.",
    label: organizationRoleLabels.ouvrier,
  },
  {
    code: "architecte",
    description: "Suivi BIM, annotations et documents techniques.",
    label: organizationRoleLabels.architecte,
  },
  {
    code: "droniste",
    description: "Missions drone, captures et données terrain.",
    label: organizationRoleLabels.droniste,
  },
];

export function getOrganizationRoleLabel(roleCode: string): string {
  if (!isOrganizationRoleCode(roleCode)) {
    return roleCode;
  }

  return organizationRoleLabels[roleCode];
}

export function getAssignableOrganizationRoleCodes(
  roleCodes: readonly string[],
): AssignableOrganizationRoleCode[] {
  return roleCodes.filter(isAssignableOrganizationRoleCode);
}

export function isOrganizationAssignableRoleDisabled(
  selectedRoleCodes: readonly AssignableOrganizationRoleCode[],
  roleCode: AssignableOrganizationRoleCode,
): boolean {
  if (selectedRoleCodes.includes(roleCode)) {
    return false;
  }

  return !areOrganizationRoleCodesCompatible([...selectedRoleCodes, roleCode]);
}
