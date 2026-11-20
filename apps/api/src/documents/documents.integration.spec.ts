import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { Server } from "node:http";
import request from "supertest";
import { afterAll, afterEach, beforeAll, expect, it } from "vitest";

import { configureHttpApp } from "../app-http.js";
import { AppModule } from "../app.module.js";
import { DatabaseService } from "../database/database.service.js";
import { deleteCreatedOrganizations } from "../organizations/organization-invitations-test-helpers.js";
import {
  createRegisterRequest,
  parseRegisterResponse,
  type RegisteredTestAccount,
} from "../organizations/organizations-test-helpers.js";
import { setUserRoles } from "../sites/sites-test-helpers.js";
import {
  countDocumentsForSite,
  createTestPdfBuffer,
  createTestPngBuffer,
  findPersistedDocument,
  findPersistedFile,
} from "./documents-test-helpers.js";
import type { DocumentListResponseDto, DocumentResponseDto } from "./documents.dto.js";

const createdOrganizationIds = new Set<string>();
let app: INestApplication<Server>;
let databaseService: DatabaseService;

beforeAll(async () => {
  process.env.AUTH_REGISTER_RATE_LIMIT_LIMIT = "100";
  process.env.AUTH_REGISTER_RATE_LIMIT_TTL_SECONDS = "60";
  process.env.UPLOADS_PATH = "/tmp/smartsite-integration-test";

  const testingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = testingModule.createNestApplication<INestApplication<Server>>();
  configureHttpApp(app);
  await app.init();

  databaseService = app.get(DatabaseService);
});

afterEach(async () => {
  await deleteCreatedOrganizations(databaseService, createdOrganizationIds);
  createdOrganizationIds.clear();
});

afterAll(async () => {
  await app.close();
});

