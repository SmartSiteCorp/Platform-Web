import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { rm } from "node:fs/promises";
import type { Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
import { createTestPdfBuffer, findPersistedFile } from "./documents-test-helpers.js";
import type { DocumentResponseDto } from "./documents.dto.js";

const testUploadsPath = join(tmpdir(), `smartsite-test-download-${String(Date.now())}`);

const createdOrganizationIds = new Set<string>();
let app: INestApplication<Server>;
let databaseService: DatabaseService;

beforeAll(async () => {
  process.env.AUTH_REGISTER_RATE_LIMIT_LIMIT = "100";
  process.env.AUTH_REGISTER_RATE_LIMIT_TTL_SECONDS = "60";
  process.env.UPLOADS_PATH = testUploadsPath;

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
  await rm(testUploadsPath, { force: true, recursive: true });
});

it("sauvegarde le fichier sur le disque lors de l'upload", async () => {
  const account = await createChefChantierAccount();
  const siteId = await createSite(account);
  const pdfBuffer = createTestPdfBuffer();

  const response = await request(getHttpServer())
    .post(`/api/sites/${siteId}/documents`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .attach("file", pdfBuffer, { contentType: "application/pdf", filename: "devis.pdf" })
    .field("title", "Devis")
    .field("documentType", "devis")
    .expect(201);

  const document = parseDocumentResponse(response);
  const persistedFile = await findPersistedFile(databaseService, document.fileId);
  expect(persistedFile?.blob_path).toMatch(/^sites\//);
});

it("télécharge un document et retourne le contenu binaire avec les bons en-têtes", async () => {
  const account = await createChefChantierAccount();
  const siteId = await createSite(account);
  const pdfBuffer = createTestPdfBuffer();

  const uploadResponse = await request(getHttpServer())
    .post(`/api/sites/${siteId}/documents`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .attach("file", pdfBuffer, { contentType: "application/pdf", filename: "rapport.pdf" })
    .field("title", "Rapport mensuel")
    .field("documentType", "rapport")
    .expect(201);

  const document = parseDocumentResponse(uploadResponse);

  const downloadResponse = await request(getHttpServer())
    .get(`/api/sites/${siteId}/documents/${document.id}/download`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .expect(200);

  expect(downloadResponse.headers["content-type"]).toContain("application/pdf");
  expect(downloadResponse.headers["content-disposition"]).toContain("rapport.pdf");
  expect(Buffer.from(downloadResponse.body as Buffer)).toEqual(pdfBuffer);
});

it("retourne 401 sans token JWT sur le téléchargement", async () => {
  const account = await createChefChantierAccount();
  const siteId = await createSite(account);
  const document = await uploadDocument(account, siteId, "Doc", "devis");

  await request(getHttpServer())
    .get(`/api/sites/${siteId}/documents/${document.id}/download`)
    .expect(401);
});

it("retourne 404 si le document n'existe pas lors du téléchargement", async () => {
  const account = await createChefChantierAccount();
  const siteId = await createSite(account);

  await request(getHttpServer())
    .get(`/api/sites/${siteId}/documents/00000000-0000-4000-a000-000000000002/download`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .expect(404);
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
    .send({ name: "Chantier Téléchargement" })
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
