import type { DashboardStat } from "./dashboard-data";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const badgeToneByStatTone: Record<
  DashboardStat["tone"],
  "default" | "success" | "warning" | "danger"
> = {
  danger: "danger",
  default: "default",
  success: "success",
  warning: "warning",
};

interface StatCardProps {
  readonly stat: DashboardStat;
}

export function StatCard({ stat }: StatCardProps) {
  const Icon = stat.icon;

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
          <p className="mt-2 text-3xl font-bold tracking-normal">{stat.value}</p>
        </div>
        <Badge tone={badgeToneByStatTone[stat.tone]} className="h-10 w-10 justify-center p-0">
          <Icon className="h-5 w-5" />
        </Badge>
      </CardContent>
    </Card>
  );
}
