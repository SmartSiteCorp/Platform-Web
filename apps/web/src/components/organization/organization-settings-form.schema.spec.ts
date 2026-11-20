import { describe, expect, it } from "vitest";

import type { OrganizationResponseDto } from "@/generated/api";
import {
  buildOrganizationSettingsDefaultValues,
  buildUpdateOrganizationRequest,
  organizationSettingsFormSchema,
  type OrganizationSettingsFormValues,
} from "./organization-settings-form.schema";

describe("organizationSettingsFormSchema", () => {
  it("prepare les valeurs initiales depuis l'organisation", () => {
    expect(buildOrganizationSettingsDefaultValues(createOrganization())).toStrictEqual({
      address: "",
      email: "contact@smartsite.fr",
      name: "Stern Tech",
      phone: "",
    });
  });

  it("normalise la demande envoyee a l'API", () => {
    expect(
      buildUpdateOrganizationRequest({
        address: " 14 rue du Chantier, Lyon ",
        email: " CONTACT@SMARTSITE.FR ",
        name: " Stern Tech Renovation ",
        phone: " ",
      }),
    ).toStrictEqual({
      address: "14 rue du Chantier, Lyon",
      email: "contact@smartsite.fr",
      name: "Stern Tech Renovation",
      phone: null,
    });
  });

  it("refuse les champs metier obligatoires invalides", () => {
    const messages = getValidationMessages({
      address: "",
      email: "email-invalide",
      name: " ",
      phone: "",
    });

    expect(messages).toContain("Le nom d'entreprise est obligatoire.");
    expect(messages).toContain("L'email doit être valide.");
  });

  it("refuse les valeurs qui depassent les longueurs maximales", () => {
    const messages = getValidationMessages({
      address: "A".repeat(501),
      email: `${"a".repeat(309)}@example.com`,
      name: "A".repeat(181),
      phone: "1".repeat(41),
    });

    expect(messages).toContain("Le nom d'entreprise est trop long.");
    expect(messages).toContain("L'email est trop long.");
    expect(messages).toContain("Le téléphone est trop long.");
    expect(messages).toContain("L'adresse est trop longue.");
  });
});

function getValidationMessages(input: OrganizationSettingsFormValues): readonly string[] {
  const result = organizationSettingsFormSchema.safeParse(input);

  if (result.success) {
    return [];
  }

  return result.error.issues.map((issue) => issue.message);
}

function createOrganization(): OrganizationResponseDto {
  return {
    address: null,
    createdAt: "2026-06-01T10:00:00.000Z",
    email: "contact@smartsite.fr",
    id: "organization-id",
    name: "Stern Tech",
    phone: null,
    updatedAt: "2026-06-01T10:00:00.000Z",
  };
}
