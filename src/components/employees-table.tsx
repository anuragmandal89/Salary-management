import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmployeeRowActions } from "@/components/employee-row-actions";
import { getCountryName } from "@/lib/countries";
import { formatSalary } from "@/lib/money";
import type { SerializedEmployee } from "@/lib/serialize";

interface Props {
  employees: SerializedEmployee[];
}

const employmentLabel: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
};

export function EmployeesTable({ employees }: Props) {
  if (employees.length === 0) {
    return (
      <div className="rounded-md border bg-muted/30 p-10 text-center text-sm text-muted-foreground">
        No employees match the current filters.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[220px]">Name</TableHead>
            <TableHead>Job title</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Country</TableHead>
            <TableHead className="text-right">Salary</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Hired</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((e) => (
            <TableRow key={e.id}>
              <TableCell>
                <div className="font-medium">{e.fullName}</div>
                <div className="text-xs text-muted-foreground">{e.email}</div>
              </TableCell>
              <TableCell>{e.jobTitle}</TableCell>
              <TableCell>{e.department}</TableCell>
              <TableCell>{getCountryName(e.country)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatSalary(e.salary, e.currency)}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {employmentLabel[e.employmentType] ?? e.employmentType}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {e.hireDate}
              </TableCell>
              <TableCell>
                <EmployeeRowActions employee={e} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
