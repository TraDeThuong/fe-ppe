import { after, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clearLoginPersistence,
  deleteCookie,
  hasStaleSessionTrace,
  LAST_ACTIVE_KEY,
  REMEMBER_ME_KEY,
  SESSION_ACTIVE_KEY,
  setCookie,
  setLoginPersistence,
  shouldRestoreSession,
} from "../session-manager";

function createStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
}

function createDocumentMock() {
  const cookies = new Map<string, string>();
  const writes: string[] = [];
  return {
    writes,
    clear: () => {
      cookies.clear();
      writes.length = 0;
    },
    get cookie() {
      return Array.from(cookies.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join("; ");
    },
    set cookie(raw: string) {
      writes.push(raw);
      const [pair] = raw.split(";");
      const eqIdx = pair.indexOf("=");
      if (eqIdx === -1) return;
      const name = pair.slice(0, eqIdx).trim();
      const value = pair.slice(eqIdx + 1).trim();
      if (raw.includes("max-age=0")) {
        cookies.delete(name);
      } else {
        cookies.set(name, value);
      }
    },
  };
}

describe("session-manager", () => {
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;
  const originalSessionStorage = globalThis.sessionStorage;
  const originalDocument = globalThis.document;

  const localStorageMock = createStorageMock();
  const sessionStorageMock = createStorageMock();
  const documentMock = createDocumentMock();
  const windowMock: { location?: { protocol: string } } = {
    location: { protocol: "http:" },
  };

  beforeEach(() => {
    localStorageMock.clear();
    sessionStorageMock.clear();
    documentMock.clear();
    windowMock.location = { protocol: "http:" };

    Object.defineProperty(globalThis, "window", {
      value: windowMock,
      configurable: true,
    });
    Object.defineProperty(globalThis, "localStorage", {
      value: localStorageMock,
      configurable: true,
    });
    Object.defineProperty(globalThis, "sessionStorage", {
      value: sessionStorageMock,
      configurable: true,
    });
    Object.defineProperty(globalThis, "document", {
      value: documentMock,
      configurable: true,
    });
  });

  after(() => {
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
    });
    Object.defineProperty(globalThis, "localStorage", {
      value: originalLocalStorage,
      configurable: true,
    });
    Object.defineProperty(globalThis, "sessionStorage", {
      value: originalSessionStorage,
      configurable: true,
    });
    Object.defineProperty(globalThis, "document", {
      value: originalDocument,
      configurable: true,
    });
  });

  it("reports no session trace and does not restore for an unauthenticated guest", () => {
    assert.equal(shouldRestoreSession(), false);
    assert.equal(hasStaleSessionTrace(), false);
  });

  it("detects stale trace for expired non-remembered session and clears cleanly", () => {
    setLoginPersistence(false);
    assert.equal(shouldRestoreSession(), true);
    assert.equal(hasStaleSessionTrace(), true);

    // Giả lập đóng tab và quay lại sau khi quá 30s inactivity timeout
    sessionStorageMock.removeItem(SESSION_ACTIVE_KEY);
    localStorageMock.setItem(LAST_ACTIVE_KEY, String(Date.now() - 60_000));

    assert.equal(shouldRestoreSession(), false);
    assert.equal(hasStaleSessionTrace(), true);

    clearLoginPersistence();
    assert.equal(hasStaleSessionTrace(), false);
  });

  it("detects trace when only remember-me flag remains and clears cleanly", () => {
    setLoginPersistence(true, "safety@example.com");
    assert.equal(shouldRestoreSession(), true);
    assert.equal(hasStaleSessionTrace(), true);

    localStorageMock.removeItem(REMEMBER_ME_KEY);
    // Cookie ppe_remember_me vẫn còn → vẫn coi là có dấu vết phiên
    assert.equal(shouldRestoreSession(), true);
    assert.equal(hasStaleSessionTrace(), true);

    clearLoginPersistence();
    assert.equal(shouldRestoreSession(), false);
    assert.equal(hasStaleSessionTrace(), false);
  });

  it("appends ; Secure to setCookie, setLoginPersistence, and deleteCookie on HTTPS", () => {
    windowMock.location = { protocol: "https:" };

    setCookie("ppe_theme", "dark", 31536000);
    setLoginPersistence(true, "admin@example.com");
    setLoginPersistence(false);
    deleteCookie(REMEMBER_ME_KEY);

    assert.equal(
      documentMock.writes[0],
      "ppe_theme=dark; path=/; SameSite=Lax; max-age=31536000; Secure",
    );

    const rememberWrite = documentMock.writes.find((entry) =>
      entry.startsWith(`${REMEMBER_ME_KEY}=1;`),
    );
    assert.ok(rememberWrite);
    assert.match(rememberWrite, /; SameSite=Lax/);
    assert.match(rememberWrite, /; max-age=604800/);
    assert.match(rememberWrite, /; Secure$/);

    const sessionWrite = documentMock.writes.find((entry) =>
      entry.startsWith(`${SESSION_ACTIVE_KEY}=1;`),
    );
    assert.equal(
      sessionWrite,
      `${SESSION_ACTIVE_KEY}=1; path=/; SameSite=Lax; Secure`,
    );

    const deleteWrite = documentMock.writes.at(-1);
    assert.equal(
      deleteWrite,
      `${REMEMBER_ME_KEY}=; path=/; SameSite=Lax; max-age=0; Secure`,
    );
  });

  it("omits ; Secure on local HTTP (http://localhost) and handles missing window.location safely", () => {
    windowMock.location = { protocol: "http:" };
    setCookie(REMEMBER_ME_KEY, "1", 604800);
    deleteCookie(REMEMBER_ME_KEY);

    assert.equal(
      documentMock.writes[0],
      `${REMEMBER_ME_KEY}=1; path=/; SameSite=Lax; max-age=604800`,
    );
    assert.equal(
      documentMock.writes[1],
      `${REMEMBER_ME_KEY}=; path=/; SameSite=Lax; max-age=0`,
    );

    delete windowMock.location;
    setCookie(SESSION_ACTIVE_KEY, "1");
    assert.equal(
      documentMock.writes[2],
      `${SESSION_ACTIVE_KEY}=1; path=/; SameSite=Lax`,
    );
  });

  it("self-heals missing ppe_remember_me or ppe_session_active cookies when shouldRestoreSession succeeds", () => {
    // Trường hợp 1: localStorage còn ppe_remember_me="true" nhưng cookie bị mất
    localStorageMock.setItem(REMEMBER_ME_KEY, "true");
    assert.equal(shouldRestoreSession(), true);
    assert.ok(documentMock.cookie.includes(`${REMEMBER_ME_KEY}=1`));

    // Trường hợp 2: sessionStorage còn ppe_session_active="true" nhưng cookie bị mất
    localStorageMock.clear();
    documentMock.clear();
    sessionStorageMock.setItem(SESSION_ACTIVE_KEY, "true");
    assert.equal(shouldRestoreSession(), true);
    assert.ok(documentMock.cookie.includes(`${SESSION_ACTIVE_KEY}=1`));
  });
});

