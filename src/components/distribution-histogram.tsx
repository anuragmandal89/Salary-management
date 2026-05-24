"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatSalary } from "@/lib/money";

interface Bucket {
  min: number;
  max: number;
  count: number;
}

interface Props {
  buckets: Bucket[];
  currency: string;
}

export function DistributionHistogram({ buckets, currency }: Props) {
  const data = buckets.map((b) => ({
    range: `${shortMoney(b.min, currency)}–${shortMoney(b.max, currency)}`,
    count: b.count,
    rawMin: b.min,
    rawMax: b.max,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 24 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" />
          <XAxis
            dataKey="range"
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
            interval={0}
            angle={-25}
            textAnchor="end"
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-popover)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(v) => [Number(v).toLocaleString(), "Employees"]}
            labelFormatter={(label, items) => {
              const item = items?.[0]?.payload as
                | (typeof data)[number]
                | undefined;
              if (!item) return label;
              return `${formatSalary(item.rawMin, currency)} – ${formatSalary(
                item.rawMax,
                currency
              )}`;
            }}
          />
          <Bar dataKey="count" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function shortMoney(v: number, currency: string): string {
  if (v >= 1_000_000) return `${Math.round(v / 1_000_000)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return formatSalary(v, currency);
}
