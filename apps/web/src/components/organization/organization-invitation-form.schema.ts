import {
  areOrganizationRoleCodesCompatible,
  organizationRoleCompatibilityErrorMessage,
} from "@smartsite/shared";
import { z } from "zod";

import type { CreateOrganizationInvitationRequestDto } from "@/generated/api";

const inviteableOrganizationRoleCodeValues = [
  "chef_chantier",
  "ouvrier",
  "architecte",
  "droniste",
] as const;

export type InviteableOrganizationRoleCode = (typeof inviteableOrganizationRoleCodeValues)[number];

export interface InviteableOrganizationRoleOption {
  readonly code: InviteableOrganizationRoleCode;
  readonly description: string;
  readonly label: string;
}

export const inviteableOrganizationRoleOptions: readonly InviteableOrganizationRoleOption[] = [
  {
    code: "chef_chantier",
    description: "Planification, tâches et suivi d'avancement.",
    label: "Chef de chantier",
  },
  {
    code: "ouvrier",
    description: "Consultation et validation des tâches terrain.",
    label: "Ouvrier",
  },
  {
    code: "architecte",
    description: "Suivi BIM, annotations et documents techniques.",
    label: "Architecte",
  },
  {
    code: "droniste",
    description: "Missions drone, captures et données terrain.",
    label: "Droniste",
  },
];

export const organizationInvitationFormSchema = z.object({
  email: z.string().trim().email("L'email doit être valide.").max(320, "L'email est trop long."),
  roleCodes: z
    .array(z.enum(inviteableOrganizationRoleCodeValues))
    .min(1, "Sélectionnez au moins un rôle.")
    .max(4, "Trop de rôles sélectionnés.")
    .refine((roleCodes) => areOrganizationRoleCodesCompatible(roleCodes), {
      message: organizationRoleCompatibilityErrorMessage,
    }),
});

export type OrganizationInvitationFormValues = z.infer<typeof organizationInvitationFormSchema>;

export const organizationInvitationFormDefaultValues: OrganizationInvitationFormValues = {
  email: "",
  roleCodes: [],
};

export function buildCreateOrganizationInvitationRequest(
  values: OrganizationInvitationFormValues,
): CreateOrganizationInvitationRequestDto {
  return {
    email: values.email.toLowerCase(),
    roleCodes: values.roleCodes,
  };
}

export function getInviteableRoleLabel(roleCode: string): string {
  return (
    inviteableOrganizationRoleOptions.find((roleOption) => roleOption.code === roleCode)?.label ??
    roleCode
  );
}

export function isInviteableOrganizationRoleDisabled(
  selectedRoleCodes: readonly InviteableOrganizationRoleCode[],
  roleCode: InviteableOrganizationRoleCode,
): boolean {
  if (selectedRoleCodes.includes(roleCode)) {
    return false;
  }

  return !areOrganizationRoleCodesCompatible([...selectedRoleCodes, roleCode]);
}
