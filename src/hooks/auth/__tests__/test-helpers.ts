/**
 * Test helpers, DOM polyfills and test harness for fe-ppe auth hooks.
 */

// 1. Ensure required environment variables exist so src/config/env.ts never throws
process.env.NEXT_PUBLIC_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:80/api/v1";
process.env.NEXT_PUBLIC_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
process.env.NEXT_PUBLIC_IDENTITY_URL =
  process.env.NEXT_PUBLIC_IDENTITY_URL || "http://localhost:9999/api/v1";

import React from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext, type AuthContextValue } from "@/contexts/AuthContext";
import { toast } from "@/lib/toast";
import { tokenStore } from "@/lib/token";
import { eventBus } from "@/lib/event-bus";
import type { MeDto } from "@/types";

// 2. Storage & Cookie Polyfills
const sessionStorageMap = new Map<string, string>();
export const mockSessionStorage = {
  getItem: (k: string) => sessionStorageMap.get(k) ?? null,
  setItem: (k: string, v: string) => sessionStorageMap.set(k, String(v)),
  removeItem: (k: string) => sessionStorageMap.delete(k),
  clear: () => sessionStorageMap.clear(),
  get length() {
    return sessionStorageMap.size;
  },
  key: (i: number) => Array.from(sessionStorageMap.keys())[i] ?? null,
};

const localStorageMap = new Map<string, string>();
export const mockLocalStorage = {
  getItem: (k: string) => localStorageMap.get(k) ?? null,
  setItem: (k: string, v: string) => localStorageMap.set(k, String(v)),
  removeItem: (k: string) => localStorageMap.delete(k),
  clear: () => localStorageMap.clear(),
  get length() {
    return localStorageMap.size;
  },
  key: (i: number) => Array.from(localStorageMap.keys())[i] ?? null,
};

const cookieMap = new Map<string, string>();
export const mockDocument = {
  get cookie() {
    return Array.from(cookieMap.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  },
  set cookie(val: string) {
    const [nameVal] = val.split(";");
    const eq = nameVal.indexOf("=");
    if (eq !== -1) {
      const k = nameVal.slice(0, eq).trim();
      const v = nameVal.slice(eq + 1).trim();
      if (val.includes("max-age=0")) {
        cookieMap.delete(k);
      } else {
        cookieMap.set(k, v);
      }
    }
  },
};

// Polyfill globals for Node
if (typeof globalThis.window === "undefined") {
  (globalThis as unknown as { window: unknown }).window = globalThis;
}
(globalThis as unknown as { sessionStorage: unknown }).sessionStorage = mockSessionStorage;
(globalThis as unknown as { localStorage: unknown }).localStorage = mockLocalStorage;
if (typeof globalThis.document === "undefined") {
  (globalThis as unknown as { document: unknown }).document = mockDocument;
}

// 3. Spy trackers for toast & eventBus
export const toastCalls = {
  success: [] as string[],
  error: [] as string[],
  loading: [] as string[],
  reset() {
    this.success = [];
    this.error = [];
    this.loading = [];
  },
};

toast.success = (msg: string) => {
  toastCalls.success.push(msg);
  return "";
};
toast.error = (msg: string) => {
  toastCalls.error.push(msg);
  return "";
};
toast.loading = (msg: string) => {
  toastCalls.loading.push(msg);
  return "";
};

export const eventBusCalls = {
  emitted: [] as string[],
  reset() {
    this.emitted = [];
  },
};

const originalEmit = eventBus.emit.bind(eventBus);
eventBus.emit = ((event: any) => {
  eventBusCalls.emitted.push(event);
  return originalEmit(event);
}) as typeof eventBus.emit;

// 4. Sample Mock User
export function createMockUser(overrides: Partial<MeDto> = {}): MeDto {
  return {
    id: "user-123",
    email: "test@example.com",
    fullName: "Nguyễn Văn A",
    avatarUrl: null,
    phoneNumber: "0901234567",
    role: "ADMIN",
    roleId: "role-1",
    permissions: ["AUTH_READ", "AUTH_WRITE"],
    isActive: true,
    twoFactorEnabled: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// 5. QueryClient Factory
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
}

// 6. Hook Test Harness
export interface RenderAuthHookOptions {
  queryClient?: QueryClient;
  authContext?: Partial<AuthContextValue>;
}

export function renderAuthHook<T>(
  hookFn: () => T,
  options?: RenderAuthHookOptions,
) {
  const queryClient = options?.queryClient ?? createTestQueryClient();
  let result!: T;

  let currentUser: MeDto | null = options?.authContext?.user ?? null;

  const authValue: AuthContextValue = {
    user: currentUser,
    status: options?.authContext?.status ?? (currentUser ? "authenticated" : "unauthenticated"),
    setUser: (u: MeDto | null) => {
      currentUser = u;
      authValue.user = currentUser;
      options?.authContext?.setUser?.(u);
    },
    logout: async () => {},
    ...options?.authContext,
  };

  function TestComponent() {
    result = hookFn();
    return null;
  }

  renderToString(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(
        AuthContext.Provider,
        { value: authValue },
        React.createElement(TestComponent),
      ),
    ),
  );

  return {
    result: { current: result },
    queryClient,
    authContext: authValue,
  };
}

// 7. Reset all mocks and storage between tests
export function resetTestEnvironment() {
  sessionStorageMap.clear();
  localStorageMap.clear();
  cookieMap.clear();
  toastCalls.reset();
  eventBusCalls.reset();
  tokenStore.clear();
}
