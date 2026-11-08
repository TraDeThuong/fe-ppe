import "@/hooks/auth/__tests__/setup";
import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LocaleProvider } from "@/providers/locale-provider";

import { Modal, SculptedModal, RecessedDialog } from "../modal";
import { Table, useTableContext } from "../table";
import { FormField, Input, Textarea } from "../form";
import { Card } from "../card";

function wrapWithProviders(children: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <LocaleProvider>{children}</LocaleProvider>
    </QueryClientProvider>,
  );
}

/* -------------------------------------------------------------------------- */
/*                            1. Modal Tests                                  */
/* -------------------------------------------------------------------------- */

test("Modal: supports Compound Component composition pattern", () => {
  const html = wrapWithProviders(
    <Modal open={true} onOpenChange={() => {}}>
      <Modal.Header>
        <Modal.Title>Compound Modal Title</Modal.Title>
        <Modal.Description>Compound Modal Description</Modal.Description>
        <Modal.Close />
      </Modal.Header>
      <Modal.Content>
        <p>Custom Body Content</p>
      </Modal.Content>
      <Modal.Footer>
        <button type="button">Xác nhận</button>
      </Modal.Footer>
    </Modal>,
  );

  assert.match(html, /Compound Modal Title/);
  assert.match(html, /Compound Modal Description/);
  assert.match(html, /Custom Body Content/);
  assert.match(html, /Xác nhận/);
  assert.match(html, /aria-label="Đóng hộp thoại"/);
});

test("Modal: preserves 100% backward compatibility with monolithic props", () => {
  const html = wrapWithProviders(
    <SculptedModal
      open={true}
      onOpenChange={() => {}}
      title="Monolithic Modal Title"
      description="Monolithic Modal Description"
      footer={<button type="button">Lưu thay đổi</button>}
    >
      <p>Monolithic Content</p>
    </SculptedModal>,
  );

  assert.match(html, /Monolithic Modal Title/);
  assert.match(html, /Monolithic Modal Description/);
  assert.match(html, /Monolithic Content/);
  assert.match(html, /Lưu thay đổi/);
});

test("Modal: RecessedDialog also supports compound components", () => {
  assert.equal(typeof RecessedDialog.Header, "function");
  assert.equal(typeof RecessedDialog.Title, "function");
  assert.equal(typeof RecessedDialog.Content, "function");
  assert.equal(typeof RecessedDialog.Footer, "function");
});

/* -------------------------------------------------------------------------- */
/*                         2. FormField & Input Tests                         */
/* -------------------------------------------------------------------------- */

test("FormField: shares id, aria-describedby, and error state via Context without cloneElement", () => {
  const html = wrapWithProviders(
    <FormField
      id="test-username"
      label="Tên đăng nhập"
      helperText="Nhập tên đăng nhập duy nhất"
      error="Tên đăng nhập đã tồn tại"
    >
      <Input placeholder="user123" />
    </FormField>,
  );

  // Kiểm tra label kết nối với id của Input
  assert.match(html, /for="test-username"/);
  assert.match(html, /id="test-username"/);
  // Kiểm tra aria-describedby nối cả helper và error
  assert.match(html, /aria-describedby="test-username-helper test-username-error"/);
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /Tên đăng nhập đã tồn tại/);
});

test("FormField: supports complex nested elements without breaking cloneElement", () => {
  // cloneElement trước đây sẽ ghi đè hoặc crash nếu child là div hoặc fragment
  const html = wrapWithProviders(
    <FormField label="Mô tả" error="Mô tả không được để trống">
      <div className="custom-wrapper">
        <Textarea placeholder="Gõ mô tả..." />
      </div>
    </FormField>,
  );

  assert.match(html, /custom-wrapper/);
  assert.match(html, /Gõ mô tả.../);
  assert.match(html, /Mô tả không được để trống/);
});

/* -------------------------------------------------------------------------- */
/*                            3. Table Tests                                  */
/* -------------------------------------------------------------------------- */

test("Table: supports Compound Components composition (Toolbar, Content, Pagination)", () => {
  const rows = [
    { id: "1", name: "Alpha" },
    { id: "2", name: "Beta" },
  ];
  const columns = [{ accessorKey: "name", header: "Tên" }];

  const html = wrapWithProviders(
    <Table data={rows} columns={columns}>
      <Table.Toolbar />
      <Table.Content />
      <Table.Pagination />
    </Table>,
  );

  assert.match(html, /Alpha/);
  assert.match(html, /Beta/);
  assert.match(html, /Tên/);
});

test("Table Context: exposes structured state, actions, and meta interfaces", () => {
  let contextExtracted: any = null;

  function Inspector() {
    contextExtracted = useTableContext();
    return <div data-testid="inspector" />;
  }

  const rows = [{ id: "1", name: "Alpha" }];
  const columns = [{ accessorKey: "name", header: "Tên" }];

  wrapWithProviders(
    <Table data={rows} columns={columns}>
      <Inspector />
      <Table.Content />
    </Table>,
  );

  assert.ok(contextExtracted);
  // Kiểm tra tách bạch state, actions, meta
  assert.ok(contextExtracted.state);
  assert.equal(typeof contextExtracted.state.loading, "boolean");
  assert.ok(contextExtracted.actions);
  assert.equal(typeof contextExtracted.actions.setPagination, "function");
  assert.ok(contextExtracted.meta);
  assert.ok(contextExtracted.meta.table);
  // Kiểm tra tương thích ngược
  assert.ok(contextExtracted.table);
});

/* -------------------------------------------------------------------------- */
/*                             4. Card Tests                                  */
/* -------------------------------------------------------------------------- */

test("Card: variant interactive works properly without requiring redundant interactive boolean flag", () => {
  const html = wrapWithProviders(
    <Card variant="interactive">
      <p>Interactive Card</p>
    </Card>,
  );

  assert.match(html, /hover:-translate-y-1/);
  assert.match(html, /Interactive Card/);
});
