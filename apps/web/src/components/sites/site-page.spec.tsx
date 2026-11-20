import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  DocumentResponseDto,
  RegisterResponseDto,
  WorkerAssignedTaskResponseDto,
} from "@/generated/api";
import { createTestAccessToken } from "@/test/create-test-access-token";
import type { ListDocumentsResult } from "@/lib/documents";
import { SitePage } from "./site-page";
import type { UploadDocumentSubmitter } from "./upload-document-form";
import type { DocumentDownloader, ListDocumentsLoader } from "./site-documents-section";
import type { WorkerAssignedTasksLoader } from "./worker-assigned-tasks-section";

vi.mock("@/lib/project-users", () => ({
  listProjectUsers: () => Promise.resolve({ ok: true, data: [] }),
}));

const routerMock = vi.hoisted(() => ({
  push: vi.fn<(url: string) => void>(),
  replace: vi.fn<(url: string) => void>(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

const sessionMock = vi.hoisted(() => ({
  isCheckingSession: false,
  session: null as RegisterResponseDto | null,
}));

vi.mock("@/lib/use-auth-session", () => ({
  useRequiredAuthSession: () => sessionMock,
}));

const registeredAccount: RegisterResponseDto = {
  accessToken: createTestAccessToken(Math.floor(Date.now() / 1000) + 3600),
  organization: {
    createdAt: "2026-06-01T10:00:00.000Z",
    email: "andreea@smartsite.fr",
    id: "org-id",
    name: "Stern Tech",
  },
  tokenType: "Bearer",
  user: {
    createdAt: "2026-06-01T10:00:00.000Z",
    email: "andreea@smartsite.fr",
    firstName: "Andreea",
    id: "user-id",
    lastName: "Rauta",
    organizationId: "org-id",
    phone: null,
    roles: ["chef_chantier"],
    status: "active",
  },
};

const testDocument: DocumentResponseDto = {
  createdAt: "2026-06-24T10:00:00.000Z",
  documentType: "plan",
  file: {
    createdAt: "2026-06-24T10:00:00.000Z",
    id: "file-id",
    mimeType: "application/pdf",
    originalName: "plan-masse.pdf",
    sizeBytes: 51200,
  },
  fileId: "file-id",
  id: "doc-id",
  siteId: "site-id",
  title: "Plan de masse",
};

const workerTask: WorkerAssignedTaskResponseDto = {
  description: null,
  dueDate: "2026-07-10",
  id: "task-id",
  phaseId: "phase-id",
  phaseName: "Gros œuvre",
  siteId: "site-id",
  status: "todo",
  title: "Préparer les fondations",
};

const SITE_ID = "site-id";

describe("SitePage - session", () => {
  beforeEach(() => {
    routerMock.push.mockClear();
    routerMock.replace.mockClear();
    sessionMock.isCheckingSession = false;
    sessionMock.session = registeredAccount;
  });

  it("affiche le spinner pendant la vérification de session", () => {
    sessionMock.isCheckingSession = true;
    sessionMock.session = null;

    renderPage(createEmptyListLoader(), createSuccessUploader());

    expect(screen.getByText("Vérification de la session...")).toBeInTheDocument();
    expect(
      screen.queryByRole("form", { name: "Formulaire upload document" }),
    ).not.toBeInTheDocument();
  });

  it("affiche le titre Fiche chantier une fois la session vérifiée", async () => {
    renderPage(createEmptyListLoader(), createSuccessUploader());

    expect(await screen.findByRole("heading", { name: "Fiche chantier" })).toBeInTheDocument();
    expect(screen.getByText("Intervenants")).toBeInTheDocument();
  });

  it("affiche les taches assignees pour un ouvrier", async () => {
    sessionMock.session = {
      ...registeredAccount,
      user: { ...registeredAccount.user, roles: ["ouvrier"] },
    };

    renderPage(
      createEmptyListLoader(),
      createSuccessUploader(),
      createNoOpDownloader(),
      createWorkerTasksLoader([workerTask]),
    );

    expect(await screen.findByRole("heading", { name: "Mes tâches chantier" })).toBeInTheDocument();
    expect(screen.getByText("Préparer les fondations")).toBeInTheDocument();
    expect(
      screen.queryByRole("form", { name: "Formulaire création phase" }),
    ).not.toBeInTheDocument();
  });
});

describe("SitePage - formulaire upload", () => {
  beforeEach(() => {
    sessionMock.isCheckingSession = false;
    sessionMock.session = registeredAccount;
  });

  it("affiche le formulaire upload avec les champs titre, type et fichier", async () => {
    renderPage(createEmptyListLoader(), createSuccessUploader());

    expect(
      await screen.findByRole("form", { name: "Formulaire upload document" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Titre du document")).toBeInTheDocument();
    expect(screen.getByLabelText("Type de document")).toBeInTheDocument();
    expect(screen.getByLabelText("Fichier")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ajouter le document" })).toBeInTheDocument();
  });

  it("bloque la soumission si le titre est vide", async () => {
    renderPage(createEmptyListLoader(), createSuccessUploader());

    await screen.findByRole("form", { name: "Formulaire upload document" });
    selectTestFile();
    fireEvent.click(screen.getByRole("button", { name: "Ajouter le document" }));

    expect(await screen.findByText("Le titre est obligatoire.")).toBeInTheDocument();
  });

  it("affiche une erreur si le fichier a un format non autorisé", async () => {
    renderPage(createEmptyListLoader(), createSuccessUploader());

    await screen.findByRole("form", { name: "Formulaire upload document" });
    selectInvalidFile();

    expect(
      await screen.findByText("Format non autorisé. Utilisez PDF, image ou document bureautique."),
    ).toBeInTheDocument();
  });

  it("affiche une erreur si le fichier dépasse 50 Mo", async () => {
    renderPage(createEmptyListLoader(), createSuccessUploader());

    await screen.findByRole("form", { name: "Formulaire upload document" });
    selectLargeFile();

    expect(
      await screen.findByText("Le fichier dépasse la taille maximale autorisée (50 Mo)."),
    ).toBeInTheDocument();
  });

  it("affiche le message de succès après upload réussi", async () => {
    renderPage(createEmptyListLoader(), createSuccessUploader());

    await fillAndSubmitUploadForm();

    expect(
      await screen.findByText(`"${testDocument.title}" a été ajouté avec succès.`),
    ).toBeInTheDocument();
  });

  it("affiche l'erreur API si l'upload échoue", async () => {
    const failingUploader: UploadDocumentSubmitter = () =>
      Promise.resolve({ message: "Vous n'avez pas le rôle requis.", ok: false });

    renderPage(createEmptyListLoader(), failingUploader);

    await fillAndSubmitUploadForm();

    expect(await screen.findByText("Vous n'avez pas le rôle requis.")).toBeInTheDocument();
  });
});

describe("SitePage - liste des documents", () => {
  beforeEach(() => {
    sessionMock.isCheckingSession = false;
    sessionMock.session = registeredAccount;
  });

  it("affiche le message de liste vide si aucun document", async () => {
    renderPage(createEmptyListLoader(), createSuccessUploader());

    expect(await screen.findByText("Aucun document associé à ce chantier.")).toBeInTheDocument();
  });

  it("affiche les documents chargés depuis l'API", async () => {
    renderPage(createListLoaderWithDocuments([testDocument]), createSuccessUploader());

    expect(await screen.findByText("Plan de masse")).toBeInTheDocument();
    expect(screen.getByText("plan-masse.pdf · 50 Ko")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Liste des documents" })).toBeInTheDocument();
  });

  it("affiche l'erreur de chargement si l'API échoue", async () => {
    const failingLoader: ListDocumentsLoader = () =>
      Promise.resolve({ message: "Le chantier est introuvable.", ok: false });

    renderPage(failingLoader, createSuccessUploader());

    expect(await screen.findByText("Le chantier est introuvable.")).toBeInTheDocument();
  });

  it("ajoute le document en tête de liste après upload réussi", async () => {
    renderPage(createEmptyListLoader(), createSuccessUploader());

    await screen.findByText("Aucun document associé à ce chantier.");
    await fillAndSubmitUploadForm();

    await waitFor(() => {
      expect(screen.getByText("Plan de masse")).toBeInTheDocument();
    });
    expect(screen.queryByText("Aucun document associé à ce chantier.")).not.toBeInTheDocument();
  });
});

describe("SitePage - responsive", () => {
  beforeEach(() => {
    sessionMock.isCheckingSession = false;
    sessionMock.session = registeredAccount;
  });

  it.each([
    ["mobile (390px)", 390],
    ["tablette (768px)", 768],
  ])("affiche le formulaire en %s", async (_label, width) => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: width });

    renderPage(createEmptyListLoader(), createSuccessUploader());

    expect(
      await screen.findByRole("form", { name: "Formulaire upload document" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Titre du document")).toBeInTheDocument();
  });
});

function createNoOpDownloader(): DocumentDownloader {
  return () => Promise.resolve({ ok: true });
}

function renderPage(
  listDocumentsLoader: ListDocumentsLoader,
  submitUpload: UploadDocumentSubmitter,
  downloadDocumentLoader: DocumentDownloader = createNoOpDownloader(),
  loadWorkerAssignedTasksLoader: WorkerAssignedTasksLoader = createWorkerTasksLoader([]),
): void {
  render(
    <SitePage
      downloadDocumentLoader={downloadDocumentLoader}
      loadWorkerAssignedTasksLoader={loadWorkerAssignedTasksLoader}
      listDocumentsLoader={listDocumentsLoader}
      siteId={SITE_ID}
      submitUpload={submitUpload}
    />,
  );
}

function createEmptyListLoader(): ListDocumentsLoader {
  return () => Promise.resolve({ documents: [], ok: true });
}

function createListLoaderWithDocuments(
  documents: readonly DocumentResponseDto[],
): ListDocumentsLoader {
  return (): Promise<ListDocumentsResult> => Promise.resolve({ documents, ok: true });
}

function createSuccessUploader(): UploadDocumentSubmitter {
  return () => Promise.resolve({ document: testDocument, ok: true });
}

function createWorkerTasksLoader(
  tasks: readonly WorkerAssignedTaskResponseDto[],
): WorkerAssignedTasksLoader {
  return () => Promise.resolve({ ok: true, siteId: SITE_ID, tasks, workerUserId: "worker-id" });
}

function selectTestFile(): void {
  const file = new File(["content"], "plan.pdf", { type: "application/pdf" });
  simulateFileSelection(file);
}

function selectInvalidFile(): void {
  const file = new File(["content"], "virus.exe", { type: "application/octet-stream" });
  simulateFileSelection(file);
}

function selectLargeFile(): void {
  const file = new File(["content"], "large.pdf", { type: "application/pdf" });
  // jsdom dérive size depuis le contenu réel — on le remplace pour simuler un fichier > 50 Mo.
  Object.defineProperty(file, "size", { configurable: true, value: 51 * 1024 * 1024 });
  simulateFileSelection(file);
}

function simulateFileSelection(file: File): void {
  const input = screen.getByLabelText("Fichier");
  // jsdom ne supporte pas l'API FileList nativement : on remplace files via defineProperty configurable.
  Object.defineProperty(input, "files", { configurable: true, value: [file] });
  fireEvent.change(input);
}

async function fillAndSubmitUploadForm(): Promise<void> {
  await screen.findByRole("form", { name: "Formulaire upload document" });
  fireEvent.change(screen.getByLabelText("Titre du document"), {
    target: { value: "Plan de masse" },
  });
  selectTestFile();
  fireEvent.click(screen.getByRole("button", { name: "Ajouter le document" }));
}