it("uploade un PDF et retourne 201 avec les métadonnées du document", async () => {
  const account = await createChefChantierAccount();
  const siteId = await createSite(account);

  const response = await request(getHttpServer())
    .post(`/api/sites/${siteId}/documents`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .attach("file", createTestPdfBuffer(), {
      contentType: "application/pdf",
      filename: "devis.pdf",
    })
    .field("title", "Devis toiture")
    .field("documentType", "devis")
    .expect(201);

  const document = parseDocumentResponse(response);
  expect(document.id).toBeDefined();
  expect(document.siteId).toBe(siteId);
  expect(document.title).toBe("Devis toiture");
  expect(document.documentType).toBe("devis");
  expect(document.file.originalName).toBe("devis.pdf");
  expect(document.file.mimeType).toBe("application/pdf");
  expect(document.file.sizeBytes).toBeGreaterThan(0);
  expect(document.createdAt).toBeDefined();
});

it("uploade une image PNG et retourne 201", async () => {
  const account = await createChefChantierAccount();
  const siteId = await createSite(account);

  const response = await request(getHttpServer())
    .post(`/api/sites/${siteId}/documents`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .attach("file", createTestPngBuffer(), { contentType: "image/png", filename: "photo.png" })
    .field("title", "Photo chantier")
    .field("documentType", "rapport")
    .expect(201);

  const document = parseDocumentResponse(response);
  expect(document.file.mimeType).toBe("image/png");
});

it("persiste le fichier et le document en base de données", async () => {
  const account = await createChefChantierAccount();
  const siteId = await createSite(account);

  const response = await request(getHttpServer())
    .post(`/api/sites/${siteId}/documents`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .attach("file", createTestPdfBuffer(), { contentType: "application/pdf", filename: "plan.pdf" })
    .field("title", "Plan de masse")
    .field("documentType", "plan")
    .expect(201);

  const document = parseDocumentResponse(response);

  const persistedDocument = await findPersistedDocument(databaseService, document.id);
  expect(persistedDocument).not.toBeNull();
  expect(persistedDocument?.site_id).toBe(siteId);
  expect(persistedDocument?.title).toBe("Plan de masse");
  expect(persistedDocument?.document_type).toBe("plan");

  const persistedFile = await findPersistedFile(databaseService, document.fileId);
  expect(persistedFile).not.toBeNull();
  expect(persistedFile?.organization_id).toBe(account.response.organization.id);
  expect(persistedFile?.site_id).toBe(siteId);
  expect(persistedFile?.original_name).toBe("plan.pdf");
  expect(persistedFile?.mime_type).toBe("application/pdf");
  expect(persistedFile?.category).toBe("pdf");
});

it("retourne 400 si le titre est manquant", async () => {
  const account = await createChefChantierAccount();
  const siteId = await createSite(account);

  await request(getHttpServer())
    .post(`/api/sites/${siteId}/documents`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .attach("file", createTestPdfBuffer(), { contentType: "application/pdf", filename: "f.pdf" })
    .field("documentType", "devis")
    .expect(400);
});

it("retourne 400 si le type de document est invalide", async () => {
  const account = await createChefChantierAccount();
  const siteId = await createSite(account);

  await request(getHttpServer())
    .post(`/api/sites/${siteId}/documents`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .attach("file", createTestPdfBuffer(), { contentType: "application/pdf", filename: "f.pdf" })
    .field("title", "Titre")
    .field("documentType", "type-invalide")
    .expect(400);
});

it("retourne 400 si le format de fichier n'est pas autorisé", async () => {
  const account = await createChefChantierAccount();
  const siteId = await createSite(account);

  await request(getHttpServer())
    .post(`/api/sites/${siteId}/documents`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .attach("file", Buffer.from("malware"), {
      contentType: "application/octet-stream",
      filename: "virus.exe",
    })
    .field("title", "Titre")
    .field("documentType", "devis")
    .expect(400);
});

it("retourne 400 si le fichier dépasse la taille maximale autorisée (50 Mo)", async () => {
  const account = await createChefChantierAccount();
  const siteId = await createSite(account);

  // 51 Mo de zéros — dépasse la limite de 50 Mo configurée dans le contrôleur.
  const largeBuffer = Buffer.alloc(51 * 1024 * 1024);

  await request(getHttpServer())
    .post(`/api/sites/${siteId}/documents`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .attach("file", largeBuffer, { contentType: "application/pdf", filename: "lourd.pdf" })
    .field("title", "Fichier volumineux")
    .field("documentType", "devis")
    .expect(400);
}, 30_000);

it("retourne 404 si le chantier n'existe pas lors de l'upload", async () => {
  const account = await createChefChantierAccount();

  await request(getHttpServer())
    .post("/api/sites/00000000-0000-4000-a000-000000000000/documents")
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .attach("file", createTestPdfBuffer(), { contentType: "application/pdf", filename: "f.pdf" })
    .field("title", "Titre")
    .field("documentType", "devis")
    .expect(404);
});

it("retourne la liste vide quand aucun document n'existe", async () => {
  const account = await createChefChantierAccount();
  const siteId = await createSite(account);

  const response = await request(getHttpServer())
    .get(`/api/sites/${siteId}/documents`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .expect(200);

  const list = parseDocumentListResponse(response);
  expect(list.siteId).toBe(siteId);
  expect(list.documents).toHaveLength(0);
});

it("retourne les documents uploadés pour un chantier", async () => {
  const account = await createChefChantierAccount();
  const siteId = await createSite(account);

  await uploadDocument(account, siteId, "Premier document", "devis");
  await uploadDocument(account, siteId, "Deuxième document", "plan");

  const response = await request(getHttpServer())
    .get(`/api/sites/${siteId}/documents`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .expect(200);

  const list = parseDocumentListResponse(response);
  expect(list.siteId).toBe(siteId);
  expect(list.documents).toHaveLength(2);
  expect(list.documents.map((d) => d.title)).toContain("Premier document");
  expect(list.documents.map((d) => d.title)).toContain("Deuxième document");
});

it("retourne 404 si le chantier n'existe pas lors du listage", async () => {
  const account = await createChefChantierAccount();

  await request(getHttpServer())
    .get("/api/sites/00000000-0000-4000-a000-000000000001/documents")
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .expect(404);
});

it("accepte tous les types de documents valides", async () => {
  const account = await createChefChantierAccount();
  const siteId = await createSite(account);

  const validTypes = ["devis", "plan", "rapport", "contrat", "autre"] as const;

  for (const documentType of validTypes) {
    await uploadDocument(account, siteId, `Document ${documentType}`, documentType);
  }

  const count = await countDocumentsForSite(databaseService, siteId);
  expect(count).toBe(validTypes.length);
});

function getHttpServer(): Server {
  return app.getHttpServer();
}

async function createChefChantierAccount(): Promise<RegisteredTestAccount> {
  const registrationRequest = createRegisterRequest();
  const response = await request(getHttpServer())
    .post("/api/auth/register")
    .send(registrationRequest)
    .expect(201);
  const responseBody = parseRegisterResponse(response);

  createdOrganizationIds.add(responseBody.organization.id);
  await setUserRoles(databaseService, responseBody.user.id, ["chef_chantier"]);

  return { request: registrationRequest, response: responseBody };
}

async function createSite(account: RegisteredTestAccount): Promise<string> {
  const response = await request(getHttpServer())
    .post("/api/sites")
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .send({ name: "Chantier Test" })
    .expect(201);

  return (JSON.parse(response.text) as { id: string }).id;
}

async function uploadDocument(
  account: RegisteredTestAccount,
  siteId: string,
  title: string,
  documentType: string,
): Promise<DocumentResponseDto> {
  const response = await request(getHttpServer())
    .post(`/api/sites/${siteId}/documents`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .attach("file", createTestPdfBuffer(), { contentType: "application/pdf", filename: "doc.pdf" })
    .field("title", title)
    .field("documentType", documentType)
    .expect(201);

  return parseDocumentResponse(response);
}

function parseDocumentResponse(response: { text: string }): DocumentResponseDto {
  return JSON.parse(response.text) as DocumentResponseDto;
}

function parseDocumentListResponse(response: { text: string }): DocumentListResponseDto {
  return JSON.parse(response.text) as DocumentListResponseDto;
}
