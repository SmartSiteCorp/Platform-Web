"use client";

import { AlignLeft, Calendar, Pencil, Plane, type LucideIcon } from "lucide-react";
import type { FieldErrors, UseFormRegister } from "react-hook-form";

import { Label } from "@/components/ui/label";
import { TextField } from "@/components/ui/text-field";

import { partnerTypeValues, type PartnerRequestFormValues } from "./partner-request-form.schema";

interface PartnerRequestFormFieldsProps {
  readonly errors: FieldErrors<PartnerRequestFormValues>;
  readonly idPrefix: string;
  readonly register: UseFormRegister<PartnerRequestFormValues>;
}

interface PartnerTypeOption {
  readonly code: (typeof partnerTypeValues)[number];
  readonly description: string;
  readonly icon: LucideIcon;
  readonly label: string;
}

const partnerTypeOptions: readonly PartnerTypeOption[] = [
  {
    code: "architecte",
    description: "Avis technique, plans ou suivi de conception sur le chantier.",
    icon: Pencil,
    label: "Architecte",
  },
  {
    code: "droniste",
    description: "Relevé, inspection ou mission drone sur le chantier.",
    icon: Plane,
    label: "Droniste",
  },
];

export function PartnerRequestFormFields({
  errors,
  idPrefix,
  register,
}: PartnerRequestFormFieldsProps) {
  return (
    <div className="space-y-5">
      <PartnerTypeField idPrefix={idPrefix} register={register} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <MissionDescriptionField errors={errors} idPrefix={idPrefix} register={register} />
        </div>
        <TextField
          error={errors.requestedDate?.message}
          icon={Calendar}
          id={`${idPrefix}-requested-date`}
          label="Date souhaitée (optionnel)"
          type="date"
          {...register("requestedDate")}
        />
      </div>
    </div>
  );
}

interface PartnerTypeFieldProps {
  readonly idPrefix: string;
  readonly register: UseFormRegister<PartnerRequestFormValues>;
}

function PartnerTypeField({ idPrefix, register }: PartnerTypeFieldProps) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-foreground">Type de partenaire</legend>
      <div
        aria-label="Sélection du type de partenaire"
        className="grid gap-3 md:grid-cols-2"
        role="radiogroup"
      >
        {partnerTypeOptions.map((option) => {
          const Icon = option.icon;
          const optionId = `${idPrefix}-partner-type-${option.code}`;

          return (
            <label
              className="flex min-h-24 cursor-pointer gap-3 rounded-md border border-border bg-background p-4 transition-colors hover:border-primary/60 hover:bg-muted"
              htmlFor={optionId}
              key={option.code}
            >
              <input
                className="mt-1 h-4 w-4 border-input text-primary focus:ring-ring/25"
                id={optionId}
                type="radio"
                value={option.code}
                {...register("partnerType")}
              />
              <span className="grid gap-1">
                <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Icon aria-hidden="true" className="h-4 w-4 text-primary" />
                  {option.label}
                </span>
                <span className="text-sm leading-5 text-muted-foreground">
                  {option.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

interface MissionDescriptionFieldProps {
  readonly errors: FieldErrors<PartnerRequestFormValues>;
  readonly idPrefix: string;
  readonly register: UseFormRegister<PartnerRequestFormValues>;
}

function MissionDescriptionField({ errors, idPrefix, register }: MissionDescriptionFieldProps) {
  const descriptionId = `${idPrefix}-mission-description`;
  const errorId = `${descriptionId}-error`;
  const error = errors.missionDescription?.message;

  return (
    <div className="space-y-2">
      <Label htmlFor={descriptionId}>Description de la mission (optionnel)</Label>
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
          {...register("missionDescription")}
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
