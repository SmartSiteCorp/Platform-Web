"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  Building2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { useForm, type FieldErrors, type UseFormRegister } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
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
        <TextField
          autoComplete="given-name"
          error={errors.firstName?.message}
          icon={User}
          id="firstName"
          label="Prénom"
          type="text"
          {...register("firstName")}
        />
        <TextField
          autoComplete="family-name"
          error={errors.lastName?.message}
          icon={User}
          id="lastName"
          label="Nom"
          type="text"
          {...register("lastName")}
        />
      </div>
      <TextField
        autoComplete="organization"
        error={errors.organizationName?.message}
        icon={Building2}
        id="organizationName"
        label="Nom entreprise"
        type="text"
        {...register("organizationName")}
      />
    </>
  );
}

function RegisterCredentialFields({ errors, register }: RegisterFieldsProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isPasswordConfirmationVisible, setIsPasswordConfirmationVisible] = useState(false);

  return (
    <>
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
        autoComplete="new-password"
        error={errors.password?.message}
        icon={Lock}
        id="password"
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
        id="passwordConfirmation"
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
