"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  Building2,
  CheckCircle,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, type FieldErrors, type UseFormRegister } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import type { OrganizationResponseDto, UpdateOrganizationRequestDto } from "@/generated/api";
import type { OrganizationSettingsResult } from "@/lib/organization-settings";
import {
  buildOrganizationSettingsDefaultValues,
  buildUpdateOrganizationRequest,
  organizationSettingsFormSchema,
  type OrganizationSettingsFormValues,
} from "./organization-settings-form.schema";

export type OrganizationUpdateSubmitter = (
  organizationId: string,
  request: UpdateOrganizationRequestDto,
) => Promise<OrganizationSettingsResult>;

interface OrganizationSettingsFormProps {
  readonly onOrganizationSaved: (organization: OrganizationResponseDto) => void;
  readonly organization: OrganizationResponseDto;
  readonly submitOrganizationUpdate: OrganizationUpdateSubmitter;
}

export function OrganizationSettingsForm({
  onOrganizationSaved,
  organization,
  submitOrganizationUpdate,
}: OrganizationSettingsFormProps) {
  const [apiError, setApiError] = useState<string | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<OrganizationSettingsFormValues>({
    defaultValues: buildOrganizationSettingsDefaultValues(organization),
    mode: "onTouched",
    resolver: zodResolver(organizationSettingsFormSchema),
  });

  useEffect(() => {
    reset(buildOrganizationSettingsDefaultValues(organization));
  }, [organization, reset]);

  const submitValidForm = async (values: OrganizationSettingsFormValues): Promise<void> => {
    setApiError(null);
    setConfirmationMessage(null);

    const result = await submitOrganizationUpdate(
      organization.id,
      buildUpdateOrganizationRequest(values),
    );

    if (!result.ok) {
      setApiError(result.message);
      return;
    }

    reset(buildOrganizationSettingsDefaultValues(result.organization));
    setConfirmationMessage("Informations entreprise mises à jour.");
    onOrganizationSaved(result.organization);
  };
  const submitForm = handleSubmit(submitValidForm);

  return (
    <Card className="border-2 border-border shadow-xl">
      <CardHeader>
        <CardTitle>Informations entreprise</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" noValidate onSubmit={(event) => void submitForm(event)}>
          <FormStatusMessage message={apiError} tone="error" />
          <FormStatusMessage message={confirmationMessage} tone="success" />
          <OrganizationSettingsFields errors={errors} register={register} />
          <Button className="w-full sm:w-auto" disabled={isSubmitting} type="submit">
            {isSubmitting ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <Save aria-hidden="true" className="h-4 w-4" />
            )}
            Enregistrer
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

interface OrganizationSettingsFieldsProps {
  readonly errors: FieldErrors<OrganizationSettingsFormValues>;
  readonly register: UseFormRegister<OrganizationSettingsFormValues>;
}

function OrganizationSettingsFields({ errors, register }: OrganizationSettingsFieldsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <TextField
        autoComplete="organization"
        error={errors.name?.message}
        icon={Building2}
        id="name"
        label="Nom entreprise"
        type="text"
        {...register("name")}
      />
      <TextField
        autoComplete="email"
        error={errors.email?.message}
        icon={Mail}
        id="email"
        label="Email"
        type="email"
        {...register("email")}
      />
      <TextField
        autoComplete="tel"
        error={errors.phone?.message}
        icon={Phone}
        id="phone"
        label="Téléphone"
        type="tel"
        {...register("phone")}
      />
      <TextField
        autoComplete="street-address"
        error={errors.address?.message}
        icon={MapPin}
        id="address"
        label="Adresse"
        type="text"
        {...register("address")}
      />
    </div>
  );
}

function FormStatusMessage({
  message,
  tone,
}: {
  readonly message: string | null;
  readonly tone: "error" | "success";
}) {
  if (!message) {
    return null;
  }

  const Icon = tone === "error" ? AlertCircle : CheckCircle;
  const toneClasses =
    tone === "error"
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : "border-success/40 bg-success/20 text-success-foreground";

  return (
    <div
      className={`flex items-start gap-3 rounded-md border p-3 text-sm ${toneClasses}`}
      role="alert"
    >
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
