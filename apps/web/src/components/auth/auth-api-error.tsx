import { AlertCircle } from "lucide-react";

interface AuthApiErrorProps {
  readonly message: string | null;
}

export function AuthApiError({ message }: AuthApiErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <div
      className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
      role="alert"
    >
      <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
