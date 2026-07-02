"use client";

import { SitePhasesSection } from "@/components/sites/site-phases-section";

import type { SitePageServices } from "./site-page-services";
import { WorkerAssignedTasksSection } from "./worker-assigned-tasks-section";

interface WorkerTasksBlockProps {
  readonly canViewWorkerTasks: boolean;
  readonly services: SitePageServices;
  readonly siteId: string;
}

export function WorkerTasksBlock({ canViewWorkerTasks, services, siteId }: WorkerTasksBlockProps) {
  if (!canViewWorkerTasks) {
    return null;
  }

  return (
    <WorkerAssignedTasksSection
      loadWorkerAssignedTasks={services.workerTasksLoader}
      siteId={siteId}
    />
  );
}

interface PlanningBlockProps {
  readonly canManagePlanning: boolean;
  readonly services: SitePageServices;
}

export function PlanningBlock({ canManagePlanning, services }: PlanningBlockProps) {
  if (!canManagePlanning) {
    return null;
  }

  return (
    <SitePhasesSection
      loadAssignableWorkers={services.assignableWorkersLoader}
      loadPhaseWorkerAssignments={services.phaseAssignmentsLoader}
      submitAssignWorkers={services.assignWorkersSubmitter}
      submitCreatePhase={services.phaseSubmitter}
      submitUpdatePhase={services.phaseUpdateSubmitter}
    />
  );
}
