import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { throttle } from "../throttle";

describe("throttle", () => {
  it("gọi ngay lần đầu và gom các lần sau thành 1 lần trailing", () => {
    mock.timers.enable({ apis: ["setTimeout", "Date"] });
    try {
      const calls: number[] = [];
      const fn = throttle((n: number) => calls.push(n), 5000);
      fn(1);
      fn(2);
      fn(3);
      fn(4);
      assert.deepEqual(calls, [1]);
      mock.timers.tick(5000);
      assert.deepEqual(calls, [1, 4]);
      mock.timers.tick(10_000);
      assert.deepEqual(calls, [1, 4]);
    } finally {
      mock.timers.reset();
    }
  });

  it("cancel hủy lần trailing đang chờ", () => {
    mock.timers.enable({ apis: ["setTimeout", "Date"] });
    try {
      const calls: number[] = [];
      const fn = throttle((n: number) => calls.push(n), 1000);
      fn(1);
      fn(2);
      fn.cancel();
      mock.timers.tick(2000);
      assert.deepEqual(calls, [1]);
    } finally {
      mock.timers.reset();
    }
  });
});
