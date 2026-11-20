import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { WorkerAssignedTaskResponseDto } from "@/generated/api";

import {
  WorkerAssignedTasksSection,
  type WorkerAssignedTasksLoader,
} from "./worker-assigned-tasks-section";

const task: WorkerAssignedTaskResponseDto = {
  description: "Implantation et coffrage",
  dueDate: "2026-07-10",
  id: "task-id",
  phaseId: "phase-id",
  phaseName: "Gros œuvre",
  siteId: "site-id",
  status: "todo",
  title: "Préparer les fondations",
};

describe("WorkerAssignedTasksSection", () => {
  it("affiche le chargement des taches", () => {
    const pendingLoader: WorkerAssignedTasksLoader = () => new Promise<never>(() => undefined);

    renderSection(pendingLoader);

    expect(screen.getByText("Chargement des tâches...")).toBeInTheDocument();
  });

  it("affiche l'etat vide", async () => {
    renderSection(createTasksLoader([]));

    expect(await screen.findByText("Aucune tâche associée à vos phases.")).toBeInTheDocument();
  });

  it("affiche les taches associees a l'ouvrier", async () => {
    renderSection(createTasksLoader([task]));

    expect(await screen.findByText("Préparer les fondations")).toBeInTheDocument();
    expect(screen.getByText("Gros œuvre")).toBeInTheDocument();
    expect(screen.getByText("Implantation et coffrage")).toBeInTheDocument();
    expect(screen.getByText("10/07/2026")).toBeInTheDocument();
  });

  it("affiche l'erreur de chargement", async () => {
    const failingLoader: WorkerAssignedTasksLoader = () =>
      Promise.resolve({ message: "Vous n'avez pas accès aux tâches de ce chantier.", ok: false });

    renderSection(failingLoader);

    expect(
      await screen.findByText("Vous n'avez pas accès aux tâches de ce chantier."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeInTheDocument();
  });
});

function renderSection(loadWorkerAssignedTasks: WorkerAssignedTasksLoader): void {
  render(
    <WorkerAssignedTasksSection
      loadWorkerAssignedTasks={loadWorkerAssignedTasks}
      siteId="site-id"
    />,
  );
}

function createTasksLoader(
  tasks: readonly WorkerAssignedTaskResponseDto[],
): WorkerAssignedTasksLoader {
  return () => Promise.resolve({ ok: true, siteId: "site-id", tasks, workerUserId: "worker-id" });
}
