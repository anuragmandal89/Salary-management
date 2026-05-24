import { AddEmployeeButton } from "@/components/add-employee-button";
import { EmployeesFilters } from "@/components/employees-filters";
import { EmployeesTable } from "@/components/employees-table";
import { PaginationBar } from "@/components/pagination-bar";
import {
  listDistinctCountries,
  listDistinctDepartments,
  listDistinctJobTitles,
  getEmployeeCount,
} from "@/lib/employees-meta";
import { listEmployees } from "@/lib/employees-service";
import { serializeEmployee } from "@/lib/serialize";
import { employeeListQuerySchema } from "@/lib/validation";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function flatten(
  raw: Record<string, string | string[] | undefined>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string") out[k] = v;
    else if (Array.isArray(v) && v[0] !== undefined) out[k] = v[0];
  }
  return out;
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const rawParams = await searchParams;
  const flat = flatten(rawParams);
  const parsed = employeeListQuerySchema.safeParse(flat);
  const query = parsed.success
    ? parsed.data
    : employeeListQuerySchema.parse({});

  const [
    result,
    countries,
    departments,
    jobTitles,
    totalAll,
  ] = await Promise.all([
    listEmployees(query),
    listDistinctCountries(),
    listDistinctDepartments(),
    listDistinctJobTitles(),
    getEmployeeCount(),
  ]);

  const baseParams = new URLSearchParams();
  if (query.q) baseParams.set("q", query.q);
  if (query.country) baseParams.set("country", query.country);
  if (query.department) baseParams.set("department", query.department);
  if (query.jobTitle) baseParams.set("jobTitle", query.jobTitle);

  const items = result.items.map(serializeEmployee);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
          <p className="text-sm text-muted-foreground">
            {totalAll.toLocaleString()} total employees in the directory.
          </p>
        </div>
        <AddEmployeeButton />
      </div>

      <EmployeesFilters
        countries={countries}
        departments={departments}
        jobTitles={jobTitles}
      />

      <EmployeesTable employees={items} />

      <PaginationBar
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        baseParams={baseParams}
      />
    </div>
  );
}
