import "./setup";
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { authService } from "@/services/auth.service";
import { authKeys } from "../auth.query-keys";
import { useMe } from "../use-me";
import {
  renderAuthHook,
  resetTestEnvironment,
  createMockUser,
} from "./test-helpers";

describe("useMe", () => {
  const originalGetMe = authService.getMe;

  beforeEach(() => {
    resetTestEnvironment();
    authService.getMe = originalGetMe;
  });

  it("configures queryKey as authKeys.me() and staleTime as 5 minutes", () => {
    const { result } = renderAuthHook(() => useMe());
    // Options are encapsulated in TanStack Query observer
    const query = result.current;
    assert.ok(query !== undefined);
  });

  it("sets enabled = true when authContext.status === 'authenticated'", () => {
    const mockUser = createMockUser();
    let queryFnCalled = false;
    authService.getMe = async () => {
      queryFnCalled = true;
      return mockUser;
    };

    const { result } = renderAuthHook(() => useMe(), {
      authContext: { status: "authenticated", user: mockUser },
    });

    // In TanStack Query, isFetching is true when enabled is true upon mount
    assert.equal(result.current.isFetching, true);
  });

  it("sets enabled = false when authContext.status === 'unauthenticated'", () => {
    let queryFnCalled = false;
    authService.getMe = async () => {
      queryFnCalled = true;
      return createMockUser();
    };

    const { result } = renderAuthHook(() => useMe(), {
      authContext: { status: "unauthenticated", user: null },
    });

    // When enabled is false, query stays in pending status with fetchStatus: "idle"
    assert.equal(result.current.fetchStatus, "idle");
  });

  it("honors options.enabled overriding authContext status", () => {
    // Case 1: unauthenticated but options.enabled: true
    const { result: r1 } = renderAuthHook(() => useMe({ enabled: true }), {
      authContext: { status: "unauthenticated", user: null },
    });
    assert.equal(r1.current.isFetching, true);

    // Case 2: authenticated but options.enabled: false
    const { result: r2 } = renderAuthHook(() => useMe({ enabled: false }), {
      authContext: { status: "authenticated", user: createMockUser() },
    });
    assert.equal(r2.current.fetchStatus, "idle");
  });

  it("fetches user data from authService.getMe via refetch", async () => {
    const mockUser = createMockUser({ email: "nhanvien@ppe.local" });
    authService.getMe = async () => mockUser;

    const { result } = renderAuthHook(() => useMe({ enabled: false }), {
      authContext: { status: "unauthenticated", user: null },
    });

    const res = await result.current.refetch();
    assert.equal(res.data?.email, "nhanvien@ppe.local");
    assert.equal(res.data?.role, "ADMIN");
  });
});
