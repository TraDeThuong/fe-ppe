export interface ActionLockRef {
  current: boolean;
}

/**
 * Chiếm khóa thực thi đồng bộ nhằm ngăn double-submit hoặc double-click
 * trong khoảng thời gian trước khi React commit state `disabled`.
 */
export function tryAcquireActionLock(lockRef: ActionLockRef, blocked: boolean): boolean {
  if (blocked || lockRef.current) return false;
  lockRef.current = true;
  return true;
}

/**
 * Giải phóng khóa thực thi sau khi thao tác thất bại để cho phép thử lại.
 */
export function releaseActionLock(lockRef: ActionLockRef): void {
  lockRef.current = false;
}

