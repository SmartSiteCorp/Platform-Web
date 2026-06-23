import {
  areOrganizationRoleCodesCompatible,
  organizationRoleCompatibilityErrorMessage,
  type AssignableOrganizationRoleCode,
} from "@smartsite/shared";
import { z } from "zod";

import type { CreateOrganizationInvitationRequestDto } from "@/generated/api";
import {
  getOrganizationRoleLabel,
  isOrganizationAssignableRoleDisabled,
  organizationAssignableRoleOptions,
  type OrganizationAssignableRoleOption,
} from "./organization-role-options";

const inviteableOrganizationRoleCodeValues = [
  "chef_chantier",
  "ouvrier",
  "architecte",
  "droniste",
] as const;

export type InviteableOrganizationRoleCode = AssignableOrganizationRoleCode;
export type InviteableOrganizationRoleOption = OrganizationAssignableRoleOption;

export const inviteableOrganizationRoleOptions = organizationAssignableRoleOptions;

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
  return getOrganizationRoleLabel(roleCode);
}

export function isInviteableOrganizationRoleDisabled(
  selectedRoleCodes: readonly InviteableOrganizationRoleCode[],
  roleCode: InviteableOrganizationRoleCode,
): boolean {
  return isOrganizationAssignableRoleDisabled(selectedRoleCodes, roleCode);
}
