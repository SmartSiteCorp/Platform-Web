"use client";

import { AlignLeft, Calendar, Clock, Milestone } from "lucide-react";
import type { FieldErrors, UseFormRegister } from "react-hook-form";

import { Label } from "@/components/ui/label";
import { TextField } from "@/components/ui/text-field";

import type { CreatePhaseFormValues } from "./create-phase-form.schema";

interface PhaseFormFieldsProps {
  readonly errors: FieldErrors<CreatePhaseFormValues>;
  readonly idPrefix: string;
  readonly register: UseFormRegister<CreatePhaseFormValues>;
}

export function PhaseFormFields({ errors, idPrefix, register }: PhaseFormFieldsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <TextField
          autoComplete="off"
          error={errors.name?.message}
          icon={Milestone}
          id={`${idPrefix}-name`}
          label="Nom de la phase"
          type="text"
          {...register("name")}
        />
      </div>
      <div className="md:col-span-2">
        <DescriptionField
          error={errors.description?.message}
          idPrefix={idPrefix}
          register={register}
        />
      </div>
      <TextField
        error={errors.startDate?.message}
        icon={Calendar}
        id={`${idPrefix}-start-date`}
        label="Date de début (optionnel)"
        type="date"
        {...register("startDate")}
      />
      <TextField
        error={errors.estimatedDurationDays?.message}
        icon={Clock}
        id={`${idPrefix}-estimated-duration-days`}
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
  readonly idPrefix: string;
  readonly register: UseFormRegister<CreatePhaseFormValues>;
}

function DescriptionField({ error, idPrefix, register }: DescriptionFieldProps) {
  const descriptionId = `${idPrefix}-description`;
  const errorId = `${descriptionId}-error`;

  return (
    <div className="space-y-2">
      <Label htmlFor={descriptionId}>Description (optionnel)</Label>
      <div className="relative">
        <AlignLeft
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground"
        />
        <textarea
          aria-describedby={error ? errorId : undefined}
          aria-invalid={Boolean(error)}
          className="min-h-28 w-full rounded-md border border-input bg-background py-2 pl-10 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50"
          id={descriptionId}
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
