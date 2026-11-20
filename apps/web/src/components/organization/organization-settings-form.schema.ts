import { z } from "zod";

import type { OrganizationResponseDto, UpdateOrganizationRequestDto } from "@/generated/api";

const organizationNameMaxLength = 180;
const organizationEmailMaxLength = 320;
const organizationPhoneMaxLength = 40;
const organizationAddressMaxLength = 500;

export const organizationSettingsFormSchema = z.object({
  address: z.string().trim().max(organizationAddressMaxLength, "L'adresse est trop longue."),
  email: z
    .string()
    .trim()
    .min(1, "L'email est obligatoire.")
    .email("L'email doit être valide.")
    .max(organizationEmailMaxLength, "L'email est trop long."),
  name: z
    .string()
    .trim()
    .min(1, "Le nom d'entreprise est obligatoire.")
    .max(organizationNameMaxLength, "Le nom d'entreprise est trop long."),
  phone: z.string().trim().max(organizationPhoneMaxLength, "Le téléphone est trop long."),
});

export type OrganizationSettingsFormValues = z.infer<typeof organizationSettingsFormSchema>;

export function buildOrganizationSettingsDefaultValues(
  organization: OrganizationResponseDto,
): OrganizationSettingsFormValues {
  return {
    address: organization.address ?? "",
    email: organization.email ?? "",
    name: organization.name,
    phone: organization.phone ?? "",
  };
}

export function buildUpdateOrganizationRequest(
  values: OrganizationSettingsFormValues,
): UpdateOrganizationRequestDto {
  return {
    address: normalizeOptionalText(values.address),
    email: values.email.trim().toLowerCase(),
    name: values.name.trim(),
    phone: normalizeOptionalText(values.phone),
  };
}

function normalizeOptionalText(value: string): string | null {
  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : null;
}
