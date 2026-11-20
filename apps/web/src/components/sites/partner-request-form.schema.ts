import { z } from "zod";

import type { PartnerRequestPayload, PartnerType } from "@/lib/partner-requests";

const missionDescriptionMaxLength = 1000;

export const partnerTypeValues = ["architecte", "droniste"] as const;

export const partnerRequestFormSchema = z.object({
  missionDescription: z
    .string()
    .trim()
    .max(missionDescriptionMaxLength, "La description de la mission est trop longue."),
  partnerType: z.enum(partnerTypeValues),
  requestedDate: z
    .string()
    .trim()
    .refine(
      (v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v),
      "La date souhaitée doit être au format YYYY-MM-DD.",
    ),
});

export type PartnerRequestFormValues = z.infer<typeof partnerRequestFormSchema>;

export const partnerRequestFormDefaultValues: PartnerRequestFormValues = {
  missionDescription: "",
  partnerType: "architecte",
  requestedDate: "",
};

export function buildPartnerRequestPayload(
  values: PartnerRequestFormValues,
): PartnerRequestPayload {
  return {
    missionDescription: values.missionDescription.trim() || null,
    requestedDate: values.requestedDate.trim() || null,
  };
}

export function resolvePartnerType(values: PartnerRequestFormValues): PartnerType {
  return values.partnerType;
}
