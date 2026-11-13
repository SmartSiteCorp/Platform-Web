export type ArchitectRequestStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "cancelled"
  | "completed";

export interface ArchitectRequestDetails {
  readonly id: string;
  readonly siteId: string;
  readonly missionDescription: string | null;
  readonly requestedDate: string | null;
  readonly status: ArchitectRequestStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateArchitectRequestInput {
  readonly siteId: string;
  readonly organizationId: string;
  readonly requestedBy: string;
  readonly missionDescription: string | null;
  readonly requestedDate: string | null;
}

export interface ArchitectRequestsRepositoryPort {
  siteExistsInOrganization(siteId: string, organizationId: string): Promise<boolean>;
  userCanManageSiteArchitectRequests(
    siteId: string,
    userId: string,
    roleCodes: readonly string[],
  ): Promise<boolean>;
  createArchitectRequest(input: CreateArchitectRequestInput): Promise<ArchitectRequestDetails>;
  listArchitectRequestsBySite(siteId: string): Promise<readonly ArchitectRequestDetails[]>;
}

export const architectRequestCreatedAuditAction = "architect_request.created";

export const architectRequestManagementRoleCodes = ["chef_chantier", "administrateur"] as const;
