import "./setup";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as authExports from "../index";

describe("auth hooks barrel export (index.ts)", () => {
  const expectedHooks = [
    "useMe",
    "useSessions",
    "useSocialAccounts",
    "usePublicConfig",
    "useGoogleUrl",
    "useLogin",
    "useGoogleLogin",
    "useLogout",
    "useRegister",
    "useVerifyEmail",
    "useResendVerification",
    "useForgotPassword",
    "useResetPassword",
    "useChangePassword",
    "useSetup2FA",
    "useEnable2FA",
    "useVerify2FA",
    "useDisable2FA",
    "useRegenerateBackupCodes",
    "useLinkSocial",
    "useUnlinkSocial",
    "useRevokeSession",
    "useRevokeOtherSessions",
    "useUpdateProfile",
    "useAvatarUpload",
    "useRequestDeactivate",
    "useConfirmDeactivate",
  ] as const;

  it("exports all 27 hooks as valid functions", () => {
    for (const hookName of expectedHooks) {
      const hookFn = (authExports as Record<string, unknown>)[hookName];
      assert.equal(
        typeof hookFn,
        "function",
        `Export ${hookName} must be a callable function`,
      );
    }
  });

  it("exports authKeys factory and error utilities", () => {
    assert.equal(typeof authExports.authKeys, "object");
    assert.equal(typeof authExports.authKeys.me, "function");
    assert.equal(typeof authExports.shouldToastError, "function");
    assert.equal(typeof authExports.handleMutationError, "function");
  });
});
