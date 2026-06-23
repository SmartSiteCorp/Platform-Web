import {
  areOrganizationRoleCodesCompatible,
  isAssignableOrganizationRoleCode,
  organizationRoleCompatibilityErrorMessage,
  type AssignableOrganizationRoleCode,
} from "@smartsite/shared";
import { Loader2, Save, ShieldCheck, Users } from "lucide-react";

import {
  getAssignableOrganizationRoleCodes,
  getOrganizationRoleLabel,
  organizationAssignableRoleOptions,
  type OrganizationAssignableRoleOption,
} from "@/components/organization/organization-role-options";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OrganizationUserResponseDto } from "@/generated/api";
import { cn } from "@/lib/utils";

export type UserRoleDrafts = Record<string, readonly AssignableOrganizationRoleCode[]>;

interface OrganizationUserRoleRowProps {
  readonly draftRoleCodes: readonly AssignableOrganizationRoleCode[];
  readonly isSaving: boolean;
  readonly onSave: () => void;
  readonly onToggleRole: (roleCode: AssignableOrganizationRoleCode) => void;
  readonly user: OrganizationUserResponseDto;
}

export function OrganizationUserRoleRow({
  draftRoleCodes,
  isSaving,
  onSave,
  onToggleRole,
  user,
}: OrganizationUserRoleRowProps) {
  const currentAssignableRoleCodes = getAssignableOrganizationRoleCodes(user.roleCodes);
  const validationMessage = getRoleSelectionError(user.roleCodes, draftRoleCodes);
  const isDirty = !areSameRoleCodes(currentAssignableRoleCodes, draftRoleCodes);
  const displayName = getUserDisplayName(user);

  return (
    <section
      aria-label={`Rôles de ${displayName}`}
      className="grid gap-4 rounded-md border border-border bg-background p-4 xl:grid-cols-[minmax(12rem,18rem)_minmax(0,1fr)_auto]"
    >
      <UserIdentity user={user} />
      <UserRoleSelection
        draftRoleCodes={draftRoleCodes}
        onToggleRole={onToggleRole}
        user={user}
        validationMessage={validationMessage}
      />
      <div className="flex items-end xl:justify-end">
        <Button
          aria-label={`Enregistrer les rôles de ${displayName}`}
          className="w-full sm:w-auto"
          disabled={!isDirty || Boolean(validationMessage) || isSaving}
          onClick={onSave}
        >
          {isSaving ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <Save aria-hidden="true" className="h-4 w-4" />
          )}
          Enregistrer
        </Button>
      </div>
    </section>
  );
}

function UserIdentity({ user }: { readonly user: OrganizationUserResponseDto }) {
  return (
    <div className="min-w-0 space-y-3">
      <div className="flex items-start gap-3">
        <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Users aria-hidden="true" className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="break-words text-sm font-semibold">{getUserDisplayName(user)}</h3>
          <p className="break-all text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>
      <UserRoleBadges user={user} />
    </div>
  );
}

function UserRoleBadges({ user }: { readonly user: OrganizationUserResponseDto }) {
  return (
    <div className="flex flex-wrap gap-2">
      {user.roleCodes.map((roleCode) => (
        <Badge key={roleCode} tone={roleCode === "administrateur" ? "success" : "muted"}>
          {roleCode === "administrateur" ? (
            <ShieldCheck aria-hidden="true" className="mr-1 h-3.5 w-3.5" />
          ) : null}
          {getOrganizationRoleLabel(roleCode)}
        </Badge>
      ))}
      <Badge tone={user.status === "active" ? "default" : "warning"}>
        {user.status === "active" ? "Actif" : user.status}
      </Badge>
    </div>
  );
}

function UserRoleSelection({
  draftRoleCodes,
  onToggleRole,
  user,
  validationMessage,
}: {
  readonly draftRoleCodes: readonly AssignableOrganizationRoleCode[];
  readonly onToggleRole: (roleCode: AssignableOrganizationRoleCode) => void;
  readonly user: OrganizationUserResponseDto;
  readonly validationMessage: string | null;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-foreground">Rôles assignables</legend>
      <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-4" role="group">
        {organizationAssignableRoleOptions.map((roleOption) => (
          <UserRoleOption
            key={roleOption.code}
            onToggleRole={onToggleRole}
            roleOption={roleOption}
            selectedRoleCodes={draftRoleCodes}
            userId={user.id}
            userRoleCodes={user.roleCodes}
          />
        ))}
      </div>
      {validationMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {validationMessage}
        </p>
      ) : null}
    </fieldset>
  );
}

