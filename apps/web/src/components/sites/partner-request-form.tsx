"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Send } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { OrganizationFormStatusMessage } from "@/components/organization/organization-form-status-message";
import { Button } from "@/components/ui/button";
import type { CreatePartnerRequestResult, PartnerType } from "@/lib/partner-requests";

import { PartnerRequestFormFields } from "./partner-request-form-fields";
import {
  buildPartnerRequestPayload,
  partnerRequestFormDefaultValues,
  partnerRequestFormSchema,
  resolvePartnerType,
  type PartnerRequestFormValues,
} from "./partner-request-form.schema";

export type PartnerRequestSubmitter = (
  partnerType: PartnerType,
  request: ReturnType<typeof buildPartnerRequestPayload>,
) => Promise<CreatePartnerRequestResult>;

interface PartnerRequestFormProps {
  readonly onPartnerRequestSent?: (partnerType: PartnerType) => void;
  readonly submitPartnerRequest: PartnerRequestSubmitter;
}

const partnerTypeLabels: Record<PartnerType, string> = {
  architecte: "un architecte",
  droniste: "un droniste",
};

export function PartnerRequestForm({
  onPartnerRequestSent,
  submitPartnerRequest,
}: PartnerRequestFormProps) {
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    watch,
  } = useForm<PartnerRequestFormValues>({
    defaultValues: partnerRequestFormDefaultValues,
    mode: "onTouched",
    resolver: zodResolver(partnerRequestFormSchema),
  });
  const selectedPartnerType = watch("partnerType");

  const submitValidForm = async (values: PartnerRequestFormValues): Promise<void> => {
    setApiError(null);
    setSuccessMessage(null);

    const partnerType = resolvePartnerType(values);
    const result = await submitPartnerRequest(partnerType, buildPartnerRequestPayload(values));

    if (!result.ok) {
      setApiError(result.message);
      return;
    }

    setSuccessMessage(`Votre demande pour ${partnerTypeLabels[partnerType]} a bien été envoyée.`);
    reset({ ...partnerRequestFormDefaultValues, partnerType });
    onPartnerRequestSent?.(partnerType);
  };
  const submitForm = handleSubmit(submitValidForm);

  return (
    <form
      aria-label="Formulaire demande de partenaire"
      className="space-y-5"
      noValidate
      onSubmit={(event) => void submitForm(event)}
    >
      <OrganizationFormStatusMessage message={successMessage} tone="success" />
      <OrganizationFormStatusMessage message={apiError} tone="error" />
      <PartnerRequestFormFields errors={errors} idPrefix="partner-request" register={register} />
      <Button className="w-full sm:w-auto" disabled={isSubmitting} type="submit">
        {isSubmitting ? (
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : (
          <Send aria-hidden="true" className="h-4 w-4" />
        )}
        Demander {partnerTypeLabels[selectedPartnerType]}
      </Button>
    </form>
  );
}
