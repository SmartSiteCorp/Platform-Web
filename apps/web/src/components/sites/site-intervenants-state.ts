import { useEffect, useRef, useState } from "react";

import type { OrganizationUserResponseDto, ProjectUserResponseDto } from "@/generated/api";
import { addProjectUser, listAvailableProjectUsers, listProjectUsers } from "@/lib/project-users";

export interface SiteIntervenantsOptions {
  readonly accessToken: string;
  readonly organizationId: string;
  readonly siteId: string;
  readonly userId: string;
}

interface IntervenantsData {
  readonly members: ProjectUserResponseDto[];
  readonly available: OrganizationUserResponseDto[];
  readonly canManage: boolean;
  readonly error: string | null;
}

const emptyData: IntervenantsData = {
  members: [],
  available: [],
  canManage: false,
  error: null,
};

export function useSiteIntervenants(options: SiteIntervenantsOptions) {
  const { accessToken, organizationId, siteId, userId } = options;
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setData(emptyData);
    setSelected([]);
    setErrors([]);
    setSuccess(null);
    void loadData(accessToken, organizationId, siteId, userId).then((result) => {
      if (!cancelled) {
        setData(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [accessToken, organizationId, siteId, userId, revision]);

  const submit = async () => {
    if (busy.current || selected.length === 0 || !data.canManage) return;
    busy.current = true;
    setSubmitting(true);
    setErrors([]);
    setSuccess(null);
    try {
      const result = await submitSelection(options, selected, data.available);
      setData((current) => ({
        ...current,
        members: mergeMembers(current.members, result.members),
      }));
      setSelected(result.failedIds);
      setErrors(result.errors);
      if (result.members.length > 0) {
        setSuccess(
          result.members.length === 1
            ? "Intervenant ajouté au chantier."
            : `${String(result.members.length)} intervenants ajoutés au chantier.`,
        );
      }
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  };

  return {
    ...data,
    loading,
    selected,
    submitting,
    errors,
    success,
    submit,
    available: data.available.filter(
      (user) => !data.members.some((member) => member.userId === user.id),
    ),
    retry: () => {
      setRevision((value) => value + 1);
    },
    toggle: (id: string) => {
      setSuccess(null);
      setErrors([]);
      setSelected((current) =>
        current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
      );
    },
  };
}

async function loadData(
  accessToken: string,
  organizationId: string,
  siteId: string,
  userId: string,
): Promise<IntervenantsData> {
  const members = await listProjectUsers(accessToken, siteId);
  if (!members.ok) return { ...emptyData, error: members.message };
  const canManage = members.data.some(
    (member) =>
      member.userId === userId &&
      member.roleCodes.some((role) => role === "administrateur" || role === "chef_chantier"),
  );
  if (!canManage) return { ...emptyData, members: members.data };
  const available = await listAvailableProjectUsers(accessToken, organizationId);
  return {
    members: members.data,
    canManage,
    available: available.ok ? available.data : [],
    error: available.ok ? null : available.message,
  };
}

async function submitSelection(
  options: SiteIntervenantsOptions,
  selected: readonly string[],
  available: readonly OrganizationUserResponseDto[],
) {
  const members: ProjectUserResponseDto[] = [];
  const failedIds: string[] = [];
  const errors: string[] = [];
  for (const id of selected) {
    const result = await addProjectUser(options.accessToken, options.siteId, id);
    if (result.ok) {
      members.push(result.data);
    } else {
      failedIds.push(id);
      const user = available.find((candidate) => candidate.id === id);
      errors.push(`${user ? `${user.firstName} ${user.lastName} : ` : ""}${result.message}`);
    }
  }
  return { members, failedIds, errors };
}

function mergeMembers(current: ProjectUserResponseDto[], added: ProjectUserResponseDto[]) {
  const members = new Map(current.map((member) => [member.userId, member]));
  for (const member of added) members.set(member.userId, member);
  return [...members.values()];
}
