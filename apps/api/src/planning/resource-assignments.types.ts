export interface PhaseWorkerAssignmentDetails {
  readonly assignedAt: string;
  readonly phaseId: string;
  readonly siteId: string;
  readonly workerFirstName: string;
  readonly workerLastName: string;
  readonly workerUserId: string;
}

export interface AssignableWorkerDetails {
  readonly firstName: string;
  readonly lastName: string;
  readonly workerUserId: string;
}

export interface WorkerAssignedTaskDetails {
  readonly description: string | null;
  readonly dueDate: string | null;
  readonly id: string;
  readonly phaseId: string;
  readonly phaseName: string;
  readonly siteId: string;
  readonly status: string;
  readonly title: string;
}

export interface AssignPhaseWorkersInput {
  readonly assignedBy: string;
  readonly organizationId: string;
  readonly phaseId: string;
  readonly siteId: string;
  readonly workerUserIds: readonly string[];
}

export interface ResourceAssignmentsRepositoryPort {
  siteExistsInOrganization(siteId: string, organizationId: string): Promise<boolean>;
  phaseExistsInSite(siteId: string, phaseId: string): Promise<boolean>;
  userHasSiteRole(siteId: string, userId: string, roleCodes: readonly string[]): Promise<boolean>;
  findAssignableWorkerIds(
    siteId: string,
    organizationId: string,
    workerUserIds: readonly string[],
  ): Promise<readonly string[]>;
  listAssignableWorkers(
    siteId: string,
    organizationId: string,
  ): Promise<readonly AssignableWorkerDetails[]>;
  assignWorkersToPhase(
    input: AssignPhaseWorkersInput,
  ): Promise<readonly PhaseWorkerAssignmentDetails[]>;
  listPhaseWorkerAssignments(
    siteId: string,
    phaseId: string,
  ): Promise<readonly PhaseWorkerAssignmentDetails[]>;
  listWorkerAssignedTasks(
    siteId: string,
    workerUserId: string,
  ): Promise<readonly WorkerAssignedTaskDetails[]>;
}

export const resourceAssignmentManagementRoleCodes = ["chef_chantier", "administrateur"] as const;

export const resourceAssignmentWorkerRoleCodes = ["ouvrier"] as const;

export const phaseWorkersAssignedAuditAction = "phase.workers_assigned";
