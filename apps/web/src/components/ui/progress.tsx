interface ProgressProps {
  readonly value: number;
}

export function Progress({ value }: ProgressProps) {
  const normalizedValue = Math.min(Math.max(value, 0), 100);

  const width = `${String(normalizedValue)}%`;

  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-primary" style={{ width }} />
    </div>
  );
}
