"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Building2, Loader2, Lock, Mail, User, UserPlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { HTMLInputTypeAttribute } from "react";
import { useState } from "react";
import {
  useForm,
  type FieldErrors,
  type UseFormRegister,
  type UseFormRegisterReturn,
} from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RegisterRequestDto, RegisterResponseDto } from "@/generated/api";
import type { RegisterAccountResult } from "@/lib/register-account";
import {
  buildRegisterRequest,
  registerFormDefaultValues,
  registerFormSchema,
  type RegisterFormValues,
} from "./register-form.schema";

export type RegisterSubmitter = (request: RegisterRequestDto) => Promise<RegisterAccountResult>;

interface RegisterFormProps {
  readonly onRegistrationCompleted: (account: RegisterResponseDto) => void;
  readonly submitRegistration: RegisterSubmitter;
}

export function RegisterForm({ onRegistrationCompleted, submitRegistration }: RegisterFormProps) {
  const [apiError, setApiError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<RegisterFormValues>({
    defaultValues: registerFormDefaultValues,
    mode: "onTouched",
    resolver: zodResolver(registerFormSchema),
  });

  const submitValidForm = async (values: RegisterFormValues): Promise<void> => {
    setApiError(null);

    const result = await submitRegistration(buildRegisterRequest(values));

    if (!result.ok) {
      setApiError(result.message);
      return;
    }

    onRegistrationCompleted(result.account);
  };
  const submitForm = handleSubmit(submitValidForm);

  return (
    <Card className="w-full border-2 border-border shadow-xl">
      <CardHeader>
        <CardTitle className="text-xl">Créer une organisation</CardTitle>
        <p className="text-sm text-muted-foreground">
          Le premier compte devient administrateur de l'entreprise.
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" noValidate onSubmit={(event) => void submitForm(event)}>
          <RegisterApiError message={apiError} />
          <RegisterIdentityFields errors={errors} register={register} />
          <RegisterCredentialFields errors={errors} register={register} />
          <PasswordHint />
          <RegisterSubmitButton isSubmitting={isSubmitting} />
        </form>
      </CardContent>
    </Card>
  );
}

interface RegisterFieldsProps {
  readonly errors: FieldErrors<RegisterFormValues>;
  readonly register: UseFormRegister<RegisterFormValues>;
}

function RegisterIdentityFields({ errors, register }: RegisterFieldsProps) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormTextField
          autoComplete="given-name"
          error={errors.firstName?.message}
          icon={User}
          id="firstName"
          label="Prénom"
          registration={register("firstName")}
          type="text"
        />
        <FormTextField
          autoComplete="family-name"
          error={errors.lastName?.message}
          icon={User}
          id="lastName"
          label="Nom"
          registration={register("lastName")}
          type="text"
        />
      </div>
      <FormTextField
        autoComplete="organization"
        error={errors.organizationName?.message}
        icon={Building2}
        id="organizationName"
        label="Nom entreprise"
        registration={register("organizationName")}
        type="text"
      />
    </>
  );
}

function RegisterCredentialFields({ errors, register }: RegisterFieldsProps) {
  return (
    <>
      <FormTextField
        autoComplete="email"
        error={errors.email?.message}
        icon={Mail}
        id="email"
        label="Email"
        registration={register("email")}
        type="email"
      />
      <FormTextField
        autoComplete="new-password"
        error={errors.password?.message}
        icon={Lock}
        id="password"
        label="Mot de passe"
        registration={register("password")}
        type="password"
      />
      <FormTextField
        autoComplete="new-password"
        error={errors.passwordConfirmation?.message}
        icon={Lock}
        id="passwordConfirmation"
        label="Confirmation mot de passe"
        registration={register("passwordConfirmation")}
        type="password"
      />
    </>
  );
}

function RegisterSubmitButton({ isSubmitting }: { readonly isSubmitting: boolean }) {
  return (
    <Button className="w-full" disabled={isSubmitting} type="submit">
      {isSubmitting ? (
        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
      ) : (
        <UserPlus aria-hidden="true" className="h-4 w-4" />
      )}
      Créer le compte
    </Button>
  );
}

interface FormTextFieldProps {
  readonly autoComplete: string;
  readonly error: string | undefined;
  readonly icon: LucideIcon;
  readonly id: string;
  readonly label: string;
  readonly registration: UseFormRegisterReturn;
  readonly type: HTMLInputTypeAttribute;
}

function FormTextField({
  autoComplete,
  error,
  icon: Icon,
  id,
  label,
  registration,
  type,
}: FormTextFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Icon
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          aria-describedby={error ? errorId : undefined}
          aria-invalid={Boolean(error)}
          autoComplete={autoComplete}
          className="pl-10"
          id={id}
          type={type}
          {...registration}
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

function RegisterApiError({ message }: { readonly message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <div
      className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
      role="alert"
    >
      <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function PasswordHint() {
  return (
    <p className="text-xs leading-5 text-muted-foreground">
      12 caractères minimum avec majuscule, minuscule, chiffre et symbole.
    </p>
  );
}
