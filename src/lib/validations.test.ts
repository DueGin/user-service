import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createAppSchema, updateAppSchema } from "./validations";

describe("application validations", () => {
  it("requires at least one administrator when creating an application", () => {
    const result = createAppSchema.safeParse({
      name: "system-a",
      allowedOrigins: [],
      adminUserIds: [],
    });

    assert.equal(result.success, false);
  });

  it("accepts multiple administrators when creating an application", () => {
    const result = createAppSchema.safeParse({
      name: "system-a",
      allowedOrigins: [],
      adminUserIds: ["user-a", "user-b"],
    });

    assert.equal(result.success, true);
  });

  it("accepts a supported application access mode when creating an application", () => {
    const result = createAppSchema.safeParse({
      name: "system-a",
      allowedOrigins: [],
      adminUserIds: ["user-a"],
      accessMode: "ADMINS_ONLY",
    });

    assert.equal(result.success, true);
  });

  it("rejects unsupported application access modes", () => {
    const result = updateAppSchema.safeParse({
      accessMode: "PRIVATE_BETA",
    });

    assert.equal(result.success, false);
  });

  it("requires at least one administrator when replacing managers on an active application", () => {
    const result = updateAppSchema.safeParse({
      status: "ACTIVE",
      adminUserIds: [],
    });

    assert.equal(result.success, false);
  });
});
