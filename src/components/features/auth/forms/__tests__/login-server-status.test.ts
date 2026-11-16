import "@/hooks/auth/__tests__/setup";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ApiError } from "@/lib/axios";
import {
  isConnectionOrServerError,
  isLoginServerUnavailable,
} from "../login-server-status";

describe("login-server-status", () => {
  it("treats network errors (status 0) and 5xx responses as server connection failures", () => {
    assert.equal(
      isConnectionOrServerError(new ApiError(0, "NETWORK_ERROR", "Offline")),
      true,
    );
    assert.equal(
      isConnectionOrServerError(new ApiError(502, "BAD_GATEWAY", "Bad gateway")),
      true,
    );
    assert.equal(
      isConnectionOrServerError(new ApiError(400, "BAD_REQUEST", "Bad request")),
      false,
    );
    assert.equal(isConnectionOrServerError(null), false);
  });

  it("flags server unavailable when both or either public endpoint fails with connection/5xx error", () => {
    const networkErr = new ApiError(0, "NETWORK_ERROR", "ERR_CONNECTION_REFUSED");

    assert.equal(
      isLoginServerUnavailable({
        publicConfigError: networkErr,
        isPublicConfigError: true,
        maintenanceError: networkErr,
        isMaintenanceError: true,
        maintenanceEnabled: false,
      }),
      true,
    );

    assert.equal(
      isLoginServerUnavailable({
        publicConfigError: null,
        isPublicConfigError: false,
        maintenanceError: networkErr,
        isMaintenanceError: true,
        maintenanceEnabled: false,
      }),
      true,
    );

    assert.equal(
      isLoginServerUnavailable({
        publicConfigError: networkErr,
        isPublicConfigError: true,
        maintenanceError: null,
        isMaintenanceError: false,
        maintenanceEnabled: false,
      }),
      true,
    );
  });

  it("allows login during maintenance mode and clears offline state once queries recover", () => {
    const serviceUnavailableErr = new ApiError(503, "SYSTEM_MAINTENANCE", "Maintenance");

    assert.equal(
      isLoginServerUnavailable({
        publicConfigError: serviceUnavailableErr,
        isPublicConfigError: true,
        maintenanceError: null,
        isMaintenanceError: false,
        maintenanceEnabled: true,
      }),
      false,
    );

    assert.equal(
      isLoginServerUnavailable({
        publicConfigError: null,
        isPublicConfigError: false,
        maintenanceError: null,
        isMaintenanceError: false,
        maintenanceEnabled: false,
      }),
      false,
    );
  });
});

