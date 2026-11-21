import "@/hooks/auth/__tests__/setup";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React, { act } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LocaleProvider } from "@/providers/locale-provider";
import { ConfirmDialog } from "../confirm-dialog";
import { Modal } from "../modal";
import { CronToggleConfirmDialog } from "@/components/features/scheduled-tasks/cron-toggle-confirm-dialog";
import { DeleteRoleDialog } from "@/components/features/roles/delete-role-dialog";
import { DeleteCameraDialog } from "@/components/features/cameras/delete-camera-dialog";
import { DeleteSiteDialog } from "@/components/features/sites/delete-site-dialog";
import { ToggleFlagDialog } from "@/components/features/system/modals/toggle-flag-dialog";
import { DeleteConfigDialog } from "@/components/features/system/modals/delete-config-dialog";
import { DeleteNotificationTemplateDialog } from "@/components/features/notifications/modals/delete-notification-template-dialog";
import { CloseIncidentDialog } from "@/components/features/incidents/close-incident-dialog";
import { DeployModelDialog } from "@/components/features/ai-metrics/deploy-model-dialog";

function wrapWithProviders(children: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return (
    <QueryClientProvider client={client}>
      <LocaleProvider>{children}</LocaleProvider>
    </QueryClientProvider>
  );
}

function withDom(fn: (ctx: { container: HTMLElement; dom: JSDOM }) => void) {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost:3000",
  });
  const prevWindow = globalThis.window;
  const prevDocument = globalThis.document;
  const prevHTMLElement = globalThis.HTMLElement;
  const prevLocalStorage = globalThis.localStorage;
  const prevRequestAnimationFrame = globalThis.requestAnimationFrame;
  const prevCancelAnimationFrame = globalThis.cancelAnimationFrame;
  const prevActEnv = (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT;

  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    localStorage: dom.window.localStorage,
    requestAnimationFrame: (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    },
    cancelAnimationFrame: () => {},
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
      HTMLElement: prevHTMLElement,
      localStorage: prevLocalStorage,
      requestAnimationFrame: prevRequestAnimationFrame,
      cancelAnimationFrame: prevCancelAnimationFrame,
      IS_REACT_ACT_ENVIRONMENT: prevActEnv,
    });
    dom.window.close();
  }
}

