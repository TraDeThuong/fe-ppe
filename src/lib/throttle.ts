export interface ThrottledFn<A extends unknown[]> {
  (...args: A): void;
  /** Hủy lần gọi trailing đang chờ (dùng khi unmount). */
  cancel: () => void;
}

/**
 * Throttle leading + trailing: gọi ngay lần đầu, các lần gọi tiếp theo trong `waitMs` được gom
 * thành đúng 1 lần gọi ở cuối cửa sổ (với tham số mới nhất).
 */
export function throttle<A extends unknown[]>(
  fn: (...args: A) => void,
  waitMs: number,
  now: () => number = Date.now,
): ThrottledFn<A> {
  let lastRun = Number.NEGATIVE_INFINITY;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: A | null = null;

  const run = (args: A) => {
    lastRun = now();
    fn(...args);
  };

  const throttled = ((...args: A) => {
    const remaining = waitMs - (now() - lastRun);
    if (remaining <= 0 && !timer) {
      run(args);
      return;
    }
    pendingArgs = args;
    if (!timer) {
      timer = setTimeout(() => {
        timer = null;
        const next = pendingArgs;
        pendingArgs = null;
        if (next) run(next);
      }, Math.max(0, remaining));
    }
  }) as ThrottledFn<A>;

  throttled.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    pendingArgs = null;
  };

  return throttled;
}
