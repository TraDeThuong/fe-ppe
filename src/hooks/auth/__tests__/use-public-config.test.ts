import "./setup";
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { authService } from "@/services/auth.service";
import { ApiError } from "@/lib/axios";
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

  it("exposes network error status and recovers when backend comes back online", async () => {
    const mockConfig: SystemPublicConfig = {
      "app.name": "PPE Monitoring",
      "app.locale": "vi-VN",
      "feature.registration.enabled": true,
      "feature.social_login.enabled": false,
    };

    let offline = true;
    authService.getPublicConfig = async () => {
      if (offline) {
        throw new ApiError(0, "NETWORK_ERROR", "ERR_CONNECTION_REFUSED");
      }
      return mockConfig;
    };

    const { result } = renderAuthHook(() => usePublicConfig({ enabled: false }));

    const failed = await result.current.refetch();
    assert.equal(failed.isError, true);
    assert.equal(failed.error?.status, 0);

    offline = false;
    const recovered = await result.current.refetch();
    assert.equal(recovered.isError, false);
    assert.equal(recovered.data?.["app.name"], "PPE Monitoring");
  });
});
