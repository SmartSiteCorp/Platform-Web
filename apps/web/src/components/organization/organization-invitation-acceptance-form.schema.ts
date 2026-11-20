import { z } from "zod";

import type { AcceptOrganizationInvitationRequestDto } from "@/generated/api";

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

export const organizationInvitationAcceptanceFormSchema = z
  .object({
    email: z.string().trim().email("L'email doit être valide.").max(320, "L'email est trop long."),
    firstName: z
      .string()
      .trim()
      .min(1, "Le prénom est obligatoire.")
      .max(120, "Le prénom est trop long."),
    lastName: z.string().trim().min(1, "Le nom est obligatoire.").max(120, "Le nom est trop long."),
    password: z
      .string()
      .min(12, "Le mot de passe doit contenir au moins 12 caractères.")
      .max(128, "Le mot de passe est trop long.")
      .regex(
        passwordPattern,
        "Le mot de passe doit contenir une majuscule, une minuscule, un chiffre et un symbole.",
      ),
    passwordConfirmation: z.string(),
    phone: z.string().trim().max(30, "Le téléphone est trop long."),
    token: z.string().trim().min(1, "Le lien d'invitation est invalide."),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["passwordConfirmation"],
  });

export type OrganizationInvitationAcceptanceFormValues = z.infer<
  typeof organizationInvitationAcceptanceFormSchema
>;

export function buildOrganizationInvitationAcceptanceDefaultValues(
  token: string,
): OrganizationInvitationAcceptanceFormValues {
  return {
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    passwordConfirmation: "",
    phone: "",
    token,
  };
}

export function buildAcceptOrganizationInvitationRequest(
  values: OrganizationInvitationAcceptanceFormValues,
): AcceptOrganizationInvitationRequestDto {
  const phone = values.phone.trim();

  return {
    email: values.email.toLowerCase(),
    firstName: values.firstName,
    lastName: values.lastName,
    password: values.password,
    ...(phone.length > 0 ? { phone } : {}),
    token: values.token,
  };
}
