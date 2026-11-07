import { describe, it } from "node:test";
import assert from "node:assert";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EnglishFlag, UkFlag, UsFlag, VietnamFlag } from "../flag-icons";

describe("Flag Icons Component Suite", () => {
  it("renders VietnamFlag correctly with SVG, red background and yellow star", () => {
    const markup = renderToStaticMarkup(<VietnamFlag className="size-4" />);
    assert.ok(markup.includes("<svg"), "Contains SVG root");
    assert.ok(markup.includes('fill="#DA251D"'), "Contains Vietnam red background");
    assert.ok(markup.includes('fill="#FFDA44"'), "Contains Vietnam yellow star");
    assert.ok(markup.includes("size-4"), "Applies passed className");
  });

  it("renders UkFlag correctly with Union Jack colors", () => {
    const markup = renderToStaticMarkup(<UkFlag className="size-4" />);
    assert.ok(markup.includes("<svg"), "Contains SVG root");
    assert.ok(markup.includes('fill="#012169"'), "Contains UK navy field");
    assert.ok(markup.includes('stroke="#C8102E"'), "Contains UK red cross/saltire");
    assert.ok(markup.includes('stroke="#FFFFFF"'), "Contains UK white cross/saltire");
  });

  it("renders UsFlag correctly with Stars & Stripes elements", () => {
    const markup = renderToStaticMarkup(<UsFlag className="size-4" />);
    assert.ok(markup.includes("<svg"), "Contains SVG root");
    assert.ok(markup.includes('fill="#B22234"'), "Contains US red stripes");
    assert.ok(markup.includes('fill="#3C3B6E"'), "Contains US blue canton");
  });

  it("EnglishFlag defaults to UK flag and supports US variant", () => {
    const ukMarkup = renderToStaticMarkup(<EnglishFlag />);
    assert.ok(ukMarkup.includes('fill="#012169"'), "EnglishFlag defaults to UK");

    const usMarkup = renderToStaticMarkup(<EnglishFlag variant="us" />);
    assert.ok(usMarkup.includes('fill="#B22234"'), "EnglishFlag renders US variant when requested");
  });
});

