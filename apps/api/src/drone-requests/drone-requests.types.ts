export type DroneRequestStatus = "pending" | "accepted" | "rejected" | "cancelled" | "completed";

export interface DroneRequestDetails {
  readonly id: string;
  readonly siteId: string;
  readonly missionDescription: string | null;
  readonly requestedDate: string | null;
  readonly status: DroneRequestStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateDroneRequestInput {
  readonly siteId: string;
  readonly organizationId: string;
  readonly requestedBy: string;
  readonly missionDescription: string | null;
  readonly requestedDate: string | null;
}

export interface DroneRequestsRepositoryPort {
  siteExistsInOrganization(siteId: string, organizationId: string): Promise<boolean>;
  userCanManageSiteDroneRequests(
    siteId: string,
    userId: string,
    roleCodes: readonly string[],
  ): Promise<boolean>;
  createDroneRequest(input: CreateDroneRequestInput): Promise<DroneRequestDetails>;
  listDroneRequestsBySite(siteId: string): Promise<readonly DroneRequestDetails[]>;
}

export const droneRequestCreatedAuditAction = "drone_request.created";

export const droneRequestManagementRoleCodes = ["chef_chantier", "administrateur"] as const;
