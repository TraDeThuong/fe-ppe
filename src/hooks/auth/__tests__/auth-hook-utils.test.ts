import "./setup";
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { ApiError } from "@/lib/axios";
import { ErrorCode } from "@/types";
import { shouldToastError, handleMutationError } from "../auth-hook-utils";
import { resetTestEnvironment, toastCalls } from "./test-helpers";

describe("auth-hook-utils", () => {
  beforeEach(() => {
    resetTestEnvironment();
  });

  describe("shouldToastError", () => {
    it("returns false when suppressToast is true", () => {
      const err = new ApiError(400, "BAD_REQUEST", "Bad request");
      assert.equal(shouldToastError(err, true), false);
    });

    it("returns false for status 0 (network loss - already handled by Axios interceptor)", () => {
      const err = new ApiError(0, "NETWORK_ERROR", "Network disconnected");
      assert.equal(shouldToastError(err), false);
    });

    it("returns false for server errors (status >= 500)", () => {
      assert.equal(shouldToastError(new ApiError(500, "INTERNAL_ERROR", "Server error")), false);
      assert.equal(shouldToastError(new ApiError(502, "BAD_GATEWAY", "Bad gateway")), false);
      assert.equal(shouldToastError(new ApiError(503, "UNAVAILABLE", "Service unavailable")), false);
    });

    it("returns false for 429 RATE_LIMIT_EXCEEDED (handled globally by interceptor)", () => {
      const err = new ApiError(429, ErrorCode.RATE_LIMIT_EXCEEDED, "Rate limit reached");
      assert.equal(shouldToastError(err), false);
    });

    it("returns true for 429 with different error code", () => {
      const err = new ApiError(429, "CUSTOM_429", "Custom rate limit");
      assert.equal(shouldToastError(err), true);
    });

    it("returns false for 422 VALIDATION_ERROR (handled inline by form components)", () => {
      const err1 = new ApiError(422, "SOME_VALIDATION", "Invalid form field");
      assert.equal(shouldToastError(err1), false);

      const err2 = new ApiError(400, ErrorCode.VALIDATION_ERROR, "Invalid form field");
      assert.equal(shouldToastError(err2), false);
    });

    it("returns true for client business errors (401, 403, 404, 409, 423)", () => {
      assert.equal(shouldToastError(new ApiError(401, ErrorCode.INVALID_CREDENTIALS, "Wrong password")), true);
      assert.equal(shouldToastError(new ApiError(403, ErrorCode.USER_INACTIVE, "User inactive")), true);
      assert.equal(shouldToastError(new ApiError(404, ErrorCode.NOT_FOUND, "Not found")), true);
      assert.equal(shouldToastError(new ApiError(409, ErrorCode.DUPLICATE_ENTRY, "Duplicate")), true);
      assert.equal(shouldToastError(new ApiError(423, ErrorCode.ACCOUNT_LOCKED, "Locked")), true);
    });

    it("returns true for standard JS Error", () => {
      assert.equal(shouldToastError(new Error("Generic JS error")), true);
    });

    it("returns true for unknown non-Error types (string, number, object)", () => {
      assert.equal(shouldToastError("Something failed"), true);
      assert.equal(shouldToastError({ custom: "error" }), true);
    });
  });

  describe("handleMutationError", () => {
    it("does not call toast when shouldToastError returns false", () => {
      const serverErr = new ApiError(500, "SERVER_ERROR", "Internal Server Error");
      handleMutationError(serverErr);
      assert.equal(toastCalls.error.length, 0);

      const clientErr = new ApiError(400, "BAD_REQUEST", "Bad request");
      handleMutationError(clientErr, true); // suppressToast = true
      assert.equal(toastCalls.error.length, 0);
    });

    it("calls toast.error with ApiError message when message is present", () => {
      const err = new ApiError(401, ErrorCode.INVALID_CREDENTIALS, "Mật khẩu không chính xác.");
      handleMutationError(err);
      assert.equal(toastCalls.error.length, 1);
      assert.equal(toastCalls.error[0], "Mật khẩu không chính xác.");
    });

    it("calls toast.error with fallback message when ApiError message is empty", () => {
      const err = new ApiError(401, ErrorCode.INVALID_CREDENTIALS, "");
      handleMutationError(err);
      assert.equal(toastCalls.error.length, 1);
      assert.equal(toastCalls.error[0], "Đã xảy ra lỗi trong quá trình xử lý.");
    });

    it("calls toast.error with Error.message for standard JS Error", () => {
      const err = new Error("Lỗi kết nối bộ nhớ.");
      handleMutationError(err);
      assert.equal(toastCalls.error.length, 1);
      assert.equal(toastCalls.error[0], "Lỗi kết nối bộ nhớ.");
    });

    it("calls toast.error with fallback for standard JS Error without message", () => {
      const err = new Error("");
      handleMutationError(err);
      assert.equal(toastCalls.error.length, 1);
      assert.equal(toastCalls.error[0], "Đã xảy ra lỗi không xác định.");
    });

    it("calls toast.error with generic fallback for unknown error types", () => {
      handleMutationError("Unexpected string error");
      assert.equal(toastCalls.error.length, 1);
      assert.equal(toastCalls.error[0], "Đã xảy ra lỗi. Vui lòng thử lại.");
    });
  });
});
