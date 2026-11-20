"use client";

import { CalendarDays, ClipboardList, Loader2, RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { OrganizationFormStatusMessage } from "@/components/organization/organization-form-status-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WorkerAssignedTaskResponseDto } from "@/generated/api";
import type { LoadWorkerAssignedTasksResult } from "@/lib/resource-assignments";

export type WorkerAssignedTasksLoader = (siteId: string) => Promise<LoadWorkerAssignedTasksResult>;

interface WorkerAssignedTasksSectionProps {
  readonly loadWorkerAssignedTasks: WorkerAssignedTasksLoader;
  readonly siteId: string;
}

export function WorkerAssignedTasksSection({
  loadWorkerAssignedTasks,
  siteId,
}: WorkerAssignedTasksSectionProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<readonly WorkerAssignedTaskResponseDto[]>([]);

  const loadTasks = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setLoadError(null);

    const result = await loadWorkerAssignedTasks(siteId);

    if (!result.ok) {
      setLoadError(result.message);
      setIsLoading(false);
      return;
    }

    setTasks(result.tasks);
    setIsLoading(false);
  }, [loadWorkerAssignedTasks, siteId]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Badge tone="success">Ouvrier</Badge>
          <CardTitle className="mt-3 flex items-center gap-2">
            <ClipboardList aria-hidden="true" className="h-5 w-5 text-primary" />
            Mes tâches chantier
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <WorkerTaskList
          isLoading={isLoading}
          loadError={loadError}
          onRetry={() => void loadTasks()}
          tasks={tasks}
        />
      </CardContent>
    </Card>
  );
}

interface WorkerTaskListProps {
  readonly isLoading: boolean;
  readonly loadError: string | null;
  readonly onRetry: () => void;
  readonly tasks: readonly WorkerAssignedTaskResponseDto[];
}

function WorkerTaskList({ isLoading, loadError, onRetry, tasks }: WorkerTaskListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 py-6 text-muted-foreground">
        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        <span>Chargement des tâches...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-3">
        <OrganizationFormStatusMessage message={loadError} tone="error" />
        <Button className="w-full sm:w-auto" type="button" variant="secondary" onClick={onRetry}>
          <RefreshCcw aria-hidden="true" className="h-4 w-4" />
          Réessayer
        </Button>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Aucune tâche associée à vos phases.
      </p>
    );
  }

  return (
    <ul aria-label="Liste de mes tâches chantier" className="divide-y divide-border">
      {tasks.map((task) => (
        <WorkerTaskItem key={task.id} task={task} />
      ))}
    </ul>
  );
}

interface WorkerTaskItemProps {
  readonly task: WorkerAssignedTaskResponseDto;
}

function WorkerTaskItem({ task }: WorkerTaskItemProps) {
  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="break-words text-sm font-semibold">{task.title}</p>
        <p className="break-words text-sm text-muted-foreground">{task.phaseName}</p>
        {task.description ? (
          <p className="break-words text-sm text-muted-foreground">{task.description}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge tone="muted">{formatTaskStatus(task.status)}</Badge>
        <span className="flex items-center gap-2">
          <CalendarDays aria-hidden="true" className="h-4 w-4 text-primary" />
          {formatDueDate(task.dueDate ?? null)}
        </span>
      </div>
    </li>
  );
}

function formatTaskStatus(status: string): string {
  if (status === "todo") {
    return "À faire";
  }

  if (status === "in_progress") {
    return "En cours";
  }

  if (status === "done") {
    return "Terminée";
  }

  return status;
}

function formatDueDate(dueDate: string | null): string {
  if (dueDate === null) {
    return "Échéance non renseignée";
  }

  return new Date(`${dueDate}T00:00:00`).toLocaleDateString("fr-FR");
}
