export interface PhaseDetails {
  readonly id: string;
  readonly siteId: string;
  readonly name: string;
  readonly description: string | null;
  readonly position: number;
  readonly startDate: string | null;
  readonly estimatedDurationDays: number | null;
  readonly progressPercent: number;
  readonly status: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreatePhaseInput {
  readonly createdBy: string;
  readonly organizationId: string;
  readonly siteId: string;
  readonly name: string;
  readonly description: string | null;
  readonly startDate: string | null;
  readonly estimatedDurationDays: number | null;
}

export interface PhasesRepositoryPort {
  siteExistsInOrganization(siteId: string, organizationId: string): Promise<boolean>;
  userCanManageSitePhases(
    siteId: string,
    userId: string,
    roleCodes: readonly string[],
  ): Promise<boolean>;
  createPhase(input: CreatePhaseInput): Promise<PhaseDetails>;
}

export const phaseCreatedAuditAction = "phase.created";

export const phaseManagementRoleCodes = ["chef_chantier", "administrateur"] as const;
