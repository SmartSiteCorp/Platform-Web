import { z } from "zod";

import type { CreateSiteRequestDto } from "@/generated/api";

const siteNameMaxLength = 180;
const siteAddressMaxLength = 500;

export const createSiteFormSchema = z.object({
  address: z.string().trim().max(siteAddressMaxLength, "L'adresse est trop longue."),
  estimatedDurationDays: z
    .string()
    .trim()
    .refine(
      (v) => !v || (Number.isInteger(Number(v)) && Number(v) >= 1),
      "La durée estimée doit être d'au moins 1 jour.",
    ),
  name: z
    .string()
    .trim()
    .min(1, "Le nom du chantier est obligatoire.")
    .max(siteNameMaxLength, "Le nom du chantier est trop long."),
  startDate: z
    .string()
    .trim()
    .refine(
      (v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v),
      "La date de début doit être au format YYYY-MM-DD.",
    ),
});

export type CreateSiteFormValues = z.infer<typeof createSiteFormSchema>;

export const createSiteFormDefaultValues: CreateSiteFormValues = {
  address: "",
  estimatedDurationDays: "",
  name: "",
  startDate: "",
};

export function buildCreateSiteRequest(values: CreateSiteFormValues): CreateSiteRequestDto {
  const durationStr = values.estimatedDurationDays.trim();

  return {
    address: values.address.trim() || null,
    estimatedDurationDays: durationStr ? Number(durationStr) : null,
    name: values.name.trim(),
    startDate: values.startDate.trim() || null,
  };
}
