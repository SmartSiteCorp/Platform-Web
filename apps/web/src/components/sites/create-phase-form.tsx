"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlignLeft, Calendar, Clock, Loader2, Milestone, PlusCircle } from "lucide-react";
import { useState } from "react";
import { useForm, type FieldErrors, type UseFormRegister } from "react-hook-form";

import { OrganizationFormStatusMessage } from "@/components/organization/organization-form-status-message";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TextField } from "@/components/ui/text-field";
import type { PhaseResponseDto } from "@/generated/api";
import type { CreatePhaseResult } from "@/lib/phases";

import {
  buildCreatePhaseRequest,
  createPhaseFormDefaultValues,
  createPhaseFormSchema,
  type CreatePhaseFormValues,
} from "./create-phase-form.schema";

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
      <CreatePhaseFields errors={errors} register={register} />
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

interface CreatePhaseFieldsProps {
  readonly errors: FieldErrors<CreatePhaseFormValues>;
  readonly register: UseFormRegister<CreatePhaseFormValues>;
}

function CreatePhaseFields({ errors, register }: CreatePhaseFieldsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <TextField
          autoComplete="off"
          error={errors.name?.message}
          icon={Milestone}
          id="phase-name"
          label="Nom de la phase"
          type="text"
          {...register("name")}
        />
      </div>
      <div className="md:col-span-2">
        <DescriptionField error={errors.description?.message} register={register} />
      </div>
      <TextField
        error={errors.startDate?.message}
        icon={Calendar}
        id="phase-start-date"
        label="Date de début (optionnel)"
        type="date"
        {...register("startDate")}
      />
      <TextField
        error={errors.estimatedDurationDays?.message}
        icon={Clock}
        id="phase-estimated-duration-days"
        label="Durée estimée en jours (optionnel)"
        min="1"
        step="1"
        type="number"
        {...register("estimatedDurationDays")}
      />
    </div>
  );
}

interface DescriptionFieldProps {
  readonly error: string | undefined;
  readonly register: UseFormRegister<CreatePhaseFormValues>;
}

function DescriptionField({ error, register }: DescriptionFieldProps) {
  const errorId = "phase-description-error";

  return (
    <div className="space-y-2">
      <Label htmlFor="phase-description">Description (optionnel)</Label>
      <div className="relative">
        <AlignLeft
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground"
        />
        <textarea
          aria-describedby={error ? errorId : undefined}
          aria-invalid={Boolean(error)}
          className="min-h-28 w-full rounded-md border border-input bg-background py-2 pl-10 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50"
          id="phase-description"
          {...register("description")}
        />
      </div>
      {error ? (
        <p className="text-sm text-destructive" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
