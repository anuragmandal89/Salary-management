import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function validationError(error: ZodError): NextResponse {
  return NextResponse.json(
    {
      error: "validation_error",
      issues: error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    },
    { status: 400 }
  );
}

export function notFound(resource = "resource"): NextResponse {
  return NextResponse.json(
    { error: "not_found", message: `${resource} not found` },
    { status: 404 }
  );
}

export function conflict(message: string): NextResponse {
  return NextResponse.json({ error: "conflict", message }, { status: 409 });
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: "bad_request", message }, { status: 400 });
}
