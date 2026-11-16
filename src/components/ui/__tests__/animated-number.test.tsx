import "@/hooks/auth/__tests__/setup";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { JSDOM } from "jsdom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LocaleProvider } from "@/providers/locale-provider";
import { AnimatedMetricValue, AnimatedNumber } from "../animated-number";
import { BentoConsoleStats, StatsCard } from "../stats-cards";

function renderStatic(element: React.ReactElement): string {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <LocaleProvider>{element}</LocaleProvider>
    </QueryClientProvider>,
  );
}

describe("AnimatedNumber & AnimatedMetricValue", () => {
  it("renders exact target numbers on SSR for integers, decimals, and custom formatters", () => {
    const intHtml = renderStatic(<AnimatedNumber value={42} />);
    assert.equal(intHtml, "42");

    const decHtml = renderStatic(
      <AnimatedNumber value={93.2} decimals={1} suffix="%" />,
    );
    assert.equal(decHtml, "93.2%");

    const fmtHtml = renderStatic(
      <AnimatedNumber value={1250} format={(n) => n.toLocaleString("en-US")} />,
    );
    assert.equal(fmtHtml, "1,250");
  });

  it("renders exact SSR output for mixed formatted strings and wrapped React elements", () => {
    assert.equal(
      renderStatic(<AnimatedMetricValue value="93.2%" />),
      "93.2%",
    );
    assert.equal(
      renderStatic(<AnimatedMetricValue value="33,3%" />),
      "33,3%",
    );
    assert.equal(
      renderStatic(<AnimatedMetricValue value="102/125" />),
      "102/125",
    );
    assert.equal(
      renderStatic(<AnimatedMetricValue value="14.2K" />),
      "14.2K",
    );
    assert.equal(
      renderStatic(<AnimatedMetricValue value="1,250" />),
      "1,250",
    );
    assert.equal(
      renderStatic(<AnimatedMetricValue value="1.250" />),
      "1.250",
    );
    assert.equal(
      renderStatic(
        <AnimatedMetricValue
          value={<span data-testid="cron-kpi-total">12</span>}
        />,
      ),
      '<span data-testid="cron-kpi-total">12</span>',
    );
  });

  it("preserves placeholders, versions, dates, and timezone labels verbatim", () => {
    for (const raw of ["...", "—", "--%", "UTC+7", "v2.1.0", "2026-11-16", "< 100 ms"]) {
      assert.equal(
        renderStatic(<AnimatedMetricValue value={raw} />),
        raw.replace("<", "&lt;"),
      );
    }
  });

  it("animates from 0 up to target value across animation frames on client mount", () => {
    const dom = new JSDOM("<!doctype html><html><body></body></html>");
    const prevWindow = globalThis.window;
    const prevDocument = globalThis.document;
    const prevActEnv = (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT;

    Object.assign(globalThis, {
      window: dom.window,
      document: dom.window.document,
      IS_REACT_ACT_ENVIRONMENT: true,
    });

    const container = dom.window.document.createElement("div");
    dom.window.document.body.appendChild(container);

    let rafCounter = 0;
    const rafCallbacks = new Map<number, FrameRequestCallback>();
    const origRaf = globalThis.requestAnimationFrame;
    const origCancelRaf = globalThis.cancelAnimationFrame;
    const origNow = performance.now.bind(performance);
    let currentTime = 1000;

    globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
      const id = ++rafCounter;
      rafCallbacks.set(id, cb);
      return id;
    };
    globalThis.cancelAnimationFrame = (id: number) => {
      rafCallbacks.delete(id);
    };
    performance.now = () => currentTime;

    try {
      const root = createRoot(container);
      act(() => {
        root.render(<AnimatedNumber value={100} duration={500} />);
      });

      // Immediately after layout effect before rAF ticks, starts at 0
      assert.equal(container.textContent, "0");

      // Advance halfway through animation (250ms)
      act(() => {
        currentTime = 1250;
        const pending = Array.from(rafCallbacks.values());
        rafCallbacks.clear();
        pending.forEach((cb) => cb(currentTime));
      });
      const midValue = Number(container.textContent);
      assert.ok(midValue > 0 && midValue < 100, `Expected midValue between 0 and 100, got ${midValue}`);

      // Advance past completion (600ms)
      act(() => {
        currentTime = 1600;
        const pending = Array.from(rafCallbacks.values());
        rafCallbacks.clear();
        pending.forEach((cb) => cb(currentTime));
      });
      assert.equal(container.textContent, "100");

      act(() => {
        root.unmount();
      });
    } finally {
      globalThis.requestAnimationFrame = origRaf;
      globalThis.cancelAnimationFrame = origCancelRaf;
      performance.now = origNow;
      Object.assign(globalThis, {
        window: prevWindow,
        document: prevDocument,
        IS_REACT_ACT_ENVIRONMENT: prevActEnv,
      });
      dom.window.close();
    }
  });

  it("animates cleanly to exact target inside React StrictMode without getting stuck at 0", () => {
    const dom = new JSDOM("<!doctype html><html><body></body></html>");
    const prevWindow = globalThis.window;
    const prevDocument = globalThis.document;
    const prevActEnv = (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT;

    Object.assign(globalThis, {
      window: dom.window,
      document: dom.window.document,
      IS_REACT_ACT_ENVIRONMENT: true,
    });

    const container = dom.window.document.createElement("div");
    dom.window.document.body.appendChild(container);

    let rafCounter = 0;
    const rafCallbacks = new Map<number, FrameRequestCallback>();
    const origRaf = globalThis.requestAnimationFrame;
    const origCancelRaf = globalThis.cancelAnimationFrame;
    const origNow = performance.now.bind(performance);
    let currentTime = 2000;

    globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
      const id = ++rafCounter;
      rafCallbacks.set(id, cb);
      return id;
    };
    globalThis.cancelAnimationFrame = (id: number) => {
      rafCallbacks.delete(id);
    };
    performance.now = () => currentTime;

    try {
      const root = createRoot(container);
      act(() => {
        root.render(
          <React.StrictMode>
            <div data-testid="num">
              <AnimatedNumber value={42} duration={500} />
            </div>
            <div data-testid="str">
              <AnimatedMetricValue value="93.2%" duration={500} />
            </div>
          </React.StrictMode>,
        );
      });

      const numEl = container.querySelector('[data-testid="num"]')!;
      const strEl = container.querySelector('[data-testid="str"]')!;
      assert.equal(numEl.textContent, "0");
      assert.equal(strEl.textContent, "0.0%");

      // Mid-animation
      act(() => {
        currentTime = 2250;
        const pending = Array.from(rafCallbacks.values());
        rafCallbacks.clear();
        pending.forEach((cb) => cb(currentTime));
      });
      assert.ok(Number(numEl.textContent) > 0 && Number(numEl.textContent) < 42);
      assert.notEqual(strEl.textContent, "0.0%");

      // Completion
      act(() => {
        currentTime = 2600;
        const pending = Array.from(rafCallbacks.values());
        rafCallbacks.clear();
        pending.forEach((cb) => cb(currentTime));
      });
      assert.equal(numEl.textContent, "42");
      assert.equal(strEl.textContent, "93.2%");

      act(() => {
        root.unmount();
      });
    } finally {
      globalThis.requestAnimationFrame = origRaf;
      globalThis.cancelAnimationFrame = origCancelRaf;
      performance.now = origNow;
      Object.assign(globalThis, {
        window: prevWindow,
        document: prevDocument,
        IS_REACT_ACT_ENVIRONMENT: prevActEnv,
      });
      dom.window.close();
    }
  });

  it("integrates cleanly into StatsCard and BentoConsoleStats SSR rendering", () => {
    const cardHtml = renderStatic(
      <StatsCard title="Total Incidents" value={180} progress={75} />,
    );
    assert.ok(cardHtml.includes("180"));
    assert.ok(cardHtml.includes("75%"));

    const bentoHtml = renderStatic(
      <BentoConsoleStats
        scale={{ totalValue: 42, activeValue: 38, activeRate: 90 }}
        security={{ percent: 83, currentValue: 35, totalValue: 42 }}
        sentinel={{ count: 4 }}
      />,
    );
    assert.ok(bentoHtml.includes("42"));
    assert.ok(bentoHtml.includes("38"));
    assert.ok(bentoHtml.includes("83%"));
    assert.ok(bentoHtml.includes("4"));
  });
});
