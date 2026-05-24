import { Card, CardContent } from "@/components/ui/card";

interface Props {
  label: string;
  value: string | number;
  hint?: string;
}

export function KpiCard({ label, value, hint }: Props) {
  return (
    <Card>
      <CardContent className="space-y-1 px-4 py-3">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="text-2xl font-semibold tabular-nums">
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
        {hint ? (
          <div className="text-xs text-muted-foreground">{hint}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}
