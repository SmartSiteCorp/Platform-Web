"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Lock, LogIn, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm, type FieldErrors, type UseFormRegister } from "react-hook-form";

import { AuthApiError } from "@/components/auth/auth-api-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TextField } from "@/components/ui/text-field";
import type { LoginRequestDto, LoginResponseDto } from "@/generated/api";
import type { LoginAccountResult } from "@/lib/login-account";
import {
  buildLoginRequest,
  loginFormDefaultValues,
  loginFormSchema,
  type LoginFormValues,
} from "./login-form.schema";

export type LoginSubmitter = (request: LoginRequestDto) => Promise<LoginAccountResult>;

interface LoginFormProps {
  readonly onLoginCompleted: (account: LoginResponseDto) => void;
  readonly submitLogin: LoginSubmitter;
}

export function LoginForm({ onLoginCompleted, submitLogin }: LoginFormProps) {
  const [apiError, setApiError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<LoginFormValues>({
    defaultValues: loginFormDefaultValues,
    mode: "onTouched",
    resolver: zodResolver(loginFormSchema),
  });

  const submitValidForm = async (values: LoginFormValues): Promise<void> => {
    setApiError(null);

    const result = await submitLogin(buildLoginRequest(values));

    if (!result.ok) {
      setApiError(result.message);
      return;
    }

    onLoginCompleted(result.account);
  };
  const submitForm = handleSubmit(submitValidForm);

  return (
    <Card className="w-full border-2 border-border shadow-xl">
      <CardHeader>
        <CardTitle className="text-xl">Connexion utilisateur</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" noValidate onSubmit={(event) => void submitForm(event)}>
          <AuthApiError message={apiError} />
          <LoginCredentialFields errors={errors} register={register} />
          <LoginSubmitButton isSubmitting={isSubmitting} />
          <LoginRegisterLink />
        </form>
      </CardContent>
    </Card>
  );
}

interface LoginFieldsProps {
  readonly errors: FieldErrors<LoginFormValues>;
  readonly register: UseFormRegister<LoginFormValues>;
}

function LoginCredentialFields({ errors, register }: LoginFieldsProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

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
        autoComplete="current-password"
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
    </>
  );
}

function LoginSubmitButton({ isSubmitting }: { readonly isSubmitting: boolean }) {
  return (
    <Button className="w-full" disabled={isSubmitting} type="submit">
      {isSubmitting ? (
        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
      ) : (
        <LogIn aria-hidden="true" className="h-4 w-4" />
      )}
      Se connecter
    </Button>
  );
}

function LoginRegisterLink() {
  return (
    <p className="text-center text-sm text-muted-foreground">
      Pas encore de compte ?{" "}
      <Link className="font-semibold text-primary hover:underline" href="/register">
        Créer une organisation
      </Link>
    </p>
  );
}
