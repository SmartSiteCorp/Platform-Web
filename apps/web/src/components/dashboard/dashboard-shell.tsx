import { Bell, Boxes, FileText, Plane, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { dashboardStats, dashboardTasks, moduleStats } from "./dashboard-data";
import { StatCard } from "./stat-card";

export function DashboardShell() {
  return (
    <main className="min-h-screen bg-background">
      <DashboardHeader />

      <section className="container py-8">
        <DashboardIntro />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dashboardStats.map((stat) => (
            <StatCard key={stat.label} stat={stat} />
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <SiteProgressPanel />
          <FieldPrioritiesPanel />
        </div>

        <SmartSitePrinciples />
      </section>
    </main>
  );
}

function DashboardHeader() {
  return (
    <header className="border-b border-border bg-accent text-accent-foreground">
      <div className="container flex h-20 items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary p-3 text-primary-foreground">
            <Plane className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xl font-bold tracking-normal">SmartSite</p>
            <p className="text-sm text-accent-foreground/80">
              Supervision intelligente de chantier
            </p>
          </div>
        </div>
        <button className="rounded-lg border border-white/20 p-3 text-accent-foreground">
          <Bell className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}

function DashboardIntro() {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <Badge tone="success">Plateforme Web</Badge>
        <h1 className="mt-3 text-3xl font-bold tracking-normal">Tableau de bord SmartSite</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Base initiale connectée au modèle SaaS SmartSite : organisations, chantiers, tâches,
          drones, BIM, IA et documents.
        </p>
      </div>
      <Badge tone="muted">Backend API prêt pour Swagger et OpenAPI</Badge>
    </div>
  );
}

function SiteProgressPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Avancement chantier pilote</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Maison individuelle - Lyon
          </span>
          <span className="text-sm font-bold">68%</span>
        </div>
        <Progress value={68} />
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {moduleStats.map((stat) => (
            <StatCard key={stat.label} stat={stat} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FieldPrioritiesPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Priorités terrain</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {dashboardTasks.map((task) => (
          <div
            key={task.label}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3"
          >
            <div className="flex items-center gap-3">
              <Boxes className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{task.label}</span>
            </div>
            <Badge tone={task.status === "Bloqué" ? "danger" : "default"}>{task.status}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SmartSitePrinciples() {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      <PrincipleCard
        icon={ShieldCheck}
        message="Permissions prévues par organisation, rôle global et appartenance chantier."
        tone="accent"
      />
      <PrincipleCard
        icon={FileText}
        message="Les fichiers lourds seront stockés hors base, avec métadonnées centralisées."
        tone="primary"
      />
    </div>
  );
}

interface PrincipleCardProps {
  readonly icon: LucideIcon;
  readonly message: string;
  readonly tone: "accent" | "primary";
}

function PrincipleCard({ icon: Icon, message, tone }: PrincipleCardProps) {
  const iconColor = tone === "accent" ? "text-accent" : "text-primary";

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <Icon className={`h-8 w-8 ${iconColor}`} />
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}
