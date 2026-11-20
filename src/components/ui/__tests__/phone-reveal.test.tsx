import "@/hooks/auth/__tests__/setup";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React, { act } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { PhoneReveal } from "../phone-reveal";

function withDom(fn: (ctx: { container: HTMLElement; dom: JSDOM }) => void) {
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

  try {
    fn({ container, dom });
  } finally {
    Object.assign(globalThis, {
      window: prevWindow,
      document: prevDocument,
      IS_REACT_ACT_ENVIRONMENT: prevActEnv,
    });
    dom.window.close();
  }
}

describe("PhoneReveal", () => {
  it("renders fallback text or null when phoneNumber is missing", () => {
    const defaultMarkup = renderToStaticMarkup(<PhoneReveal phoneNumber={null} />);
    assert.ok(defaultMarkup.includes("-"));

    const customMarkup = renderToStaticMarkup(
      <PhoneReveal phoneNumber="" emptyText="Chưa có SĐT" />,
    );
    assert.ok(customMarkup.includes("Chưa có SĐT"));

    const nullMarkup = renderToStaticMarkup(
      <PhoneReveal phoneNumber={undefined} emptyText={null} />,
    );
    assert.equal(nullMarkup, "");
  });

  it("masks phone number behind an Eye icon button until clicked", () => {
    const markup = renderToStaticMarkup(
      <PhoneReveal phoneNumber="0901234567" isVietnamese />,
    );
    assert.ok(markup.includes("<button"));
    assert.ok(markup.includes("Nhấn để xem số điện thoại"));
    assert.ok(!markup.includes("0901234567"));
  });

  it("reveals and hides phone number on click without propagating to parent card", () => {
    withDom(({ container }) => {
      let parentClicked = 0;
      let copiedValue: string | null = null;
      const root = createRoot(container);

      act(() => {
        root.render(
          <div onClick={() => { parentClicked += 1; }}>
            <PhoneReveal
              phoneNumber="0909888777"
              href="tel:0909888777"
              isVietnamese={false}
              onCopy={(p) => { copiedValue = p; }}
            />
          </div>,
        );
      });

      const viewBtn = container.querySelector(
        'button[aria-label="Click to view phone number"]',
      ) as HTMLButtonElement | null;
      assert.ok(viewBtn, "Expected Eye toggle button to render initially");
      assert.ok(!container.textContent?.includes("0909888777"));

      act(() => {
        viewBtn.click();
      });

      assert.equal(parentClicked, 0, "Clicking Eye must stop propagation");
      assert.ok(container.textContent?.includes("0909888777"));
      const telLink = container.querySelector('a[href="tel:0909888777"]');
      assert.ok(telLink, "Expected tel: link after reveal");

      const copyBtn = container.querySelector(
        'button[aria-label="Copy phone number"]',
      ) as HTMLButtonElement | null;
      assert.ok(copyBtn, "Expected Copy button after reveal");
      act(() => {
        copyBtn.click();
      });
      assert.equal(copiedValue, "0909888777");
      assert.equal(parentClicked, 0);

      const hideBtn = container.querySelector(
        'button[aria-label="Hide phone number"]',
      ) as HTMLButtonElement | null;
      assert.ok(hideBtn, "Expected Hide button after reveal");
      act(() => {
        hideBtn.click();
      });

      assert.equal(parentClicked, 0);
      assert.ok(!container.textContent?.includes("0909888777"));

      act(() => {
        root.unmount();
      });
    });
  });
});
