import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canManageApplicationMembersFromContext,
  resolveApplicationAccess,
} from "./application-access-policy";

describe("application access policy", () => {
  it("does not let platform admins manage application members by role alone", () => {
    assert.equal(
      canManageApplicationMembersFromContext(
        { isAdmin: true, managedApplications: [] },
        "app-a"
      ),
      false
    );
  });

  it("allows an assigned active application manager to manage members", () => {
    assert.equal(
      canManageApplicationMembersFromContext(
        {
          isAdmin: false,
          managedApplications: [{ id: "app-a", name: "system-a", status: "ACTIVE" }],
        },
        "app-a"
      ),
      true
    );
  });

  it("requires role-overlap accounts to be assigned to the target application", () => {
    assert.equal(
      canManageApplicationMembersFromContext(
        {
          isAdmin: true,
          managedApplications: [{ id: "app-b", name: "system-b", status: "ACTIVE" }],
        },
        "app-a"
      ),
      false
    );
  });

  it("rejects disabled memberships regardless of access mode", () => {
    const result = resolveApplicationAccess({
      accessMode: "ADMINS_ONLY",
      existingStatus: "DISABLED",
      isManager: true,
    });

    assert.equal(result.action, "deny");
    assert.equal(result.status, 403);
  });

  it("creates a membership for missing users in open applications", () => {
    assert.equal(
      resolveApplicationAccess({
        accessMode: "OPEN",
        existingStatus: null,
        isManager: false,
      }).action,
      "create"
    );
  });

  it("denies missing users in members-only applications", () => {
    const result = resolveApplicationAccess({
      accessMode: "MEMBERS_ONLY",
      existingStatus: null,
      isManager: false,
    });

    assert.equal(result.action, "deny");
    assert.equal(result.status, 403);
  });

  it("allows application managers in admin-only applications without creating membership", () => {
    assert.equal(
      resolveApplicationAccess({
        accessMode: "ADMINS_ONLY",
        existingStatus: null,
        isManager: true,
      }).action,
      "allow"
    );
  });

  it("denies non-managers in admin-only applications even with active membership", () => {
    const result = resolveApplicationAccess({
      accessMode: "ADMINS_ONLY",
      existingStatus: "ACTIVE",
      isManager: false,
    });

    assert.equal(result.action, "deny");
    assert.equal(result.status, 403);
  });
});