describe("ConfirmDialog & Confirmation Modals", () => {
  it("ConfirmDialog uses balanced responsive sizing, overflow wrapping, and Vietnamese defaults", () => {
    withDom(({ container, dom }) => {
      const root = createRoot(container);
      const longUrl =
        "https://hooks.example.com/services/T0000000000/B0000000000/very-long-unbroken-webhook-secret-token-value-1234567890";

      act(() => {
        root.render(
          wrapWithProviders(
            <ConfirmDialog
              open={true}
              onClose={() => {}}
              onConfirm={() => {}}
              variant="default"
              itemName="user.with.very.long.identifier@enterprise-ppe.internal"
              description={longUrl}
            />,
          ),
        );
      });

      const dialog = dom.window.document.body.querySelector('[role="alertdialog"]');
      assert.ok(dialog, "Expected alertdialog to render in portal");
      assert.match(dialog.className, /max-w-\[480px\]/);
      assert.doesNotMatch(dialog.className, /max-w-\[440px\]/);

      const html = dialog.innerHTML;
      assert.match(html, /Xác nhận thao tác/);
      assert.match(html, /Đối tượng áp dụng/);
      assert.doesNotMatch(html, /Item to be deleted/);
      assert.doesNotMatch(html, /DANGEROUS ACTION/);
      assert.match(html, /\[overflow-wrap:anywhere\]/);
      assert.match(html, /flex-col-reverse[\s\S]*sm:flex-row/);

      act(() => {
        root.unmount();
      });
    });
  });

  it("ConfirmDialog handles Escape/close when idle and blocks closing when loading", () => {
    withDom(({ container, dom }) => {
      const root = createRoot(container);
      let closedCount = 0;

      act(() => {
        root.render(
          wrapWithProviders(
            <ConfirmDialog
              open={true}
              onClose={() => {
                closedCount += 1;
              }}
              onConfirm={() => {}}
              loading={true}
              title="Xóa bản ghi?"
            />,
          ),
        );
      });

      act(() => {
        dom.window.document.dispatchEvent(
          new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
      });
      assert.equal(closedCount, 0);

      act(() => {
        root.render(
          wrapWithProviders(
            <ConfirmDialog
              open={true}
              onClose={() => {
                closedCount += 1;
              }}
              onConfirm={() => {}}
              loading={false}
              title="Xóa bản ghi?"
            />,
          ),
        );
      });

      act(() => {
        dom.window.document.dispatchEvent(
          new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
      });
      assert.equal(closedCount, 1);

      act(() => {
        root.unmount();
      });
    });
  });

  it("Modal size='sm' widens from 384px to max-w-[460px] with overflow-safe typography", () => {
    const html = renderToStaticMarkup(
      wrapWithProviders(
        <Modal
          open={true}
          onOpenChange={() => {}}
          size="sm"
          title="SuperLongUnbrokenModalTitleWithoutSpacesForTesting"
          description="https://example.com/very/long/path/without/spaces"
        >
          <p>Body</p>
        </Modal>,
      ),
    );

    assert.match(html, /max-w-\[460px\]/);
    assert.match(html, /\[overflow-wrap:anywhere\]/);
  });

  it("Feature confirmation dialogs render uniform responsive footers and overflow protection", () => {
    withDom(({ container, dom }) => {
      const root = createRoot(container);

      act(() => {
        root.render(
          wrapWithProviders(
            <>
              <CronToggleConfirmDialog
                job={{
                  name: "cleanup-audit-logs",
                  cron: "0 2 * * *",
                  description: "Cleanup",
                  isEnabled: true,
                }}
                open={true}
                pending={false}
                onConfirm={async () => {}}
                onClose={() => {}}
              />
              <DeleteRoleDialog
                open={true}
                onOpenChange={() => {}}
                role={{
                  id: "r1",
                  name: "SAFETY_SUPERVISOR_EXTENDED_KEY",
                  description: "Role desc",
                  isSystem: false,
                  userCount: 2,
                  permissions: [],
                  createdAt: "2026-01-01T00:00:00.000Z",
                  updatedAt: "2026-01-01T00:00:00.000Z",
                }}
                onConfirm={async () => {}}
              />
              <DeleteCameraDialog
                open={true}
                onOpenChange={() => {}}
                camera={{
                  id: "c1",
                  code: "CAM-ZONE-A-001",
                  name: "Camera Gate 1",
                  status: "ONLINE",
                  siteId: "s1",
                } as never}
                onConfirm={async () => {}}
              />
              <DeleteSiteDialog
                open={true}
                onOpenChange={() => {}}
                site={{
                  id: "s1",
                  code: "SITE-01",
                  name: "North Plant",
                } as never}
                onConfirm={async () => {}}
              />
              <ToggleFlagDialog
                open={true}
                onOpenChange={() => {}}
                flag={{
                  key: "feature.very_long_flag_key_for_overflow_check",
                  value: "true",
                  type: "BOOLEAN",
                } as never}
                targetEnabled={false}
                onConfirm={async () => {}}
              />
              <DeleteConfigDialog
                open={true}
                onOpenChange={() => {}}
                config={{
                  key: "system.very_long_config_key_for_overflow_check",
                  value: "1",
                  type: "STRING",
                } as never}
                onConfirm={async () => {}}
              />
              <DeleteNotificationTemplateDialog
                open={true}
                onOpenChange={() => {}}
                template={{
                  id: "t1",
                  code: "INCIDENT_ALERT_LONG_CODE",
                  name: "Alert Template",
                  channel: "EMAIL",
                } as never}
              />
              <CloseIncidentDialog
                open={true}
                onOpenChange={() => {}}
                incident={{ id: "12345678-abcd" } as never}
                onConfirm={async () => {}}
              />
              <DeployModelDialog
                open={true}
                onOpenChange={() => {}}
                candidateVersion={{
                  id: "v2",
                  modelId: "m1",
                  version: "2.0.0",
                  framework: "TensorRT",
                  metrics: { mAP50: 0.92, latencyMs: 12 },
                } as never}
                onConfirm={async () => {}}
              />
            </>,
          ),
        );
      });

      const bodyHtml = dom.window.document.body.innerHTML;
      assert.match(bodyHtml, /cleanup-audit-logs/);
      assert.match(bodyHtml, /SAFETY_SUPERVISOR_EXTENDED_KEY/);
      assert.match(bodyHtml, /CAM-ZONE-A-001/);
      assert.match(bodyHtml, /SITE-01/);
      assert.match(bodyHtml, /feature\.very_long_flag_key_for_overflow_check/);
      assert.match(bodyHtml, /system\.very_long_config_key_for_overflow_check/);
      assert.match(bodyHtml, /INCIDENT_ALERT_LONG_CODE/);
      assert.match(bodyHtml, /#12345678/);
      assert.match(bodyHtml, /TensorRT/);
      assert.doesNotMatch(bodyHtml, /--neu-inset/);
      assert.doesNotMatch(bodyHtml, /--neu-text-primary/);

      act(() => {
        root.unmount();
      });
    });
  });
});
