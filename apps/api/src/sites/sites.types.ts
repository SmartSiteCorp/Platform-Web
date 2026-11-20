export interface SiteDetails {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly address: string | null;
  readonly startDate: string | null;
  readonly estimatedDurationDays: number | null;
  readonly status: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateSiteInput {
  readonly organizationId: string;
  readonly name: string;
  readonly address: string | null;
  readonly startDate: string | null;
  readonly estimatedDurationDays: number | null;
  readonly createdBy: string;
}

export interface SitesRepositoryPort {
  createSite(input: CreateSiteInput): Promise<SiteDetails>;
}

export const siteCreatedAuditAction = "site.created";

export const siteManagementRoleCodes = ["chef_chantier", "administrateur"] as const;
