import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { ConsoleRefreshButton, RefreshIconButton } from "@/components/ui/refresh-action";

function mountDom(element: React.ReactElement) {
  const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>");
  const prevWindow = globalThis.window;
  const prevDocument = globalThis.document;
  (globalThis as unknown as { window: Window }).window = dom.window as unknown as Window;
  (globalThis as unknown as { document: Document }).document = dom.window.document;
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  const container = dom.window.document.getElementById("root")!;
  const root = createRoot(container);
  act(() => {
    root.render(element);
  });

  return {
    container,
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      (globalThis as unknown as { window: Window }).window = prevWindow;
      (globalThis as unknown as { document: Document }).document = prevDocument;
      dom.window.close();
    },
  };
}

describe("Refresh feedback UI components", () => {
  it("ConsoleRefreshButton spins for at least minSpinMs then shows Updated + timestamp", async () => {
    let calls = 0;
    const mounted = mountDom(
      <ConsoleRefreshButton
        onRefresh={async () => {
          calls += 1;
        }}
        subtitle="Hồ sơ sự cố"
      />,
    );

    try {
      const btn = mounted.container.querySelector("button")!;
      assert.ok(btn);
      assert.match(btn.textContent || "", /Làm mới/);

      act(() => {
        btn.click();
      });

      assert.equal(calls, 1);
      assert.equal(btn.disabled, true);
      assert.match(btn.textContent || "", /Đang đồng bộ/);

      // Wait past 450ms minimum spin duration
      await act(async () => {
        await new Promise((r) => setTimeout(r, 520));
      });

      assert.equal(btn.disabled, false);
      assert.match(btn.textContent || "", /Đã cập nhật/);
      assert.match(btn.textContent || "", /Cập nhật \d{2}:\d{2}:\d{2}/);
    } finally {
      mounted.cleanup();
    }
  });

  it("RefreshIconButton transitions to emerald success tooltip after refresh", async () => {
    let calls = 0;
    const mounted = mountDom(
      <RefreshIconButton
        onRefresh={() => {
          calls += 1;
        }}
        title="Làm mới dữ liệu"
      />,
    );

    try {
      const btn = mounted.container.querySelector("button")!;
      assert.equal(btn.getAttribute("title"), "Làm mới dữ liệu");

      act(() => {
        btn.click();
      });

      assert.equal(calls, 1);
      assert.equal(btn.disabled, true);

      await act(async () => {
        await new Promise((r) => setTimeout(r, 520));
      });

      assert.equal(btn.disabled, false);
      assert.match(btn.getAttribute("title") || "", /Đã cập nhật/);
      assert.match(btn.className, /emerald-500/);
    } finally {
      mounted.cleanup();
    }
  });
});
