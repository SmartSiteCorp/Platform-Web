import type { Server } from "node:http";
import request from "supertest";

import type { RegisterResponseDto } from "../auth/auth.dto.js";
import type { DatabaseService } from "../database/database.service.js";
import type { SiteResponseDto } from "../sites/sites.dto.js";
import {
  createArchitectAnnotation,
  createArchitectBimModel,
  createArchitectIfcFile,
  parseArchitectDashboardResponse,
  setArchitectSiteMemberRoles,
} from "./architect-dashboard-test-helpers.js";
import type { ArchitectDashboardResponseDto } from "./architect-dashboard.dto.js";
import {
  createDashboardAiAlert,
  createDashboardSite,
  createDashboardTestAccount,
  switchAccountRoles,
} from "./dashboard-test-helpers.js";

interface SeedArchitectProjectOptions {
  readonly annotationComment?: string;
  readonly annotationTitle?: string;
  readonly anomalyDescription?: string;
  readonly anomalyRecommendation?: string;
  readonly ifcFileName?: string;
  readonly version?: string;
}

export interface ArchitectDashboardAcceptanceFixture {
  readonly account: RegisterResponseDto;
  readonly anomalyId: string;
  readonly annotationId: string;
  readonly ifcFileId: string;
  readonly ifcFileName: string;
  readonly ifcModelId: string;
  readonly site: SiteResponseDto;
}

export async function createArchitectDashboardAcceptanceAccount(
  httpServer: Server,
  createdOrganizationIds: Set<string>,
): Promise<RegisterResponseDto> {
  return createDashboardTestAccount(httpServer, createdOrganizationIds);
}

export async function seedArchitectDashboardAcceptanceFixture(
  databaseService: DatabaseService,
  httpServer: Server,
  createdOrganizationIds: Set<string>,
): Promise<ArchitectDashboardAcceptanceFixture> {
  const account = await createArchitectDashboardAcceptanceAccount(
    httpServer,
    createdOrganizationIds,
  );
  const site = await createDashboardSite(httpServer, account, { name: "Projet BIM Recette" });

  await switchAccountRoles(databaseService, account, ["architecte"]);
  await authorizeArchitectSite(databaseService, account, site);

  return {
    account,
    site,
    ...(await seedSingleArchitectProject(databaseService, account, site, {
      annotationComment: "Contrôle recette avant validation du modèle.",
      annotationTitle: "Annotation recette BIM",
      anomalyDescription: "Écart recette entre plan et terrain.",
      anomalyRecommendation: "Comparer le scan terrain avec la maquette IFC.",
      ifcFileName: "modele-ifc-recette.ifc",
      version: "v-recette",
    })),
  };
}

export async function authorizeArchitectSite(
  databaseService: DatabaseService,
  account: RegisterResponseDto,
  site: SiteResponseDto,
): Promise<void> {
  await setArchitectSiteMemberRoles(databaseService, site.id, account.user.id, ["architecte"]);
}

export async function seedSingleArchitectProject(
  databaseService: DatabaseService,
  account: RegisterResponseDto,
  site: SiteResponseDto,
  options: SeedArchitectProjectOptions = {},
): Promise<Omit<ArchitectDashboardAcceptanceFixture, "account" | "site">> {
  const ifcFileName = options.ifcFileName ?? `modele-${site.id}.ifc`;
  const ifcFileId = await createArchitectIfcFile(
    databaseService,
    account.organization.id,
    site.id,
    account.user.id,
    {
      metadata: { ifcStatus: "available" },
      originalName: ifcFileName,
    },
  );
  const ifcModelId = await createArchitectBimModel(
    databaseService,
    site.id,
    account.user.id,
    ifcFileId,
    {
      notes: "Version de recette reliée au chantier.",
      version: options.version ?? "v1",
    },
  );
  const annotationId = await createArchitectAnnotation(
    databaseService,
    site.id,
    account.user.id,
    ifcModelId,
    {
      comment: options.annotationComment ?? "Contrôle architecte à traiter.",
      title: options.annotationTitle ?? `Annotation ${site.name}`,
    },
  );
  const anomalyId = await createDashboardAiAlert(databaseService, site.id, {
    description: options.anomalyDescription ?? `Écart IA détecté sur ${site.name}.`,
    recommendation: options.anomalyRecommendation ?? "Vérifier le modèle avant validation.",
    severity: "high",
    type: "bim_discrepancy",
  });

  return { anomalyId, annotationId, ifcFileId, ifcFileName, ifcModelId };
}

export async function getArchitectDashboard(
  httpServer: Server,
  account: RegisterResponseDto,
): Promise<ArchitectDashboardResponseDto> {
  const response = await request(httpServer)
    .get("/api/dashboard/architect")
    .set("Authorization", `Bearer ${account.accessToken}`)
    .expect(200);

  return parseArchitectDashboardResponse(response);
}
