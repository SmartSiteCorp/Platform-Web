import { randomUUID } from "node:crypto";
import type { QueryResultRow } from "pg";
import type { Response } from "supertest";

import type { RegisterResponseDto } from "../auth/auth.dto.js";
import type { JsonObject } from "../database/database.types.js";
import type { OrganizationResponseDto } from "./organizations.dto.js";

export interface RegisterPayload {
  readonly organizationName: string;
  readonly email: string;
  readonly password: string;
  readonly firstName: string;
  readonly lastName: string;
}

export interface OrganizationDatabaseRow extends QueryResultRow {
  readonly name: string;
  readonly email: string;
  readonly phone: string | null;
  readonly address: string | null;
}

export interface OrganizationAuditLogDatabaseRow extends QueryResultRow {
  readonly action: string;
  readonly actor_user_id: string | null;
  readonly changed_fields: string[];
  readonly metadata: JsonObject;
}

export interface ApiErrorResponse {
  readonly message: readonly string[];
  readonly statusCode: number;
}

export interface RegisteredTestAccount {
  readonly request: RegisterPayload;
  readonly response: RegisterResponseDto;
}

export function createRegisterRequest(): RegisterPayload {
  const identifier = randomUUID();

  return {
    email: `organization-${identifier}@smartsite.test`,
    firstName: "Andreea",
    lastName: "Rauta",
    organizationName: "Stern Tech",
    password: "Test123@",
  };
}

export function parseRegisterResponse(response: Response): RegisterResponseDto {
  return JSON.parse(response.text) as RegisterResponseDto;
}

export function parseOrganizationResponse(response: Response): OrganizationResponseDto {
  return JSON.parse(response.text) as OrganizationResponseDto;
}

export function parseApiErrorResponse(response: Response): ApiErrorResponse {
  return JSON.parse(response.text) as ApiErrorResponse;
}
