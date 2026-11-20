import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  AssignableWorkersResponseDto,
  AssignPhaseWorkersRequestDto,
  PhaseWorkerAssignmentsResponseDto,
  ResourceAssignmentsControllerAssignWorkersToPhaseError,
  ResourceAssignmentsControllerListAssignableWorkersError,
  ResourceAssignmentsControllerListMyAssignedTasksError,
  ResourceAssignmentsControllerListPhaseWorkerAssignmentsError,
  WorkerAssignedTasksResponseDto,
} from "@/generated/api";
import {
  assignPhaseWorkers,
  loadAssignableWorkers,
  loadMyAssignedTasks,
  loadPhaseWorkerAssignments,
} from "@/lib/resource-assignments";

interface ListAssignableWorkersApiOptions {
  readonly auth: string;
  readonly baseUrl: string;
  readonly path: { readonly siteId: string };
}

type ListAssignableWorkersApiResult =
  | {
      readonly data: AssignableWorkersResponseDto;
      readonly error: undefined;
      readonly response: { readonly status: 200 };
    }
  | {
      readonly data: undefined;
      readonly error: ResourceAssignmentsControllerListAssignableWorkersError;
      readonly response?: { readonly status: number };
    };

interface AssignWorkersApiOptions {
  readonly auth: string;
  readonly baseUrl: string;
  readonly body: AssignPhaseWorkersRequestDto;
  readonly path: { readonly phaseId: string; readonly siteId: string };
}

type AssignWorkersApiResult =
  | {
      readonly data: PhaseWorkerAssignmentsResponseDto;
      readonly error: undefined;
      readonly response: { readonly status: 201 };
    }
  | {
      readonly data: undefined;
      readonly error: ResourceAssignmentsControllerAssignWorkersToPhaseError;
      readonly response?: { readonly status: number };
    };

interface ListMyAssignedTasksApiOptions {
  readonly auth: string;
  readonly baseUrl: string;
  readonly path: { readonly siteId: string };
}

type ListMyAssignedTasksApiResult =
  | {
      readonly data: WorkerAssignedTasksResponseDto;
      readonly error: undefined;
      readonly response: { readonly status: 200 };
    }
  | {
      readonly data: undefined;
      readonly error: ResourceAssignmentsControllerListMyAssignedTasksError;
      readonly response?: { readonly status: number };
    };

interface ListPhaseWorkerAssignmentsApiOptions {
  readonly auth: string;
  readonly baseUrl: string;
  readonly path: { readonly phaseId: string; readonly siteId: string };
}

type ListPhaseWorkerAssignmentsApiResult =
  | {
      readonly data: PhaseWorkerAssignmentsResponseDto;
      readonly error: undefined;
      readonly response: { readonly status: 200 };
    }
  | {
      readonly data: undefined;
      readonly error: ResourceAssignmentsControllerListPhaseWorkerAssignmentsError;
      readonly response?: { readonly status: number };
    };

const resourceAssignmentsApiMock = vi.hoisted(() => ({
  resourceAssignmentsControllerAssignWorkersToPhase:
    vi.fn<(options: AssignWorkersApiOptions) => Promise<AssignWorkersApiResult>>(),
  resourceAssignmentsControllerListAssignableWorkers:
    vi.fn<(options: ListAssignableWorkersApiOptions) => Promise<ListAssignableWorkersApiResult>>(),
  resourceAssignmentsControllerListMyAssignedTasks:
    vi.fn<(options: ListMyAssignedTasksApiOptions) => Promise<ListMyAssignedTasksApiResult>>(),
  resourceAssignmentsControllerListPhaseWorkerAssignments:
    vi.fn<
      (
        options: ListPhaseWorkerAssignmentsApiOptions,
      ) => Promise<ListPhaseWorkerAssignmentsApiResult>
    >(),
}));

vi.mock("@/generated/api", () => ({
  resourceAssignmentsControllerAssignWorkersToPhase:
    resourceAssignmentsApiMock.resourceAssignmentsControllerAssignWorkersToPhase,
  resourceAssignmentsControllerListAssignableWorkers:
    resourceAssignmentsApiMock.resourceAssignmentsControllerListAssignableWorkers,
  resourceAssignmentsControllerListMyAssignedTasks:
    resourceAssignmentsApiMock.resourceAssignmentsControllerListMyAssignedTasks,
  resourceAssignmentsControllerListPhaseWorkerAssignments:
    resourceAssignmentsApiMock.resourceAssignmentsControllerListPhaseWorkerAssignments,
}));

const assignableWorkersResponse: AssignableWorkersResponseDto = {
  siteId: "site-id",
  workers: [
    {
      firstName: "Armand",
      lastName: "Braud",
      workerUserId: "worker-id",
    },
  ],
};

