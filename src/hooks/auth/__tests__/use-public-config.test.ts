import "./setup";
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { authService } from "@/services/auth.service";
import { usePublicConfig } from "../use-public-config";
import { renderAuthHook, resetTestEnvironment } from "./test-helpers";
import type { SystemPublicConfig } from "@/types";

describe("usePublicConfig", () => {
  const originalGetConfig = authService.getPublicConfig;

  beforeEach(() => {
    resetTestEnvironment();
    authService.getPublicConfig = originalGetConfig;
  });

  it("queries public config with authService.getPublicConfig", async () => {
    const mockConfig: SystemPublicConfig = {
      "app.name": "PPE Monitoring",
      "app.locale": "vi-VN",
      "feature.registration.enabled": true,
      "feature.social_login.enabled": true,
    };

    authService.getPublicConfig = async () => mockConfig;

    const { result } = renderAuthHook(() => usePublicConfig({ enabled: false }));

    const res = await result.current.refetch();
    assert.equal(res.data?.["app.name"], "PPE Monitoring");
    assert.equal(res.data?.["feature.registration.enabled"], true);
  });
});
