export type PartnerType = "architect" | "drone";

export interface PartnerRequestDetails {
  readonly id: string;
  readonly partnerType: PartnerType;
  readonly siteId: string;
  readonly siteName: string;
  readonly missionDescription: string | null;
  readonly requestedDate: string | null;
  readonly status: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ListPartnerRequestsFilters {
  readonly organizationId: string;
  readonly userId: string;
  readonly roleCodes: readonly string[];
  readonly partnerType: PartnerType | null;
  readonly siteId: string | null;
  readonly limit: number;
  readonly offset: number;
}

export interface ListPartnerRequestsResult {
  readonly items: readonly PartnerRequestDetails[];
  readonly total: number;
}

export interface PartnerRequestsRepositoryPort {
  siteExistsInOrganization(siteId: string, organizationId: string): Promise<boolean>;
  userCanAccessSite(siteId: string, userId: string, roleCodes: readonly string[]): Promise<boolean>;
  listPartnerRequests(filters: ListPartnerRequestsFilters): Promise<ListPartnerRequestsResult>;
}

export const partnerRequestManagementRoleCodes = ["chef_chantier", "administrateur"] as const;

export const partnerRequestsDefaultPageSize = 20;
export const partnerRequestsMaxPageSize = 100;
