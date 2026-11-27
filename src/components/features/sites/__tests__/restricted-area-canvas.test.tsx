import "@/hooks/auth/__tests__/setup";
import assert from "node:assert/strict";
import { test } from "node:test";
import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import type { RestrictedAreaPoint } from "@/types";
import { RestrictedAreaCanvas } from "../restricted-area-canvas";

test("ROI drawing starts empty and the box preset can be edited without adding a fifth vertex", () => {
  const dom = new JSDOM("<div id='root'></div>");
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    ResizeObserver: globalThis.ResizeObserver,
    IS_REACT_ACT_ENVIRONMENT: Reflect.get(globalThis, "IS_REACT_ACT_ENVIRONMENT"),
  };
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
    IS_REACT_ACT_ENVIRONMENT: true,
  });

  const container = dom.window.document.getElementById("root")!;
  const root = createRoot(container);
  let edited: RestrictedAreaPoint[] = [];

  function Editor() {
    const [points, setPoints] = useState<RestrictedAreaPoint[]>([]);
    return (
      <RestrictedAreaCanvas
        points={points}
        onChange={(next) => {
          edited = next;
          setPoints(next);
        }}
      />
    );
  }

  try {
    act(() => root.render(<Editor />));
    const drawing = container.querySelector("pattern")!.closest("svg")!.parentElement!;
    drawing.getBoundingClientRect = () => new dom.window.DOMRect(10, 20, 400, 200);
    const vertices = () => container.querySelectorAll<HTMLButtonElement>("button[aria-label^='Kéo điểm']");
    const command = (label: string) => {
      const button = Array.from(container.querySelectorAll("button")).find(
        (candidate) => candidate.textContent?.trim() === label,
      );
      assert.ok(button, `Expected ${label} button`);
      act(() => button.click());
    };
    const clickCanvas = (clientX: number, clientY: number) => {
      act(() => drawing.dispatchEvent(new dom.window.MouseEvent("click", {
        bubbles: true, clientX, clientY,
      })));
    };

    assert.equal(vertices().length, 0);
    clickCanvas(90, 80);
    assert.deepEqual(edited, [{ x: 0.2, y: 0.3 }]);
    command("Khung nhanh");
    assert.equal(vertices().length, 4);

    clickCanvas(200, 100);
    const vertex = vertices()[0];
    vertex.setPointerCapture = () => {};
    const pointer = (type: string, clientX: number, clientY: number) => {
      act(() => vertex.dispatchEvent(new dom.window.PointerEvent(type, {
        bubbles: true, pointerId: 1, clientX, clientY,
      })));
    };
    pointer("pointerdown", 110, 70);
    pointer("pointermove", 150, 90);
    pointer("pointerup", 150, 90);
    act(() => vertex.click());
    assert.equal(vertices().length, 4);
    assert.deepEqual(edited[0], { x: 0.35, y: 0.35 });

    command("Thêm điểm");
    act(() => vertex.click());
    assert.equal(vertices().length, 4);
    clickCanvas(70, 120);
    assert.equal(vertices().length, 5);
    command("Xong");
    clickCanvas(200, 120);
    assert.equal(vertices().length, 5);
    command("Bỏ điểm cuối");
    assert.equal(vertices().length, 4);
  } finally {
    act(() => root.unmount());
    Object.assign(globalThis, previous);
    dom.window.close();
  }
});
