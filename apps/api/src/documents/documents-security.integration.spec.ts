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
import { createTestPdfBuffer, findPersistedFile } from "./documents-test-helpers.js";
import type { DocumentListResponseDto, DocumentResponseDto } from "./documents.dto.js";

const createdOrganizationIds = new Set<string>();
let app: INestApplication<Server>;
let databaseService: DatabaseService;

beforeAll(async () => {
  process.env.AUTH_REGISTER_RATE_LIMIT_LIMIT = "100";
  process.env.AUTH_REGISTER_RATE_LIMIT_TTL_SECONDS = "60";

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

it("associe le fichier uploadé à l'organisation du token JWT", async () => {
  const account = await createChefChantierAccount();
  const siteId = await createSite(account);

  const response = await request(getHttpServer())
    .post(`/api/sites/${siteId}/documents`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .attach("file", createTestPdfBuffer(), { contentType: "application/pdf", filename: "doc.pdf" })
    .field("title", "Document sécurisé")
    .field("documentType", "contrat")
    .expect(201);

  const document = parseDocumentResponse(response);
  const persistedFile = await findPersistedFile(databaseService, document.fileId);

  expect(persistedFile?.organization_id).toBe(account.response.organization.id);
  expect(persistedFile?.uploaded_by).toBe(account.response.user.id);
  expect(persistedFile?.site_id).toBe(siteId);
});

it("isole les documents par organisation : une org ne voit pas les documents d'une autre", async () => {
  const accountA = await createChefChantierAccount();
  const accountB = await createChefChantierAccount();

  const siteIdA = await createSite(accountA);
  const siteIdB = await createSite(accountB);

  await uploadDocument(accountA, siteIdA, "Document Org A", "devis");

  // L'org B accède à son propre chantier (liste vide)
  const responseB = await request(getHttpServer())
    .get(`/api/sites/${siteIdB}/documents`)
    .set("Authorization", `Bearer ${accountB.response.accessToken}`)
    .expect(200);

  const listB = parseDocumentListResponse(responseB);
  expect(listB.documents).toHaveLength(0);
});

it("refuse l'accès à un chantier d'une autre organisation via l'upload", async () => {
  const accountA = await createChefChantierAccount();
  const accountB = await createChefChantierAccount();

  const siteIdA = await createSite(accountA);

  // B essaie d'uploader sur le chantier de A → 404 (le chantier n'est pas dans son org)
  await request(getHttpServer())
    .post(`/api/sites/${siteIdA}/documents`)
    .set("Authorization", `Bearer ${accountB.response.accessToken}`)
    .attach("file", createTestPdfBuffer(), { contentType: "application/pdf", filename: "doc.pdf" })
    .field("title", "Document infiltré")
    .field("documentType", "contrat")
    .expect(404);
});

it("refuse l'accès à un chantier d'une autre organisation via le listage", async () => {
  const accountA = await createChefChantierAccount();
  const accountB = await createChefChantierAccount();

  const siteIdA = await createSite(accountA);

  // B essaie de lister les documents du chantier de A → 404
  await request(getHttpServer())
    .get(`/api/sites/${siteIdA}/documents`)
    .set("Authorization", `Bearer ${accountB.response.accessToken}`)
    .expect(404);
});

it("refuse un token JWT invalide sur l'endpoint d'upload", async () => {
  const account = await createChefChantierAccount();
  const siteId = await createSite(account);

  await request(getHttpServer())
    .post(`/api/sites/${siteId}/documents`)
    .set("Authorization", "Bearer token-invalide")
    .attach("file", createTestPdfBuffer(), { contentType: "application/pdf", filename: "doc.pdf" })
    .field("title", "Titre")
    .field("documentType", "devis")
    .expect(401);
});

it("ne stocke pas de données sensibles dans les métadonnées du fichier", async () => {
  const account = await createChefChantierAccount();
  const siteId = await createSite(account);

  const response = await request(getHttpServer())
    .post(`/api/sites/${siteId}/documents`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .attach("file", createTestPdfBuffer(), { contentType: "application/pdf", filename: "doc.pdf" })
    .field("title", "Document audit")
    .field("documentType", "rapport")
    .expect(201);

  const document = parseDocumentResponse(response);
  const persistedFile = await findPersistedFile(databaseService, document.fileId);

  // La réponse ne contient pas d'URL publique (stockage local, pas de CDN)
  expect(document).not.toHaveProperty("publicUrl");
  // Le provider de stockage placeholder est bien 'local'
  expect(persistedFile?.storage_provider).toBe("local");
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
    .send({ name: "Chantier Sécurité" })
    .expect(201);

  return (JSON.parse(response.text) as { id: string }).id;
}

async function uploadDocument(
  account: RegisteredTestAccount,
  siteId: string,
  title: string,
  documentType: string,
): Promise<void> {
  await request(getHttpServer())
    .post(`/api/sites/${siteId}/documents`)
    .set("Authorization", `Bearer ${account.response.accessToken}`)
    .attach("file", createTestPdfBuffer(), { contentType: "application/pdf", filename: "doc.pdf" })
    .field("title", title)
    .field("documentType", documentType)
    .expect(201);
}

function parseDocumentResponse(response: { text: string }): DocumentResponseDto {
  return JSON.parse(response.text) as DocumentResponseDto;
}

function parseDocumentListResponse(response: { text: string }): DocumentListResponseDto {
  return JSON.parse(response.text) as DocumentListResponseDto;
}
