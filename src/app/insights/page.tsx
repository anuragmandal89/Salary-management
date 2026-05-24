import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KpiCard } from "@/components/kpi-card";
import { CountrySalaryChart } from "@/components/country-salary-chart";
import { CountryPicker } from "@/components/country-picker";
import { DistributionHistogram } from "@/components/distribution-histogram";
import { getCountryName } from "@/lib/countries";
import { formatSalary } from "@/lib/money";
import {
  getByCountry,
  getByDepartmentInCountry,
  getByJobTitleInCountry,
  getSalaryDistribution,
  getSummary,
} from "@/lib/insights";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const rawCountry = typeof sp.country === "string" ? sp.country : undefined;

  const [summary, byCountry] = await Promise.all([getSummary(), getByCountry()]);

  // Default to the country with the most employees if none was selected
  // (or the chosen code doesn't exist in the dataset).
  const validCodes = new Set(byCountry.map((c) => c.country));
  const country =
    rawCountry && validCodes.has(rawCountry.toUpperCase())
      ? rawCountry.toUpperCase()
      : byCountry[0]?.country ?? "US";

  const [byJobTitle, byDept, distribution] = await Promise.all([
    getByJobTitleInCountry(country),
    getByDepartmentInCountry(country),
    getSalaryDistribution(country, 10),
  ]);

  const focusCurrency = distribution?.currency ?? "USD";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
        <p className="text-sm text-muted-foreground">
          Headline metrics plus a per-country drill-down. All amounts shown in
          local currency.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Employees" value={summary.totalEmployees} />
        <KpiCard label="Countries" value={summary.totalCountries} />
        <KpiCard label="Departments" value={summary.totalDepartments} />
        <KpiCard label="Job titles" value={summary.totalJobTitles} />
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Average salary by country</CardTitle>
            <CardDescription>
              Each bar is shown in that country&apos;s currency, so absolute
              heights are not directly comparable across bars — focus on
              relative position within a single country.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CountrySalaryChart data={byCountry} />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">
              {getCountryName(country)} ({country})
            </h2>
            <p className="text-sm text-muted-foreground">
              Drill-down for the selected country.
            </p>
          </div>
          <CountryPicker
            countries={byCountry.map((c) => ({
              code: c.country,
              count: c.count,
            }))}
            value={country}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Salary distribution</CardTitle>
              <CardDescription>
                Bucketed across the country&apos;s salary range.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {distribution ? (
                <DistributionHistogram
                  buckets={distribution.buckets}
                  currency={focusCurrency}
                />
              ) : (
                <Empty />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Average by department</CardTitle>
              <CardDescription>
                Ordered highest to lowest average salary.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {byDept ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">Headcount</TableHead>
                      <TableHead className="text-right">Avg salary</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byDept.items.map((d) => (
                      <TableRow key={d.department}>
                        <TableCell>{d.department}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {d.count.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatSalary(d.avg, byDept.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Empty />
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Average by job title</CardTitle>
            <CardDescription>
              Top-paid job titles for {getCountryName(country)}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {byJobTitle ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job title</TableHead>
                    <TableHead className="text-right">Headcount</TableHead>
                    <TableHead className="text-right">Min</TableHead>
                    <TableHead className="text-right">Avg</TableHead>
                    <TableHead className="text-right">Max</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byJobTitle.items.map((j) => (
                    <TableRow key={j.jobTitle}>
                      <TableCell>{j.jobTitle}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {j.count.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatSalary(j.min, byJobTitle.currency)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatSalary(j.avg, byJobTitle.currency)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatSalary(j.max, byJobTitle.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Empty />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Empty() {
  return (
    <div className="rounded-md border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
      No data for this country.
    </div>
  );
}
