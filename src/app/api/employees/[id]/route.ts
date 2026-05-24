import { NextRequest, NextResponse } from "next/server";
import { employeeUpdateSchema } from "@/lib/validation";
import {
  deleteEmployee,
  getEmployee,
  updateEmployee,
} from "@/lib/employees-service";
import { serializeEmployee } from "@/lib/serialize";
import {
  badRequest,
  conflict,
  notFound,
  validationError,
} from "@/lib/api-errors";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

async function resolveId(ctx: Ctx): Promise<number | null> {
  const { id } = await ctx.params;
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(_request: NextRequest, ctx: Ctx) {
  const id = await resolveId(ctx);
  if (id === null) return badRequest("Invalid employee id");

  const employee = await getEmployee(id);
  if (!employee) return notFound("employee");
  return NextResponse.json(serializeEmployee(employee));
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const id = await resolveId(ctx);
  if (id === null) return badRequest("Invalid employee id");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = employeeUpdateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const updated = await updateEmployee(id, parsed.data);
    if (!updated) return notFound("employee");
    return NextResponse.json(serializeEmployee(updated));
  } catch (err) {
    if (err instanceof Error && /UNIQUE constraint failed/i.test(err.message)) {
      return conflict("An employee with this email already exists");
    }
    throw err;
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const id = await resolveId(ctx);
  if (id === null) return badRequest("Invalid employee id");

  const deleted = await deleteEmployee(id);
  if (!deleted) return notFound("employee");
  return new NextResponse(null, { status: 204 });
}
