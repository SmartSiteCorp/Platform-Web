import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type BadgeTone = "default" | "success" | "warning" | "danger" | "muted";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly tone?: BadgeTone;
}

const toneClasses: Record<BadgeTone, string> = {
  danger: "border-destructive/30 bg-destructive/10 text-destructive",
  default: "border-primary/30 bg-primary/10 text-primary",
  muted: "border-border bg-muted text-muted-foreground",
  success: "border-success/40 bg-success/20 text-success-foreground",
  warning: "border-warning/40 bg-warning/15 text-warning-foreground",
};

export function Badge({ className, tone = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
