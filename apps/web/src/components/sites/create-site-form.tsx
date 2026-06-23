"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar, Clock, HardHat, Loader2, MapPin, PlusCircle } from "lucide-react";
import { useState } from "react";
import { useForm, type FieldErrors, type UseFormRegister } from "react-hook-form";

import { OrganizationFormStatusMessage } from "@/components/organization/organization-form-status-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import type { SiteResponseDto } from "@/generated/api";
import type { CreateSiteResult } from "@/lib/sites";
import {
  buildCreateSiteRequest,
  createSiteFormDefaultValues,
  createSiteFormSchema,
  type CreateSiteFormValues,
} from "./create-site-form.schema";

export type CreateSiteSubmitter = (
  request: ReturnType<typeof buildCreateSiteRequest>,
) => Promise<CreateSiteResult>;

interface CreateSiteFormProps {
  readonly onSiteCreated: (site: SiteResponseDto) => void;
  readonly submitCreateSite: CreateSiteSubmitter;
}

export function CreateSiteForm({ onSiteCreated, submitCreateSite }: CreateSiteFormProps) {
  const [apiError, setApiError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<CreateSiteFormValues>({
    defaultValues: createSiteFormDefaultValues,
    mode: "onTouched",
    resolver: zodResolver(createSiteFormSchema),
  });

  const submitValidForm = async (values: CreateSiteFormValues): Promise<void> => {
    setApiError(null);

    const result = await submitCreateSite(buildCreateSiteRequest(values));

    if (!result.ok) {
      setApiError(result.message);
      return;
    }

    onSiteCreated(result.site);
  };
  const submitForm = handleSubmit(submitValidForm);

  return (
    <Card className="border-2 border-border shadow-xl">
      <CardHeader>
        <CardTitle>Nouveau chantier</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          aria-label="Formulaire création chantier"
          className="space-y-5"
          noValidate
          onSubmit={(event) => void submitForm(event)}
        >
          <OrganizationFormStatusMessage message={apiError} tone="error" />
          <CreateSiteFields errors={errors} register={register} />
          <Button className="w-full sm:w-auto" disabled={isSubmitting} type="submit">
            {isSubmitting ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <PlusCircle aria-hidden="true" className="h-4 w-4" />
            )}
            Créer le chantier
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

interface CreateSiteFieldsProps {
  readonly errors: FieldErrors<CreateSiteFormValues>;
  readonly register: UseFormRegister<CreateSiteFormValues>;
}

function CreateSiteFields({ errors, register }: CreateSiteFieldsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <TextField
          autoComplete="off"
          error={errors.name?.message}
          icon={HardHat}
          id="name"
          label="Nom du chantier"
          type="text"
          {...register("name")}
        />
      </div>
      <div className="md:col-span-2">
        <TextField
          autoComplete="street-address"
          error={errors.address?.message}
          icon={MapPin}
          id="address"
          label="Adresse (optionnel)"
          type="text"
          {...register("address")}
        />
      </div>
      <TextField
        error={errors.startDate?.message}
        icon={Calendar}
        id="startDate"
        label="Date de début (optionnel)"
        type="date"
        {...register("startDate")}
      />
      <TextField
        error={errors.estimatedDurationDays?.message}
        icon={Clock}
        id="estimatedDurationDays"
        label="Durée estimée en jours (optionnel)"
        min="1"
        step="1"
        type="number"
        {...register("estimatedDurationDays")}
      />
    </div>
  );
}
