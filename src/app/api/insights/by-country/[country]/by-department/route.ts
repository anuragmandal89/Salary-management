import { NextResponse } from "next/server";
import { getByDepartmentInCountry } from "@/lib/insights";
import { notFound } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ country: string }>;
}

export async function GET(_req: Request, ctx: Ctx) {
  const { country } = await ctx.params;
  const result = await getByDepartmentInCountry(country.toUpperCase());
  if (!result) return notFound("country");
  return NextResponse.json(result);
}
