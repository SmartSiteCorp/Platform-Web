import type { HTMLInputTypeAttribute, InputHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface FieldTrailingAction {
  readonly ariaLabel: string;
  readonly icon: LucideIcon;
  readonly onClick: () => void;
  readonly pressed: boolean;
}

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type"> {
  readonly error: string | undefined;
  readonly icon: LucideIcon;
  readonly id: string;
  readonly label: string;
  readonly trailingAction?: FieldTrailingAction;
  readonly type: HTMLInputTypeAttribute;
}

export function TextField({
  className,
  error,
  icon: Icon,
  id,
  label,
  trailingAction,
  type,
  ...props
}: TextFieldProps) {
  const errorId = `${id}-error`;
  const TrailingIcon = trailingAction?.icon;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Icon
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          aria-describedby={error ? errorId : undefined}
          aria-invalid={Boolean(error)}
          className={cn(trailingAction ? "pl-10 pr-10" : "pl-10", className)}
          id={id}
          type={type}
          {...props}
        />
        {trailingAction && TrailingIcon ? (
          <button
            aria-label={trailingAction.ariaLabel}
            aria-pressed={trailingAction.pressed}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/25"
            onClick={trailingAction.onClick}
            type="button"
          >
            <TrailingIcon aria-hidden="true" className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-destructive" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
