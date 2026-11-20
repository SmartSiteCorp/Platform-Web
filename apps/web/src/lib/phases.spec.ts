import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  CreatePhaseRequestDto,
  PhaseResponseDto,
  PhasesControllerCreatePhaseError,
  PhasesControllerUpdatePhaseError,
  UpdatePhaseRequestDto,
} from "@/generated/api";
import { createPhase, updatePhase } from "@/lib/phases";

interface CreatePhaseApiOptions {
  readonly auth: string;
  readonly baseUrl: string;
  readonly body: CreatePhaseRequestDto;
  readonly path: { readonly siteId: string };
}

type CreatePhaseApiResult =
  | {
      readonly data: PhaseResponseDto;
      readonly error: undefined;
      readonly response: { readonly status: 201 };
    }
  | {
      readonly data: undefined;
      readonly error: PhasesControllerCreatePhaseError;
      readonly response?: { readonly status: number };
    };

interface UpdatePhaseApiOptions {
  readonly auth: string;
  readonly baseUrl: string;
  readonly body: UpdatePhaseRequestDto;
  readonly path: { readonly phaseId: string; readonly siteId: string };
}

type UpdatePhaseApiResult =
  | {
      readonly data: PhaseResponseDto;
      readonly error: undefined;
      readonly response: { readonly status: 200 };
    }
  | {
      readonly data: undefined;
      readonly error: PhasesControllerUpdatePhaseError;
      readonly response?: { readonly status: number };
    };

const phasesApiMock = vi.hoisted(() => ({
  phasesControllerCreatePhase:
    vi.fn<(options: CreatePhaseApiOptions) => Promise<CreatePhaseApiResult>>(),
  phasesControllerUpdatePhase:
    vi.fn<(options: UpdatePhaseApiOptions) => Promise<UpdatePhaseApiResult>>(),
}));

vi.mock("@/generated/api", () => ({
  phasesControllerCreatePhase: phasesApiMock.phasesControllerCreatePhase,
  phasesControllerUpdatePhase: phasesApiMock.phasesControllerUpdatePhase,
}));

const phaseRequest: CreatePhaseRequestDto = {
  description: "Fondations et structure principale",
  estimatedDurationDays: 30,
  name: "Gros œuvre",
  startDate: "2026-07-01",
};

const createdPhase: PhaseResponseDto = {
  createdAt: "2026-06-24T10:00:00.000Z",
  description: phaseRequest.description ?? null,
  estimatedDurationDays: phaseRequest.estimatedDurationDays ?? null,
  id: "phase-id",
  name: phaseRequest.name,
  position: 1,
  progressPercent: 0,
  siteId: "site-id",
  startDate: phaseRequest.startDate ?? null,
  status: "planned",
  updatedAt: "2026-06-24T10:00:00.000Z",
};

const updatePhaseRequest: UpdatePhaseRequestDto = {
  description: "Cloisons et réseaux",
  estimatedDurationDays: 18,
  name: "Second œuvre ajusté",
  startDate: "2026-08-05",
};

const updatedPhase: PhaseResponseDto = {
  ...createdPhase,
  description: updatePhaseRequest.description ?? null,
  estimatedDurationDays: updatePhaseRequest.estimatedDurationDays ?? null,
  name: updatePhaseRequest.name ?? createdPhase.name,
  startDate: updatePhaseRequest.startDate ?? null,
  updatedAt: "2026-06-24T11:00:00.000Z",
};

describe("createPhase", () => {
  beforeEach(() => {
    phasesApiMock.phasesControllerCreatePhase.mockReset();
  });

  it("appelle le client genere et retourne la phase", async () => {
    phasesApiMock.phasesControllerCreatePhase.mockResolvedValue({
      data: createdPhase,
      error: undefined,
      response: { status: 201 },
    });

    const result = await createPhase("access-token", "site-id", phaseRequest);

    expect(phasesApiMock.phasesControllerCreatePhase).toHaveBeenCalledWith({
      auth: "access-token",
      baseUrl: "http://localhost:4000",
      body: phaseRequest,
      path: { siteId: "site-id" },
    });
    expect(result).toStrictEqual({ ok: true, phase: createdPhase });
  });

  it("retourne un message de session expiree", async () => {
    phasesApiMock.phasesControllerCreatePhase.mockResolvedValue({
      data: undefined,
      error: { message: ["Token JWT manquant ou invalide."], statusCode: 401 },
      response: { status: 401 },
    });

    const result = await createPhase("access-token", "site-id", phaseRequest);

    expect(result).toStrictEqual({
      message: "Votre session a expiré. Connectez-vous à nouveau.",
      ok: false,
      sessionExpired: true,
    });
  });

  it("retourne un message de role insuffisant", async () => {
    phasesApiMock.phasesControllerCreatePhase.mockResolvedValue({
      data: undefined,
      error: { message: ["Rôle Chef de chantier ou Administrateur requis."], statusCode: 403 },
      response: { status: 403 },
    });

    const result = await createPhase("access-token", "site-id", phaseRequest);

    expect(result).toStrictEqual({
      message: "Vous n'avez pas le rôle requis pour créer une phase.",
      ok: false,
    });
  });

  it("retourne un message reseau quand l'API est indisponible", async () => {
    phasesApiMock.phasesControllerCreatePhase.mockResolvedValue({
      data: undefined,
      error: { message: [], statusCode: 500 },
    });

    const result = await createPhase("access-token", "site-id", phaseRequest);

    expect(result).toStrictEqual({ message: "Impossible de joindre l'API SmartSite.", ok: false });
  });
});

describe("updatePhase", () => {
  beforeEach(() => {
    phasesApiMock.phasesControllerUpdatePhase.mockReset();
  });

  it("appelle le client genere et retourne la phase modifiee", async () => {
    phasesApiMock.phasesControllerUpdatePhase.mockResolvedValue({
      data: updatedPhase,
      error: undefined,
      response: { status: 200 },
    });

    const result = await updatePhase("access-token", "site-id", "phase-id", updatePhaseRequest);

    expect(phasesApiMock.phasesControllerUpdatePhase).toHaveBeenCalledWith({
      auth: "access-token",
      baseUrl: "http://localhost:4000",
      body: updatePhaseRequest,
      path: { phaseId: "phase-id", siteId: "site-id" },
    });
    expect(result).toStrictEqual({ ok: true, phase: updatedPhase });
  });

  it("retourne un message de role insuffisant pour la modification", async () => {
    phasesApiMock.phasesControllerUpdatePhase.mockResolvedValue({
      data: undefined,
      error: { message: ["Accès chantier interdit."], statusCode: 403 },
      response: { status: 403 },
    });

    const result = await updatePhase("access-token", "site-id", "phase-id", updatePhaseRequest);

    expect(result).toStrictEqual({
      message: "Vous n'avez pas le rôle requis pour modifier une phase.",
      ok: false,
    });
  });
});
