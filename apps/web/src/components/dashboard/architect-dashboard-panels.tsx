"use client";

import { ArrowRight, FileCode2, MessageSquareText } from "lucide-react";
import Link from "next/link";

import type {
  ArchitectAnnotationResponseDto,
  ArchitectIfcModelResponseDto,
  ArchitectProjectResponseDto,
} from "@/generated/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatStatus } from "./dashboard-formatters";
import {
  EmptyPanelMessage,
  Metric,
  formatBimValidationStatus,
  formatIfcStatus,
  getBimValidationTone,
  getIfcStatusTone,
  toRoute,
} from "./architect-dashboard-panel-helpers";

const maxVisibleProjects = 4;
const maxVisibleIfcModels = 4;
const maxVisibleAnnotations = 4;

export function ArchitectProjectsPanel({
  projects,
}: {
  readonly projects: readonly ArchitectProjectResponseDto[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Projets associés</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {projects.length === 0 ? (
          <EmptyPanelMessage message="Aucun projet architecte accessible sur ce périmètre." />
        ) : (
          projects
            .slice(0, maxVisibleProjects)
            .map((project) => <ArchitectProjectRow key={project.id} project={project} />)
        )}
      </CardContent>
    </Card>
  );
}

function ArchitectProjectRow({ project }: { readonly project: ArchitectProjectResponseDto }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{project.name}</h3>
            <Badge tone="muted">{formatStatus(project.status)}</Badge>
            <Badge tone={getIfcStatusTone(project.ifcStatus)}>
              {formatIfcStatus(project.ifcStatus)}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {project.address ?? "Adresse non renseignée"}
          </p>
        </div>
        <Link
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-semibold transition-colors hover:bg-muted"
          href={toRoute(project.detailsPath)}
        >
          Ouvrir
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <Metric label="IFC" value={String(project.ifcModelCount)} />
        <Metric label="Annotations" value={String(project.recentAnnotationsCount)} />
        <Metric label="Anomalies IA" value={String(project.activeAiAnomaliesCount)} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Validation BIM</span>
        <Badge tone={getBimValidationTone(project.bimValidationStatus)}>
          {formatBimValidationStatus(project.bimValidationStatus)}
        </Badge>
      </div>
    </div>
  );
}

export function ArchitectIfcModelsPanel({
  ifcModels,
}: {
  readonly ifcModels: readonly ArchitectIfcModelResponseDto[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fichiers IFC</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {ifcModels.length === 0 ? (
          <EmptyPanelMessage message="Aucun fichier IFC disponible pour les projets accessibles." />
        ) : (
          ifcModels
            .slice(0, maxVisibleIfcModels)
            .map((ifcModel) => <IfcModelRow ifcModel={ifcModel} key={ifcModel.id} />)
        )}
      </CardContent>
    </Card>
  );
}

function IfcModelRow({ ifcModel }: { readonly ifcModel: ArchitectIfcModelResponseDto }) {
  return (
    <Link
      className="block rounded-lg border border-border bg-background p-3 transition-colors hover:bg-muted/60"
      href={toRoute(ifcModel.detailsPath)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{ifcModel.fileName}</p>
            <Badge tone={getIfcStatusTone(ifcModel.status)}>
              {formatIfcStatus(ifcModel.status)}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {ifcModel.siteName} · v{ifcModel.version} · {formatDateTime(ifcModel.createdAt)}
          </p>
        </div>
        <FileCode2 aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-primary" />
      </div>
    </Link>
  );
}

export function ArchitectAnnotationsPanel({
  annotations,
}: {
  readonly annotations: readonly ArchitectAnnotationResponseDto[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Annotations récentes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {annotations.length === 0 ? (
          <EmptyPanelMessage message="Aucune annotation récente à afficher." />
        ) : (
          annotations
            .slice(0, maxVisibleAnnotations)
            .map((annotation) => <AnnotationRow annotation={annotation} key={annotation.id} />)
        )}
      </CardContent>
    </Card>
  );
}

function AnnotationRow({ annotation }: { readonly annotation: ArchitectAnnotationResponseDto }) {
  return (
    <Link
      className="block rounded-lg border border-border bg-background p-3 transition-colors hover:bg-muted/60"
      href={toRoute(annotation.detailsPath)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{annotation.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {annotation.siteName} · {formatDateTime(annotation.createdAt)}
          </p>
          {annotation.comment ? (
            <p className="mt-2 text-sm text-muted-foreground">{annotation.comment}</p>
          ) : null}
        </div>
        <MessageSquareText aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-primary" />
      </div>
    </Link>
  );
}
