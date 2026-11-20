"use client";

import { Users } from "lucide-react";

import { getOrganizationRoleLabel } from "@/components/organization/organization-role-options";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProjectUserResponseDto } from "@/generated/api";
import { useSiteIntervenants, type SiteIntervenantsOptions } from "./site-intervenants-state";

export function SiteIntervenantsSection(props: SiteIntervenantsOptions) {
  const state = useSiteIntervenants(props);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users aria-hidden="true" className="h-5 w-5 text-primary" />
          Intervenants
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {state.loading ? (
          <p role="status">Chargement des intervenants...</p>
        ) : (
          <>
            <MembersList members={state.members} />
            {state.error ? (
              <div className="space-y-2">
                <p role="alert" className="text-sm text-destructive">
                  {state.error}
                </p>
                <Button type="button" variant="secondary" onClick={state.retry}>
                  Réessayer
                </Button>
              </div>
            ) : null}
            {state.canManage && !state.error ? <IntervenantsForm state={state} /> : null}
            {state.success ? (
              <p
                role="status"
                className="rounded-md bg-success/20 p-3 text-sm text-success-foreground"
              >
                {state.success}
              </p>
            ) : null}
            {state.errors.length > 0 ? (
              <ul role="alert" className="space-y-1 text-sm text-destructive">
                {state.errors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MembersList({ members }: { readonly members: readonly ProjectUserResponseDto[] }) {
  if (members.length === 0)
    return <p className="text-sm text-muted-foreground">Aucun intervenant associé.</p>;
  return (
    <ul aria-label="Intervenants du chantier" className="grid gap-2 sm:grid-cols-2">
      {members.map((member) => (
        <li key={member.userId} className="space-y-2 rounded-md border border-border p-3">
          <p className="break-words font-medium">
            {member.firstName} {member.lastName}
          </p>
          <Roles codes={member.roleCodes} />
        </li>
      ))}
    </ul>
  );
}

function Roles({ codes }: { readonly codes: readonly string[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {codes.length === 0 ? (
        <span className="text-sm text-muted-foreground">Aucun rôle actif</span>
      ) : null}
      {codes.map((code) => (
        <Badge key={code}>{getOrganizationRoleLabel(code)}</Badge>
      ))}
    </span>
  );
}

function IntervenantsForm({ state }: { readonly state: ReturnType<typeof useSiteIntervenants> }) {
  if (state.available.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun nouvel intervenant disponible dans votre organisation.
      </p>
    );
  }
  return (
    <form
      aria-label="Ajouter des intervenants"
      onSubmit={(event) => {
        event.preventDefault();
        void state.submit();
      }}
      className="space-y-3"
    >
      <fieldset disabled={state.submitting} className="space-y-3">
        <legend className="text-sm font-semibold">
          Utilisateurs disponibles de votre organisation
        </legend>
        <div className="grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2">
          {state.available.map((user) => (
            <label
              key={user.id}
              className="flex items-start gap-3 rounded-md border border-border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/10"
            >
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0 accent-primary"
                aria-label={`Sélectionner ${user.firstName} ${user.lastName}`}
                checked={state.selected.includes(user.id)}
                onChange={() => {
                  state.toggle(user.id);
                }}
              />
              <span className="min-w-0 space-y-2">
                <span className="block break-words text-sm font-medium">
                  {user.firstName} {user.lastName}
                </span>
                <Roles codes={user.roleCodes} />
              </span>
            </label>
          ))}
        </div>
        <Button type="submit" disabled={state.selected.length === 0} className="w-full sm:w-auto">
          {state.submitting
            ? "Ajout en cours..."
            : `Ajouter les intervenants (${String(state.selected.length)})`}
        </Button>
      </fieldset>
    </form>
  );
}
