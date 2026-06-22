import { AlertCircle, CheckCircle } from "lucide-react";

interface OrganizationFormStatusMessageProps {
  readonly message: string | null;
  readonly tone: "error" | "success";
}

export function OrganizationFormStatusMessage({
  message,
  tone,
}: OrganizationFormStatusMessageProps) {
  if (!message) {
    return null;
  }

  const Icon = tone === "error" ? AlertCircle : CheckCircle;
  const toneClasses =
    tone === "error"
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : "border-success/40 bg-success/20 text-success-foreground";

  return (
    <div
      className={`flex items-start gap-3 rounded-md border p-3 text-sm ${toneClasses}`}
      role="alert"
    >
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
