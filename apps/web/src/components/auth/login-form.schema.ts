import { z } from "zod";

import type { LoginRequestDto } from "@/generated/api";

export const loginFormSchema = z.object({
  email: z.string().trim().email("L'email doit être valide.").max(320, "L'email est trop long."),
  password: z
    .string()
    .min(1, "Le mot de passe est obligatoire.")
    .max(128, "Le mot de passe est trop long."),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const loginFormDefaultValues: LoginFormValues = {
  email: "",
  password: "",
};

export function buildLoginRequest(values: LoginFormValues): LoginRequestDto {
  return {
    email: values.email.toLowerCase(),
    password: values.password,
  };
}