const assignmentsResponse: PhaseWorkerAssignmentsResponseDto = {
  assignments: [
    {
      assignedAt: "2026-07-02T10:00:00.000Z",
      phaseId: "phase-id",
      siteId: "site-id",
      workerFirstName: "Armand",
      workerLastName: "Braud",
      workerUserId: "worker-id",
    },
  ],
  phaseId: "phase-id",
  siteId: "site-id",
};

beforeEach(() => {
  resourceAssignmentsApiMock.resourceAssignmentsControllerAssignWorkersToPhase.mockReset();
  resourceAssignmentsApiMock.resourceAssignmentsControllerListAssignableWorkers.mockReset();
  resourceAssignmentsApiMock.resourceAssignmentsControllerListMyAssignedTasks.mockReset();
  resourceAssignmentsApiMock.resourceAssignmentsControllerListPhaseWorkerAssignments.mockReset();
});

describe("loadAssignableWorkers", () => {
  it("charge les ouvriers assignables depuis le client genere", async () => {
    resourceAssignmentsApiMock.resourceAssignmentsControllerListAssignableWorkers.mockResolvedValue(
      {
        data: assignableWorkersResponse,
        error: undefined,
        response: { status: 200 },
      },
    );

    const result = await loadAssignableWorkers("access-token", "site-id");

    expect(
      resourceAssignmentsApiMock.resourceAssignmentsControllerListAssignableWorkers,
    ).toHaveBeenCalledWith({
      auth: "access-token",
      baseUrl: "http://localhost:4000",
      path: { siteId: "site-id" },
    });
    expect(result).toStrictEqual({
      ok: true,
      siteId: "site-id",
      workers: assignableWorkersResponse.workers,
    });
  });
});

describe("assignPhaseWorkers", () => {
  it("assigne les ouvriers selectionnes", async () => {
    resourceAssignmentsApiMock.resourceAssignmentsControllerAssignWorkersToPhase.mockResolvedValue({
      data: assignmentsResponse,
      error: undefined,
      response: { status: 201 },
    });

    const result = await assignPhaseWorkers("access-token", "site-id", "phase-id", ["worker-id"]);

    expect(
      resourceAssignmentsApiMock.resourceAssignmentsControllerAssignWorkersToPhase,
    ).toHaveBeenCalledWith({
      auth: "access-token",
      baseUrl: "http://localhost:4000",
      body: { workerUserIds: ["worker-id"] },
      path: { phaseId: "phase-id", siteId: "site-id" },
    });
    expect(result).toStrictEqual({
      assignments: assignmentsResponse.assignments,
      ok: true,
      phaseId: "phase-id",
      siteId: "site-id",
    });
  });

  it("retourne les erreurs de validation de l'API", async () => {
    resourceAssignmentsApiMock.resourceAssignmentsControllerAssignWorkersToPhase.mockResolvedValue({
      data: undefined,
      error: {
        message: ["Au moins un ouvrier doit être sélectionné."],
        statusCode: 400,
      },
      response: { status: 400 },
    });

    const result = await assignPhaseWorkers("access-token", "site-id", "phase-id", []);

    expect(result).toStrictEqual({
      message: "Au moins un ouvrier doit être sélectionné.",
      ok: false,
    });
  });
});

describe("loadPhaseWorkerAssignments", () => {
  it("charge les ouvriers deja assignes a une phase", async () => {
    resourceAssignmentsApiMock.resourceAssignmentsControllerListPhaseWorkerAssignments.mockResolvedValue(
      {
        data: assignmentsResponse,
        error: undefined,
        response: { status: 200 },
      },
    );

    const result = await loadPhaseWorkerAssignments("access-token", "site-id", "phase-id");

    expect(
      resourceAssignmentsApiMock.resourceAssignmentsControllerListPhaseWorkerAssignments,
    ).toHaveBeenCalledWith({
      auth: "access-token",
      baseUrl: "http://localhost:4000",
      path: { phaseId: "phase-id", siteId: "site-id" },
    });
    expect(result).toStrictEqual({
      assignments: assignmentsResponse.assignments,
      ok: true,
      phaseId: "phase-id",
      siteId: "site-id",
    });
  });
});

describe("loadMyAssignedTasks", () => {
  it("retourne un message sur pour les taches interdites", async () => {
    resourceAssignmentsApiMock.resourceAssignmentsControllerListMyAssignedTasks.mockResolvedValue({
      data: undefined,
      error: { message: ["Accès interdit."], statusCode: 403 },
      response: { status: 403 },
    });

    const result = await loadMyAssignedTasks("access-token", "site-id");

    expect(result).toStrictEqual({
      message: "Vous n'avez pas accès aux tâches de ce chantier.",
      ok: false,
    });
  });
});
