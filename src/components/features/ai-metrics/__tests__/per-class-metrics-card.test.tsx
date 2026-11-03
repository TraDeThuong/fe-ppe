import "@/hooks/auth/__tests__/setup";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LocaleProvider } from "@/providers/locale-provider";
import {
  PerClassMetricsCard,
  DEFAULT_PER_CLASS_MOCK_METRICS,
  EXTENDED_PER_CLASS_MOCK_METRICS,
  getClassDefinition,
} from "../per-class-metrics-card";
import type { PerClassMetric } from "@/types";

function renderWithProviders(element: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return renderToString(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(LocaleProvider, null, element),
    ),
  );
}

describe("per-class-metrics-card", () => {
  describe("getClassDefinition", () => {
    it("recognizes compliant PPE classes", () => {
      const person = getClassDefinition("PERSON");
      assert.equal(person.isViolation, false);
      assert.equal(person.labelVi, "Người lao động");

      const helmet = getClassDefinition("HARD_HAT");
      assert.equal(helmet.isViolation, false);

      const vest = getClassDefinition("SAFETY_VEST");
      assert.equal(vest.isViolation, false);
    });

    it("recognizes violation PPE classes", () => {
      const noHelmet = getClassDefinition("NO_HELMET");
      assert.equal(noHelmet.isViolation, true);
      assert.equal(noHelmet.labelVi, "Không đội mũ");

      const noVest = getClassDefinition("NO_VEST");
      assert.equal(noVest.isViolation, true);
      assert.equal(noVest.labelVi, "Không mặc áo");
    });

    it("handles dynamic unknown violation classes gracefully", () => {
      const unknownViolation = getClassDefinition("NO_GLOVES_DETECTED");
      assert.equal(unknownViolation.isViolation, true);

      const regular = getClassDefinition("CUSTOM_CLASS");
      assert.equal(regular.isViolation, false);
    });
  });

  describe("PerClassMetricsCard rendering", () => {
    it("renders loading skeleton when loading = true", () => {
      const html = renderWithProviders(
        React.createElement(PerClassMetricsCard, { loading: true }),
      );
      assert.ok(html.includes("aria-busy=\"true\""));
      assert.ok(html.includes("animate-pulse"));
    });

    it("renders empty state when metrics is empty without fallback", () => {
      const html = renderWithProviders(
        React.createElement(PerClassMetricsCard, { metrics: [] }),
      );
      assert.ok(html.includes("Tải dữ liệu mẫu"));
    });

    it("renders with DEFAULT_PER_CLASS_MOCK_METRICS when useMockFallback = true", () => {
      const html = renderWithProviders(
        React.createElement(PerClassMetricsCard, {
          metrics: [],
          useMockFallback: true,
        }),
      );
      assert.ok(html.includes("PERSON"));
      assert.ok(html.includes("HARD HAT"));
      assert.ok(html.includes("SAFETY VEST"));
      assert.ok(html.includes("NO HELMET"));
      assert.ok(html.includes("NO VEST"));
      assert.ok(html.includes("Mock"));
    });

    it("renders custom provided metrics accurately", () => {
      const customMetrics: PerClassMetric[] = [
        {
          className: "HARD_HAT",
          precision: 0.95,
          recall: 0.94,
          f1Score: 0.945,
          sampleCount: 500,
        },
      ];

      const html = renderWithProviders(
        React.createElement(PerClassMetricsCard, { metrics: customMetrics }),
      );

      assert.ok(html.includes("HARD HAT"));
      assert.ok(html.includes("Mũ bảo hộ"));
      assert.ok(html.includes("500"));
      assert.ok(html.includes("95.0"));
      assert.ok(html.includes("94.0"));
      assert.ok(html.includes("94.5"));
    });

    it("verifies standard mock dataset constants structure", () => {
      assert.equal(DEFAULT_PER_CLASS_MOCK_METRICS.length, 5);
      for (const m of DEFAULT_PER_CLASS_MOCK_METRICS) {
        assert.ok(m.precision > 0 && m.precision <= 1);
        assert.ok(m.recall > 0 && m.recall <= 1);
        assert.ok(m.f1Score > 0 && m.f1Score <= 1);
        assert.ok(m.sampleCount > 0);
      }

      assert.equal(EXTENDED_PER_CLASS_MOCK_METRICS.length, 9);
    });
  });
});
