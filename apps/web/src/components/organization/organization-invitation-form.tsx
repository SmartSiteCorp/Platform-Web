"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail, UserPlus } from "lucide-react";
import { useState, type BaseSyntheticEvent } from "react";
import { useForm, type FieldErrors, type UseFormRegister } from "react-hook-form";

import {
  buildCreatedOrganizationInvitationView,
  CreatedOrganizationInvitationPanel,
  type CreatedOrganizationInvitationView,
} from "@/components/organization/created-organization-invitation-panel";
import { OrganizationFormStatusMessage } from "@/components/organization/organization-form-status-message";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import type { CreateOrganizationInvitationRequestDto } from "@/generated/api";
import type { CreateOrganizationInvitationResult } from "@/lib/organization-invitations";
import { cn } from "@/lib/utils";
import {
  buildCreateOrganizationInvitationRequest,
  inviteableOrganizationRoleOptions,
  isInviteableOrganizationRoleDisabled,
  organizationInvitationFormDefaultValues,
  organizationInvitationFormSchema,
  type InviteableOrganizationRoleCode,
  type InviteableOrganizationRoleOption,
  type OrganizationInvitationFormValues,
} from "./organization-invitation-form.schema";

export type OrganizationInvitationSubmitter = (
  organizationId: string,
  request: CreateOrganizationInvitationRequestDto,
) => Promise<CreateOrganizationInvitationResult>;

interface OrganizationInvitationFormProps {
  readonly organizationId: string;
  readonly submitOrganizationInvitation: OrganizationInvitationSubmitter;
}

export function OrganizationInvitationForm({
  organizationId,
  submitOrganizationInvitation,
}: OrganizationInvitationFormProps) {
  const invitationForm = useOrganizationInvitationFormState(
    organizationId,
    submitOrganizationInvitation,
  );

  return (
    <>
      <form
        aria-label="Formulaire invitation utilisateur"
        className="space-y-5"
        noValidate
        onSubmit={(event) => void invitationForm.submitForm(event)}
      >
        <OrganizationFormStatusMessage message={invitationForm.apiError} tone="error" />
        <OrganizationFormStatusMessage
          message={invitationForm.confirmationMessage}
          tone="success"
        />
        <InvitationFields
          errors={invitationForm.errors}
          register={invitationForm.register}
          selectedRoleCodes={invitationForm.selectedRoleCodes}
        />
        <Button className="w-full sm:w-auto" disabled={invitationForm.isSubmitting} type="submit">
          {invitationForm.isSubmitting ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus aria-hidden="true" className="h-4 w-4" />
          )}
          Envoyer l'invitation
        </Button>
      </form>
      <CreatedOrganizationInvitationPanel
        copyMessage={invitationForm.copyMessage}
        createdInvitation={invitationForm.createdInvitation}
        onCopyInvitationLink={() => void invitationForm.copyInvitationLink()}
      />
    </>
  );
}

interface OrganizationInvitationFormState {
  readonly apiError: string | null;
  readonly confirmationMessage: string | null;
  readonly copyInvitationLink: () => Promise<void>;
  readonly copyMessage: string | null;
  readonly createdInvitation: CreatedOrganizationInvitationView | null;
  readonly errors: FieldErrors<OrganizationInvitationFormValues>;
  readonly isSubmitting: boolean;
  readonly register: UseFormRegister<OrganizationInvitationFormValues>;
  readonly selectedRoleCodes: readonly InviteableOrganizationRoleCode[];
  readonly submitForm: (event?: BaseSyntheticEvent) => Promise<void>;
}

