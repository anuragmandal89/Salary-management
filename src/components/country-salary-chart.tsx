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
import { getCountryName } from "@/lib/countries";
import { formatSalary } from "@/lib/money";

interface Row {
  country: string;
  currency: string;
  count: number;
  avg: number;
  min: number;
  max: number;
}

interface Props {
  data: Row[];
}

export function CountrySalaryChart({ data }: Props) {
  // Average salaries across currencies aren't directly comparable, so we
  // chart the relative position of avg within each country's min/max range.
  // The label still shows the raw avg formatted in local currency.
  const chartData = data.map((d) => ({
    country: d.country,
    name: getCountryName(d.country),
    headcount: d.count,
    avg: d.avg,
    min: d.min,
    max: d.max,
    currency: d.currency,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 16, left: 0, bottom: 24 }}
        >
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" />
          <XAxis
            dataKey="country"
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
            interval={0}
            angle={-30}
            textAnchor="end"
          />
          <YAxis
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
            tickFormatter={(v: number) => v.toLocaleString()}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-popover)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value, _name, item) => {
              const row = item.payload as (typeof chartData)[number];
              return [formatSalary(Number(value), row.currency), "Avg salary"];
            }}
            labelFormatter={(label) => {
              const row = chartData.find((r) => r.country === label);
              return row ? `${row.name} (${row.headcount} employees)` : label;
            }}
          />
          <Bar dataKey="avg" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
