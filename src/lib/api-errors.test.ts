import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  badRequest,
  conflict,
  notFound,
  validationError,
} from "./api-errors";

const tinySchema = z.object({
  name: z.string().min(1),
  age: z.number().int().positive(),
});

describe("api-errors", () => {
  it("notFound returns 404 with structured body", async () => {
    const res = notFound("employee");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: "not_found", message: "employee not found" });
  });

  it("badRequest returns 400", async () => {
    const res = badRequest("Bad id");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("bad_request");
    expect(body.message).toBe("Bad id");
  });

  it("conflict returns 409", async () => {
    const res = conflict("Email taken");
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("conflict");
  });

  it("validationError translates zod issues into path+message pairs", async () => {
    const result = tinySchema.safeParse({ name: "", age: -1 });
    expect(result.success).toBe(false);
    const res = validationError(result.error!);
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      error: string;
      issues: { path: string; message: string }[];
    };
    expect(body.error).toBe("validation_error");
    const paths = body.issues.map((i) => i.path).sort();
    expect(paths).toEqual(["age", "name"]);
  });
});
