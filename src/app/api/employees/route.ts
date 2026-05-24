import { NextRequest, NextResponse } from "next/server";
import {
  employeeCreateSchema,
  employeeListQuerySchema,
} from "@/lib/validation";
import { createEmployee, listEmployees } from "@/lib/employees-service";
import { serializeEmployee } from "@/lib/serialize";
import { conflict, validationError } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = employeeListQuerySchema.safeParse(raw);
  if (!parsed.success) return validationError(parsed.error);

  const result = await listEmployees(parsed.data);
  return NextResponse.json({
    items: result.items.map(serializeEmployee),
    page: result.page,
    pageSize: result.pageSize,
    total: result.total,
  });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "bad_request", message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = employeeCreateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const created = await createEmployee(parsed.data);
    return NextResponse.json(serializeEmployee(created), { status: 201 });
  } catch (err) {
    if (err instanceof Error && /UNIQUE constraint failed/i.test(err.message)) {
      return conflict("An employee with this email already exists");
    }
    throw err;
  }
}
