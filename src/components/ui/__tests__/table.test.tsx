import "@/hooks/auth/__tests__/setup";
import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LocaleProvider } from "@/providers/locale-provider";
import { Table } from "../table";
import type { TableComponentProps } from "../table";
const rows = Array.from({ length: 15 }, (_, i) => ({
  id: String(i),
  name: `Item-${i}`,
  group: i < 12 ? "alpha" : "beta"
}));
const columns = [{ accessorKey: "name", header: "Name" }, { accessorKey: "group", header: "Group" }];
function render(props: Partial<TableComponentProps<(typeof rows)[number]>> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return renderToStaticMarkup(<QueryClientProvider client={client}><LocaleProvider><Table data={rows} columns={columns} {...props} /></LocaleProvider></QueryClientProvider>);
}
test("client counts filtered records before pagination", () => {
  const html = render({ globalFilter: "alpha" });
  assert.match(html, /12 \/ 15/); assert.match(html, /Item-9/); assert.doesNotMatch(html, /Item-12/);
});
test("server toolbar uses metadata instead of counting a single loaded page", () => {
  const html = render({
    data: rows.slice(0, 10),
    manualPagination: true,
    rowCount: 124,
    pageCount: 13
  });
  assert.match(html, /124 bản ghi/); assert.doesNotMatch(html, /10 bản ghi/);
});
test("disabling pagination displays every service and removes page controls", () => {
  const html = render({
    features: {
      pagination: false,
      globalFilter: false,
      sorting: false,
      columnVisibility: false
    }
  });
  assert.match(html, /Item-14/); assert.doesNotMatch(html, /type="search"/); assert.doesNotMatch(html, /aria-sort="ascending"/); assert.doesNotMatch(html, /Trang đầu/);
});
test("fetch errors preserve loaded rows and expose retry", () => {
  const html = render({ error: new Error("offline"), onRetry: () => { } });
  assert.match(html, /role="alert"/); assert.match(html, /Thử lại/); assert.match(html, /Item-0/);
});
test("loading exposes skeletons and suppresses empty state", () => {
  const html = render({ data: [], loading: true });
  assert.match(html, /aria-busy="true"/); assert.match(html, /animate-pulse/); assert.doesNotMatch(html, /Không có dữ liệu để hiển thị/);
});
