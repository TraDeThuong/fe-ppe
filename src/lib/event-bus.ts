/**
 * Event bus nội bộ — cầu nối giữa tầng network (axios interceptor, ngoài React)
 * và tầng state (AuthProvider). Dùng EventTarget native nên hoạt động cả
 * ở browser lẫn Node (test script), không cần window.
 */
type EventMap = {
  "auth:session-expired": void;
};

class EventBus {
  private readonly target = new EventTarget();

  on<K extends keyof EventMap>(event: K, handler: () => void): () => void {
    this.target.addEventListener(event, handler);
    return () => this.target.removeEventListener(event, handler);
  }

  emit<K extends keyof EventMap>(event: K): void {
    this.target.dispatchEvent(new Event(event));
  }
}

export const eventBus = new EventBus();
