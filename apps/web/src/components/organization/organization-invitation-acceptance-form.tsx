"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Lock, Mail, Phone, User, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm, type FieldErrors, type UseFormRegister } from "react-hook-form";

import { AuthApiError } from "@/components/auth/auth-api-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import type {
  AcceptOrganizationInvitationRequestDto,
  AcceptOrganizationInvitationResponseDto,
} from "@/generated/api";
import type { AcceptOrganizationInvitationResult } from "@/lib/organization-invitations";
import {
  buildAcceptOrganizationInvitationRequest,
  buildOrganizationInvitationAcceptanceDefaultValues,
  organizationInvitationAcceptanceFormSchema,
  type OrganizationInvitationAcceptanceFormValues,
} from "./organization-invitation-acceptance-form.schema";

export type OrganizationInvitationAcceptanceSubmitter = (
  request: AcceptOrganizationInvitationRequestDto,
) => Promise<AcceptOrganizationInvitationResult>;

interface OrganizationInvitationAcceptanceFormProps {
  readonly onInvitationAccepted: (account: AcceptOrganizationInvitationResponseDto) => void;
  readonly submitInvitationAcceptance: OrganizationInvitationAcceptanceSubmitter;
  readonly token: string;
}

export function OrganizationInvitationAcceptanceForm({
  onInvitationAccepted,
  submitInvitationAcceptance,
  token,
}: OrganizationInvitationAcceptanceFormProps) {
  const [apiError, setApiError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<OrganizationInvitationAcceptanceFormValues>({
    defaultValues: buildOrganizationInvitationAcceptanceDefaultValues(token),
    mode: "onTouched",
    resolver: zodResolver(organizationInvitationAcceptanceFormSchema),
  });

  const submitValidForm = async (
    values: OrganizationInvitationAcceptanceFormValues,
  ): Promise<void> => {
    setApiError(null);

    const result = await submitInvitationAcceptance(
      buildAcceptOrganizationInvitationRequest(values),
    );

    if (!result.ok) {
      setApiError(result.message);
      return;
    }

    onInvitationAccepted(result.account);
  };
  const submitForm = handleSubmit(submitValidForm);

  return (
    <Card className="w-full border-2 border-border shadow-xl">
      <CardHeader>
        <CardTitle className="text-xl">Accepter l'invitation</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          aria-label="Formulaire création compte invitation"
          className="space-y-4"
          noValidate
          onSubmit={(event) => void submitForm(event)}
        >
          <AuthApiError message={apiError} />
          <InvitationAcceptanceIdentityFields errors={errors} register={register} />
          <InvitationAcceptanceCredentialFields errors={errors} register={register} />
          <InvitationAcceptancePasswordHint />
          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? (
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus aria-hidden="true" className="h-4 w-4" />
            )}
            Créer mon compte
          </Button>
          <InvitationAcceptanceLoginLink />
        </form>
      </CardContent>
    </Card>
  );
}

interface InvitationAcceptanceFieldsProps {
  readonly errors: FieldErrors<OrganizationInvitationAcceptanceFormValues>;
  readonly register: UseFormRegister<OrganizationInvitationAcceptanceFormValues>;
}

function InvitationAcceptanceIdentityFields({ errors, register }: InvitationAcceptanceFieldsProps) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          autoComplete="given-name"
          error={errors.firstName?.message}
          icon={User}
          id="invitationFirstName"
          label="Prénom"
          type="text"
          {...register("firstName")}
        />
        <TextField
          autoComplete="family-name"
          error={errors.lastName?.message}
          icon={User}
          id="invitationLastName"
          label="Nom"
          type="text"
          {...register("lastName")}
        />
      </div>
      <TextField
        autoComplete="email"
        error={errors.email?.message}
        icon={Mail}
        id="invitationAcceptedEmail"
        label="Email"
        type="email"
        {...register("email")}
      />
      <TextField
        autoComplete="tel"
        error={errors.phone?.message}
        icon={Phone}
        id="invitationAcceptedPhone"
        label="Téléphone"
        type="tel"
        {...register("phone")}
      />
    </>
  );
}

function InvitationAcceptanceCredentialFields({
  errors,
  register,
}: InvitationAcceptanceFieldsProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isPasswordConfirmationVisible, setIsPasswordConfirmationVisible] = useState(false);

  return (
    <>
      <TextField
        autoComplete="new-password"
        error={errors.password?.message}
        icon={Lock}
        id="invitationPassword"
        label="Mot de passe"
        trailingAction={{
          ariaLabel: isPasswordVisible ? "Masquer le mot de passe" : "Afficher le mot de passe",
          icon: isPasswordVisible ? EyeOff : Eye,
          onClick: () => {
            setIsPasswordVisible((currentValue) => !currentValue);
          },
          pressed: isPasswordVisible,
        }}
        type={isPasswordVisible ? "text" : "password"}
        {...register("password")}
      />
      <TextField
        autoComplete="new-password"
        error={errors.passwordConfirmation?.message}
        icon={Lock}
        id="invitationPasswordConfirmation"
        label="Confirmation mot de passe"
        trailingAction={{
          ariaLabel: isPasswordConfirmationVisible
            ? "Masquer la confirmation du mot de passe"
            : "Afficher la confirmation du mot de passe",
          icon: isPasswordConfirmationVisible ? EyeOff : Eye,
          onClick: () => {
            setIsPasswordConfirmationVisible((currentValue) => !currentValue);
          },
          pressed: isPasswordConfirmationVisible,
        }}
        type={isPasswordConfirmationVisible ? "text" : "password"}
        {...register("passwordConfirmation")}
      />
    </>
  );
}

function InvitationAcceptancePasswordHint() {
  return (
    <p className="text-xs leading-5 text-muted-foreground">
      12 caractères minimum avec majuscule, minuscule, chiffre et symbole.
    </p>
  );
}

function InvitationAcceptanceLoginLink() {
  return (
    <p className="text-center text-sm text-muted-foreground">
      Vous avez déjà un compte ?{" "}
      <Link className="font-semibold text-primary hover:underline" href="/login">
        Se connecter
      </Link>
    </p>
  );
}
