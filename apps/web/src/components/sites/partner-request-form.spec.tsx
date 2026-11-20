import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { PartnerRequestPayload, PartnerType } from "@/lib/partner-requests";

import { PartnerRequestForm, type PartnerRequestSubmitter } from "./partner-request-form";

describe("PartnerRequestForm - champs", () => {
  it("affiche tous les champs du formulaire", () => {
    renderForm(createSuccessSubmitter());

    expect(screen.getByRole("radio", { name: /^Architecte/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /^Droniste/ })).toBeInTheDocument();
    expect(screen.getByLabelText("Description de la mission (optionnel)")).toBeInTheDocument();
    expect(screen.getByLabelText("Date souhaitée (optionnel)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Demander un architecte" })).toBeInTheDocument();
  });

  it("bascule le libelle du bouton quand on choisit droniste", () => {
    renderForm(createSuccessSubmitter());

    fireEvent.click(screen.getByRole("radio", { name: /^Droniste/ }));

    expect(screen.getByRole("button", { name: "Demander un droniste" })).toBeInTheDocument();
  });

  it("bloque la soumission si la description de mission est trop longue", async () => {
    let submitCount = 0;
    const submitter: PartnerRequestSubmitter = () => {
      submitCount += 1;
      return Promise.resolve({ ok: true, status: "pending" });
    };

    renderForm(submitter);
    fireEvent.change(screen.getByLabelText("Description de la mission (optionnel)"), {
      target: { value: "a".repeat(1001) },
    });
    fireEvent.click(screen.getByRole("button", { name: "Demander un architecte" }));

    expect(
      await screen.findByText("La description de la mission est trop longue."),
    ).toBeInTheDocument();
    expect(submitCount).toBe(0);
  });
});

describe("PartnerRequestForm - soumission", () => {
  it("soumet une demande d'architecte et affiche la confirmation", async () => {
    let submittedType: PartnerType | null = null;
    let submittedPayload: PartnerRequestPayload | null = null;
    const submitter: PartnerRequestSubmitter = (partnerType, request) => {
      submittedType = partnerType;
      submittedPayload = request;
      return Promise.resolve({ ok: true, status: "pending" });
    };
    const { getSentPartnerType } = renderForm(submitter);

    fireEvent.change(screen.getByLabelText("Description de la mission (optionnel)"), {
      target: { value: "Avis technique sur la stabilité de la structure" },
    });
    fireEvent.change(screen.getByLabelText("Date souhaitée (optionnel)"), {
      target: { value: "2026-07-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Demander un architecte" }));

    await waitFor(() => {
      expect(getSentPartnerType()).toBe("architecte");
    });
    expect(submittedType).toBe("architecte");
    expect(submittedPayload).toStrictEqual({
      missionDescription: "Avis technique sur la stabilité de la structure",
      requestedDate: "2026-07-01",
    });
    expect(
      screen.getByText("Votre demande pour un architecte a bien été envoyée."),
    ).toBeInTheDocument();
  });

  it("soumet une demande de droniste quand ce type est selectionne", async () => {
    let submittedType: PartnerType | null = null;
    const submitter: PartnerRequestSubmitter = (partnerType) => {
      submittedType = partnerType;
      return Promise.resolve({ ok: true, status: "pending" });
    };
    renderForm(submitter);

    fireEvent.click(screen.getByRole("radio", { name: /^Droniste/ }));
    fireEvent.click(screen.getByRole("button", { name: "Demander un droniste" }));

    await waitFor(() => {
      expect(submittedType).toBe("droniste");
    });
    expect(
      screen.getByText("Votre demande pour un droniste a bien été envoyée."),
    ).toBeInTheDocument();
  });

  it("soumet sans champs optionnels", async () => {
    let submittedPayload: PartnerRequestPayload | null = null;
    const submitter: PartnerRequestSubmitter = (_partnerType, request) => {
      submittedPayload = request;
      return Promise.resolve({ ok: true, status: "pending" });
    };
    renderForm(submitter);

    fireEvent.click(screen.getByRole("button", { name: "Demander un architecte" }));

    await waitFor(() => {
      expect(submittedPayload).toBeDefined();
    });
    expect(submittedPayload).toStrictEqual({ missionDescription: null, requestedDate: null });
  });

  it("affiche l'erreur API sans declencher onPartnerRequestSent", async () => {
    const submitter: PartnerRequestSubmitter = () =>
      Promise.resolve({ message: "Vous n'avez pas le rôle requis.", ok: false });
    const { getSentPartnerType } = renderForm(submitter);

    fireEvent.click(screen.getByRole("button", { name: "Demander un architecte" }));

    expect(await screen.findByText("Vous n'avez pas le rôle requis.")).toBeInTheDocument();
    expect(getSentPartnerType()).toBeNull();
  });
});

function renderForm(submitPartnerRequest: PartnerRequestSubmitter): {
  readonly getSentPartnerType: () => PartnerType | null;
} {
  let sentPartnerType: PartnerType | null = null;

  render(
    <PartnerRequestForm
      onPartnerRequestSent={(partnerType) => {
        sentPartnerType = partnerType;
      }}
      submitPartnerRequest={submitPartnerRequest}
    />,
  );

  return { getSentPartnerType: () => sentPartnerType };
}

function createSuccessSubmitter(): PartnerRequestSubmitter {
  return () => Promise.resolve({ ok: true, status: "pending" });
}
