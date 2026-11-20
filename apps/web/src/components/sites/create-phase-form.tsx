"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, PlusCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { OrganizationFormStatusMessage } from "@/components/organization/organization-form-status-message";
import { Button } from "@/components/ui/button";
import type { PhaseResponseDto } from "@/generated/api";
import type { CreatePhaseResult } from "@/lib/phases";

import {
  buildCreatePhaseRequest,
  createPhaseFormDefaultValues,
  createPhaseFormSchema,
  type CreatePhaseFormValues,
} from "./create-phase-form.schema";
import { PhaseFormFields } from "./phase-form-fields";

export type CreatePhaseSubmitter = (
  request: ReturnType<typeof buildCreatePhaseRequest>,
) => Promise<CreatePhaseResult>;

interface CreatePhaseFormProps {
  readonly onPhaseCreated: (phase: PhaseResponseDto) => void;
  readonly submitCreatePhase: CreatePhaseSubmitter;
}

export function CreatePhaseForm({ onPhaseCreated, submitCreatePhase }: CreatePhaseFormProps) {
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<CreatePhaseFormValues>({
    defaultValues: createPhaseFormDefaultValues,
    mode: "onTouched",
    resolver: zodResolver(createPhaseFormSchema),
  });

  const submitValidForm = async (values: CreatePhaseFormValues): Promise<void> => {
    setApiError(null);
    setSuccessMessage(null);

    const result = await submitCreatePhase(buildCreatePhaseRequest(values));

    if (!result.ok) {
      setApiError(result.message);
      return;
    }

    setSuccessMessage(`"${result.phase.name}" a été ajoutée avec succès.`);
    reset();
    onPhaseCreated(result.phase);
  };
  const submitForm = handleSubmit(submitValidForm);

  return (
    <form
      aria-label="Formulaire création phase"
      className="space-y-5"
      noValidate
      onSubmit={(event) => void submitForm(event)}
    >
      <OrganizationFormStatusMessage message={successMessage} tone="success" />
      <OrganizationFormStatusMessage message={apiError} tone="error" />
      <PhaseFormFields errors={errors} idPrefix="phase" register={register} />
      <Button className="w-full sm:w-auto" disabled={isSubmitting} type="submit">
        {isSubmitting ? (
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : (
          <PlusCircle aria-hidden="true" className="h-4 w-4" />
        )}
        Créer la phase
      </Button>
    </form>
  );
}