function useOrganizationInvitationFormState(
  organizationId: string,
  submitOrganizationInvitation: OrganizationInvitationSubmitter,
): OrganizationInvitationFormState {
  const [apiError, setApiError] = useState<string | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);
  const [createdInvitation, setCreatedInvitation] =
    useState<CreatedOrganizationInvitationView | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    watch,
  } = useForm<OrganizationInvitationFormValues>({
    defaultValues: organizationInvitationFormDefaultValues,
    mode: "onTouched",
    resolver: zodResolver(organizationInvitationFormSchema),
  });
  const selectedRoleCodes = watch("roleCodes");

  const submitValidForm = async (values: OrganizationInvitationFormValues): Promise<void> => {
    setApiError(null);
    setConfirmationMessage(null);
    setCopyMessage(null);

    const result = await submitOrganizationInvitation(
      organizationId,
      buildCreateOrganizationInvitationRequest(values),
    );

    if (!result.ok) {
      setCreatedInvitation(null);
      setApiError(result.message);
      return;
    }

    setCreatedInvitation(buildCreatedOrganizationInvitationView(result.invitation));
    setConfirmationMessage(`Invitation prête pour ${result.invitation.email}.`);
    reset(organizationInvitationFormDefaultValues);
  };
  const submitForm = handleSubmit(submitValidForm);

  const copyInvitationLink = async (): Promise<void> => {
    if (!createdInvitation) {
      return;
    }

    try {
      await navigator.clipboard.writeText(createdInvitation.invitationUrl);
      setCopyMessage("Lien copié.");
    } catch {
      setCopyMessage("Copiez le lien manuellement.");
    }
  };

  return {
    apiError,
    confirmationMessage,
    copyInvitationLink,
    copyMessage,
    createdInvitation,
    errors,
    isSubmitting,
    register,
    selectedRoleCodes,
    submitForm,
  };
}

interface InvitationFieldsProps {
  readonly errors: FieldErrors<OrganizationInvitationFormValues>;
  readonly register: UseFormRegister<OrganizationInvitationFormValues>;
  readonly selectedRoleCodes: readonly InviteableOrganizationRoleCode[];
}

function InvitationFields({ errors, register, selectedRoleCodes }: InvitationFieldsProps) {
  return (
    <>
      <TextField
        autoComplete="email"
        error={errors.email?.message}
        icon={Mail}
        id="invitationEmail"
        label="Email"
        type="email"
        {...register("email")}
      />
      <RoleSelectionField
        errors={errors}
        register={register}
        selectedRoleCodes={selectedRoleCodes}
      />
    </>
  );
}

function RoleSelectionField({ errors, register, selectedRoleCodes }: InvitationFieldsProps) {
  const roleCodesRegistration = register("roleCodes");

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-foreground">Rôles</legend>
      <div
        aria-label="Sélection des rôles invitation"
        className="grid gap-3 md:grid-cols-2"
        role="group"
      >
        {inviteableOrganizationRoleOptions.map((roleOption) => (
          <InvitationRoleOption
            key={roleOption.code}
            roleOption={roleOption}
            roleRegistration={roleCodesRegistration}
            selectedRoleCodes={selectedRoleCodes}
          />
        ))}
      </div>
      {errors.roleCodes?.message ? (
        <p className="text-sm text-destructive" role="alert">
          {errors.roleCodes.message}
        </p>
      ) : null}
    </fieldset>
  );
}

function InvitationRoleOption({
  roleOption,
  roleRegistration,
  selectedRoleCodes,
}: {
  readonly roleOption: InviteableOrganizationRoleOption;
  readonly roleRegistration: ReturnType<UseFormRegister<OrganizationInvitationFormValues>>;
  readonly selectedRoleCodes: readonly InviteableOrganizationRoleCode[];
}) {
  const isDisabled = isInviteableOrganizationRoleDisabled(selectedRoleCodes, roleOption.code);

  return (
    <label
      className={cn(
        "flex min-h-24 cursor-pointer gap-3 rounded-md border border-border bg-background p-4",
        "transition-colors hover:border-primary/60 hover:bg-muted",
        isDisabled && "cursor-not-allowed opacity-55 hover:border-border hover:bg-background",
      )}
      htmlFor={`invitation-role-${roleOption.code}`}
    >
      <input
        className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-ring/25"
        id={`invitation-role-${roleOption.code}`}
        disabled={isDisabled}
        type="checkbox"
        value={roleOption.code}
        {...roleRegistration}
      />
      <span className="grid gap-1">
        <span className="text-sm font-semibold text-foreground">{roleOption.label}</span>
        <span className="text-sm leading-5 text-muted-foreground">{roleOption.description}</span>
      </span>
    </label>
  );
}
