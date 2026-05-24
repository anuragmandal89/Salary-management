import { NextRequest, NextResponse } from "next/server";
import { getSalaryDistribution } from "@/lib/insights";
import { badRequest, notFound } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ country: string }>;
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const { country } = await ctx.params;

  const bucketsParam = req.nextUrl.searchParams.get("buckets");
  const bucketCount = bucketsParam ? Number(bucketsParam) : 10;
  if (!Number.isInteger(bucketCount) || bucketCount < 2 || bucketCount > 40) {
    return badRequest("`buckets` must be an integer between 2 and 40");
  }

  const result = await getSalaryDistribution(
    country.toUpperCase(),
    bucketCount
  );
  if (!result) return notFound("country");
  return NextResponse.json(result);
}
