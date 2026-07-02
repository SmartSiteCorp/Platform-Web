"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle, Loader2, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { OrganizationFormStatusMessage } from "@/components/organization/organization-form-status-message";
import { Button } from "@/components/ui/button";
import type { PhaseResponseDto } from "@/generated/api";
import type { UpdatePhaseResult } from "@/lib/phases";

import {
  buildPhaseFormValues,
  buildUpdatePhaseRequest,
  createPhaseFormSchema,
  type CreatePhaseFormValues,
} from "./create-phase-form.schema";
import { PhaseFormFields } from "./phase-form-fields";

export type UpdatePhaseSubmitter = (
  phaseId: string,
  request: ReturnType<typeof buildUpdatePhaseRequest>,
) => Promise<UpdatePhaseResult>;

interface EditPhaseFormProps {
  readonly onCancel: () => void;
  readonly onPhaseUpdated: (phase: PhaseResponseDto) => void;
  readonly phase: PhaseResponseDto;
  readonly submitUpdatePhase: UpdatePhaseSubmitter;
}

export function EditPhaseForm({
  onCancel,
  onPhaseUpdated,
  phase,
  submitUpdatePhase,
}: EditPhaseFormProps) {
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<CreatePhaseFormValues>({
    defaultValues: buildPhaseFormValues(phase),
    mode: "onTouched",
    resolver: zodResolver(createPhaseFormSchema),
  });
  const [apiError, setApiError] = useState<string | null>(null);

  const submitValidForm = async (values: CreatePhaseFormValues): Promise<void> => {
    const result = await submitUpdatePhase(phase.id, buildUpdatePhaseRequest(values));

    if (!result.ok) {
      setApiError(result.message);
      return;
    }

    setApiError(null);
    onPhaseUpdated(result.phase);
  };
  const submitForm = handleSubmit(submitValidForm);

  return (
    <form
      aria-label={`Formulaire modification phase ${phase.name}`}
      className="mt-4 space-y-4 rounded-md border border-border bg-muted/30 p-4"
      noValidate
      onSubmit={(event) => void submitForm(event)}
    >
      <OrganizationFormStatusMessage message={apiError} tone="error" />
      <PhaseFormFields errors={errors} idPrefix={`phase-${phase.id}`} register={register} />
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button disabled={isSubmitting} type="button" variant="secondary" onClick={onCancel}>
          <X aria-hidden="true" className="h-4 w-4" />
          Annuler
        </Button>
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle aria-hidden="true" className="h-4 w-4" />
          )}
          Enregistrer la phase
        </Button>
      </div>
    </form>
  );
}
