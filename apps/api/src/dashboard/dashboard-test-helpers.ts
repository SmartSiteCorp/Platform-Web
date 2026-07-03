import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { Response } from "supertest";
import request from "supertest";

import type { RegisterResponseDto } from "../auth/auth.dto.js";
import type { DatabaseService } from "../database/database.service.js";
import type { SiteResponseDto } from "../sites/sites.dto.js";
import { setUserRoles } from "../sites/sites-test-helpers.js";
import type { SiteManagerDashboardResponseDto } from "./dashboard.dto.js";

interface CreateSiteOptions {
  readonly estimatedDurationDays?: number;
  readonly name?: string;
  readonly startDate?: string;
}

interface CreatePhaseOptions {
  readonly estimatedDurationDays?: number;
  readonly name?: string;
  readonly progressPercent?: number;
  readonly startDate?: string;
  readonly status?: string;
}

interface CreateTaskOptions {
  readonly dueDate?: string;
  readonly phaseId?: string;
  readonly status?: string;
  readonly title?: string;
}

interface CreateAiAlertOptions {
  readonly description?: string;
  readonly recommendation?: string | null;
  readonly resolved?: boolean;
  readonly severity?: string;
  readonly type?: string;
}

export async function createDashboardTestAccount(
  httpServer: Server,
  createdOrganizationIds: Set<string>,
): Promise<RegisterResponseDto> {
  const response = await request(httpServer)
    .post("/api/auth/register")
    .send({
      email: `dashboard-${randomUUID()}@smartsite.test`,
      firstName: "Lea",
      lastName: "Chantier",
      organizationName: "SmartSite Dashboard",
      password: "Test1234567@.",
    })
    .expect(201);
  const account = parseRegisterResponse(response);

  createdOrganizationIds.add(account.organization.id);

  return account;
}

export async function createDashboardSite(
  httpServer: Server,
  account: RegisterResponseDto,
  options: CreateSiteOptions = {},
): Promise<SiteResponseDto> {
  const response = await request(httpServer)
    .post("/api/sites")
    .set("Authorization", `Bearer ${account.accessToken}`)
    .send({
      estimatedDurationDays: options.estimatedDurationDays ?? 30,
      name: options.name ?? "Chantier Dashboard",
      startDate: options.startDate ?? "2026-07-01",
    })
    .expect(201);

  return parseSiteResponse(response);
}

export async function switchAccountRoles(
  databaseService: DatabaseService,
  account: RegisterResponseDto,
  roleCodes: readonly string[],
): Promise<void> {
  await setUserRoles(databaseService, account.user.id, roleCodes);
}

export async function markSiteInProgress(
  databaseService: DatabaseService,
  siteId: string,
): Promise<void> {
  await databaseService.query("UPDATE sites SET status = 'in_progress' WHERE id = $1", [siteId]);
}

export async function createDashboardPhase(
  databaseService: DatabaseService,
  siteId: string,
  options: CreatePhaseOptions = {},
): Promise<string> {
  const result = await databaseService.query<{ readonly id: string }>(
    `
      INSERT INTO phases
        (site_id, name, position, start_date, estimated_duration_days, progress_percent, status)
      VALUES (
        $1,
        $2,
        COALESCE((SELECT MAX(position) FROM phases WHERE site_id = $1), 0) + 1,
        $3,
        $4,
        $5,
        $6::phase_status
      )
      RETURNING id
    `,
    [
      siteId,
      options.name ?? "Gros œuvre",
      options.startDate ?? "2026-07-01",
      options.estimatedDurationDays ?? 10,
      options.progressPercent ?? 50,
      options.status ?? "in_progress",
    ],
  );

  const phaseId = result.rows[0]?.id;

  if (!phaseId) {
    throw new Error("Phase dashboard non créée.");
  }

  return phaseId;
}

export async function createDashboardTask(
  databaseService: DatabaseService,
  siteId: string,
  createdBy: string,
  options: CreateTaskOptions = {},
): Promise<string> {
  const result = await databaseService.query<{ readonly id: string }>(
    `
      INSERT INTO tasks (site_id, phase_id, title, status, due_date, created_by, completed_at)
      VALUES (
        $1,
        $2,
        $3,
        $4::task_status,
        $5,
        $6,
        CASE WHEN $4::task_status = 'completed' THEN now() ELSE NULL END
      )
      RETURNING id
    `,
    [
      siteId,
      options.phaseId ?? null,
      options.title ?? "Contrôle chantier",
      options.status ?? "todo",
      options.dueDate ?? null,
      createdBy,
    ],
  );

  const taskId = result.rows[0]?.id;

  if (!taskId) {
    throw new Error("Tâche dashboard non créée.");
  }

  return taskId;
}

export async function createDashboardWorker(
  databaseService: DatabaseService,
  organizationId: string,
  siteId: string,
): Promise<string> {
  const result = await databaseService.query<{ readonly id: string }>(
    `
      INSERT INTO users
        (organization_id, email, password_hash, first_name, last_name, status)
      VALUES ($1, $2, 'test-hash', 'Nora', 'Martin', 'active')
      RETURNING id
    `,
    [organizationId, `worker-${randomUUID()}@smartsite.test`],
  );
  const workerUserId = result.rows[0]?.id;

  if (!workerUserId) {
    throw new Error("Ouvrier dashboard non créé.");
  }

  await databaseService.query(
    `
      INSERT INTO user_roles (user_id, role_id)
      SELECT $1, roles.id FROM roles WHERE roles.code = 'ouvrier'
    `,
    [workerUserId],
  );
  await databaseService.query(
    `
      INSERT INTO site_members (site_id, user_id, role_id)
      SELECT $1, $2, roles.id FROM roles WHERE roles.code = 'ouvrier'
    `,
    [siteId, workerUserId],
  );

  return workerUserId;
}

export async function createDashboardAiAlert(
  databaseService: DatabaseService,
  siteId: string,
  options: CreateAiAlertOptions = {},
): Promise<string> {
  const result = await databaseService.query<{ readonly id: string }>(
    `
      INSERT INTO ai_alerts
        (site_id, type, severity, description, recommendation, status, resolved_at)
      VALUES (
        $1,
        $2,
        $3::alert_severity,
        $4,
        $5,
        CASE WHEN $6::boolean THEN 'resolved' ELSE 'open' END,
        CASE WHEN $6::boolean THEN now() ELSE NULL END
      )
      RETURNING id
    `,
    [
      siteId,
      options.type ?? "delay_risk",
      options.severity ?? "critical",
      options.description ?? "Retard probable détecté sur le gros œuvre.",
      options.recommendation ?? "Réaffecter une équipe sur la phase concernée.",
      options.resolved ?? false,
    ],
  );

  const alertId = result.rows[0]?.id;

  if (!alertId) {
    throw new Error("Alerte dashboard non créée.");
  }

  return alertId;
}

export function parseDashboardResponse(response: Response): SiteManagerDashboardResponseDto {
  return JSON.parse(response.text) as SiteManagerDashboardResponseDto;
}

function parseRegisterResponse(response: Response): RegisterResponseDto {
  return JSON.parse(response.text) as RegisterResponseDto;
}

function parseSiteResponse(response: Response): SiteResponseDto {
  return JSON.parse(response.text) as SiteResponseDto;
}
