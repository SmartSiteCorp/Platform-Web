"use client";

import { isOrganizationRoleCode, type OrganizationRoleCode } from "@smartsite/shared";
import { Search } from "lucide-react";

import { organizationRoleOptions } from "@/components/organization/organization-role-options";
import { Label } from "@/components/ui/label";
import { TextField } from "@/components/ui/text-field";
import type { OrganizationUserResponseDto } from "@/generated/api";

export type RoleFilterValue = "all" | OrganizationRoleCode;

export interface UserRolesFilters {
  readonly name: string;
  readonly roleCode: RoleFilterValue;
}

export const emptyUserRolesFilters: UserRolesFilters = { name: "", roleCode: "all" };

interface OrganizationUserRolesFiltersBarProps {
  readonly filters: UserRolesFilters;
  readonly onFiltersChange: (filters: UserRolesFilters) => void;
}

export function OrganizationUserRolesFiltersBar({
  filters,
  onFiltersChange,
}: OrganizationUserRolesFiltersBarProps) {
  return (
    <div className="grid gap-4 rounded-md border border-border bg-background p-4 md:grid-cols-[minmax(0,1fr)_16rem]">
      <TextField
        error={undefined}
        icon={Search}
        id="organizationUserNameFilter"
        label="Nom ou prénom"
        onChange={(event) => {
          onFiltersChange({ ...filters, name: event.target.value });
        }}
        placeholder="Rechercher un utilisateur"
        type="search"
        value={filters.name}
      />
      <div className="space-y-2">
        <Label htmlFor="organizationUserRoleFilter">Filtrer par rôle</Label>
        <select
          className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/25"
          id="organizationUserRoleFilter"
          onChange={(event) => {
            onFiltersChange({ ...filters, roleCode: parseRoleFilterValue(event.target.value) });
          }}
          value={filters.roleCode}
        >
          <option value="all">Tous les rôles</option>
          {organizationRoleOptions.map((roleOption) => (
            <option key={roleOption.code} value={roleOption.code}>
              {roleOption.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function filterOrganizationUsers(
  users: readonly OrganizationUserResponseDto[],
  filters: UserRolesFilters,
): readonly OrganizationUserResponseDto[] {
  const normalizedName = normalizeUserSearch(filters.name);

  return users.filter(
    (user) =>
      userMatchesNameFilter(user, normalizedName) && userMatchesRoleFilter(user, filters.roleCode),
  );
}

function userMatchesNameFilter(user: OrganizationUserResponseDto, normalizedName: string): boolean {
  if (!normalizedName) {
    return true;
  }

  const directIdentity = normalizeUserSearch(`${user.firstName} ${user.lastName}`);
  const reversedIdentity = normalizeUserSearch(`${user.lastName} ${user.firstName}`);

  return directIdentity.includes(normalizedName) || reversedIdentity.includes(normalizedName);
}

function userMatchesRoleFilter(
  user: OrganizationUserResponseDto,
  roleFilter: RoleFilterValue,
): boolean {
  return roleFilter === "all" || user.roleCodes.includes(roleFilter);
}

function parseRoleFilterValue(value: string): RoleFilterValue {
  if (value === "all") {
    return "all";
  }

  return isOrganizationRoleCode(value) ? value : "all";
}

function normalizeUserSearch(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
