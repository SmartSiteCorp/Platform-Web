import { z } from "zod";

import type { RegisterRequestDto } from "@/generated/api";

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

export const registerFormSchema = z
  .object({
    email: z.string().trim().email("L'email doit être valide.").max(320, "L'email est trop long."),
    firstName: z
      .string()
      .trim()
      .min(1, "Le prénom est obligatoire.")
      .max(120, "Le prénom est trop long."),
    lastName: z.string().trim().min(1, "Le nom est obligatoire.").max(120, "Le nom est trop long."),
    organizationName: z
      .string()
      .trim()
      .min(1, "Le nom d'entreprise est obligatoire.")
      .max(180, "Le nom d'entreprise est trop long."),
    password: z
      .string()
      .min(12, "Le mot de passe doit contenir au moins 12 caractères.")
      .max(128, "Le mot de passe est trop long.")
      .regex(
        passwordPattern,
        "Le mot de passe doit contenir une majuscule, une minuscule, un chiffre et un symbole.",
      ),
    passwordConfirmation: z.string(),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["passwordConfirmation"],
  });

export type RegisterFormValues = z.infer<typeof registerFormSchema>;

export const registerFormDefaultValues: RegisterFormValues = {
  email: "",
  firstName: "",
  lastName: "",
  organizationName: "",
  password: "",
  passwordConfirmation: "",
};

export function buildRegisterRequest(values: RegisterFormValues): RegisterRequestDto {
  return {
    email: values.email.toLowerCase(),
    firstName: values.firstName,
    lastName: values.lastName,
    organizationName: values.organizationName,
    password: values.password,
  };
}
