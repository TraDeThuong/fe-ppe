import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { RoleDto } from "@/types";
import { getRoleKnowledgeProfile } from "../role-guide-data";

function getCapabilities(permissions: string[], name = "CUSTOM_ROLE") {
  const role: RoleDto = {
    id: "r-1",
    name,
    description: null,
    isSystem: false,
    userCount: 0,
    permissions: permissions.map((permission) => ({
      id: permission,
      name: permission,
      description: null,
      resource: "TEST",
      action: "TEST",
      isSystem: false,
      createdAt: "",
      updatedAt: "",
    })),
    createdAt: "",
    updatedAt: "",
  };

  return new Map(
    getRoleKnowledgeProfile(role, "vi-VN").pageCapabilities.map((page) => [
      page.route,
      page.accessLevel,
    ]),
  );
}

describe("role guide route capabilities", () => {
  it("requires route access before classifying manage or review permissions", () => {
    const denied = getCapabilities(["PPE_REPORTING_EXPORT", "PPE_INCIDENT_REVIEW"]);
    assert.equal(denied.get("/dashboard"), "read");
    assert.equal(denied.get("/reports"), "none");
    assert.equal(denied.get("/incidents"), "none");

    const allowed = getCapabilities([
      "PPE_REPORTING_READ",
      "PPE_REPORTING_EXPORT",
      "PPE_INCIDENT_READ",
      "PPE_INCIDENT_REVIEW",
    ]);
    assert.equal(allowed.get("/reports"), "manage");
    assert.equal(allowed.get("/incidents"), "review");
  });

  it("keeps system, scheduled tasks, and integration permissions independent", () => {
    const system = getCapabilities(["SYSTEM_CONFIG_READ", "CRON_JOB_MANAGE"]);
    assert.equal(system.get("/system"), "read");
    assert.equal(system.get("/scheduled-tasks"), "none");
    assert.equal(system.get("/integrations"), "none");

    const integrations = getCapabilities(["WEBHOOK_READ", "CRON_JOB_READ", "CRON_JOB_MANAGE"]);
    assert.equal(integrations.get("/system"), "none");
    assert.equal(integrations.get("/integrations"), "read");
    assert.equal(integrations.get("/scheduled-tasks"), "manage");

    assert.equal(getCapabilities(["API_KEY_READ", "API_KEY_MANAGE"]).get("/integrations"), "manage");
    assert.equal(getCapabilities(["WEBHOOK_MANAGE"]).get("/integrations"), "none");
  });

  it("uses the same admin role names as the navigation guard", () => {
    for (const name of ["ADMIN", "SUPER_ADMIN"]) {
      assert.ok([...getCapabilities([], name).values()].every((level) => level === "full"));
    }
    assert.equal(getCapabilities([], "admin").get("/reports"), "none");
  });
});
