import { z } from "zod";

import type { CreatePhaseRequestDto } from "@/generated/api";

const phaseNameMaxLength = 180;
const phaseDescriptionMaxLength = 1000;

export const createPhaseFormSchema = z.object({
  description: z.string().trim().max(phaseDescriptionMaxLength, "La description est trop longue."),
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
    .min(1, "Le nom de la phase est obligatoire.")
    .max(phaseNameMaxLength, "Le nom de la phase est trop long."),
  startDate: z
    .string()
    .trim()
    .refine(
      (v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v),
      "La date de début doit être au format YYYY-MM-DD.",
    ),
});

export type CreatePhaseFormValues = z.infer<typeof createPhaseFormSchema>;

export const createPhaseFormDefaultValues: CreatePhaseFormValues = {
  description: "",
  estimatedDurationDays: "",
  name: "",
  startDate: "",
};

export function buildCreatePhaseRequest(values: CreatePhaseFormValues): CreatePhaseRequestDto {
  const durationStr = values.estimatedDurationDays.trim();

  return {
    description: values.description.trim() || null,
    estimatedDurationDays: durationStr ? Number(durationStr) : null,
    name: values.name.trim(),
    startDate: values.startDate.trim() || null,
  };
}