function UserRoleOption({
  onToggleRole,
  roleOption,
  selectedRoleCodes,
  userId,
  userRoleCodes,
}: {
  readonly onToggleRole: (roleCode: AssignableOrganizationRoleCode) => void;
  readonly roleOption: OrganizationAssignableRoleOption;
  readonly selectedRoleCodes: readonly AssignableOrganizationRoleCode[];
  readonly userId: string;
  readonly userRoleCodes: readonly string[];
}) {
  const isSelected = selectedRoleCodes.includes(roleOption.code);
  const isDisabled =
    !isSelected && !areRoleCodesAllowed(userRoleCodes, [...selectedRoleCodes, roleOption.code]);

  return (
    <label
      className={cn(
        "flex min-h-20 cursor-pointer items-start gap-3 rounded-md border border-border p-3",
        "transition-colors hover:border-primary/60 hover:bg-muted",
        isSelected && "border-primary/60 bg-primary/10",
        isDisabled && "cursor-not-allowed opacity-55 hover:border-border hover:bg-background",
      )}
      htmlFor={`user-${userId}-role-${roleOption.code}`}
    >
      <input
        checked={isSelected}
        className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-ring/25"
        disabled={isDisabled}
        id={`user-${userId}-role-${roleOption.code}`}
        onChange={() => {
          onToggleRole(roleOption.code);
        }}
        type="checkbox"
      />
      <span className="grid gap-1">
        <span className="text-sm font-semibold">{roleOption.label}</span>
        <span className="text-xs leading-5 text-muted-foreground">{roleOption.description}</span>
      </span>
    </label>
  );
}

export function createUserRoleDrafts(
  users: readonly OrganizationUserResponseDto[],
): UserRoleDrafts {
  return users.reduce<UserRoleDrafts>(
    (drafts, user) => ({
      ...drafts,
      [user.id]: getAssignableOrganizationRoleCodes(user.roleCodes),
    }),
    {},
  );
}

export function toggleRoleCode(
  currentRoleCodes: readonly AssignableOrganizationRoleCode[],
  roleCode: AssignableOrganizationRoleCode,
): readonly AssignableOrganizationRoleCode[] {
  if (currentRoleCodes.includes(roleCode)) {
    return currentRoleCodes.filter((currentRoleCode) => currentRoleCode !== roleCode);
  }

  return [...currentRoleCodes, roleCode];
}

export function getRoleSelectionError(
  userRoleCodes: readonly string[],
  selectedRoleCodes: readonly AssignableOrganizationRoleCode[],
): string | null {
  const nextRoleCodes = getNextRoleCodes(userRoleCodes, selectedRoleCodes);

  if (nextRoleCodes.length === 0) {
    return "Sélectionnez au moins un rôle.";
  }

  if (!areOrganizationRoleCodesCompatible(nextRoleCodes)) {
    return organizationRoleCompatibilityErrorMessage;
  }

  return null;
}

export function getUserDisplayName(user: OrganizationUserResponseDto): string {
  return `${user.firstName} ${user.lastName}`.trim();
}

function areRoleCodesAllowed(
  userRoleCodes: readonly string[],
  selectedRoleCodes: readonly AssignableOrganizationRoleCode[],
): boolean {
  return areOrganizationRoleCodesCompatible(getNextRoleCodes(userRoleCodes, selectedRoleCodes));
}

function getNextRoleCodes(
  userRoleCodes: readonly string[],
  selectedRoleCodes: readonly AssignableOrganizationRoleCode[],
): readonly string[] {
  const fixedRoleCodes = userRoleCodes.filter(
    (roleCode) => !isAssignableOrganizationRoleCode(roleCode),
  );

  return [...fixedRoleCodes, ...selectedRoleCodes];
}

function areSameRoleCodes(
  firstRoleCodes: readonly AssignableOrganizationRoleCode[],
  secondRoleCodes: readonly AssignableOrganizationRoleCode[],
): boolean {
  return buildRoleKey(firstRoleCodes) === buildRoleKey(secondRoleCodes);
}

function buildRoleKey(roleCodes: readonly AssignableOrganizationRoleCode[]): string {
  return [...roleCodes].sort().join("|");
}
