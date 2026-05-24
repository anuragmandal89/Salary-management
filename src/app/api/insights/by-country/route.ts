import { NextResponse } from "next/server";
import { getByCountry } from "@/lib/insights";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ items: await getByCountry() });
}
