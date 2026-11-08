# Shared business tables

The frontend uses `src/components/ui/table` for record lists. Confusion matrices,
AI diagnostic grids and role comparison matrices retain their domain layouts.
No backend, design-system project, API route or database schema changes are required.

## Component contract

Compose `TableToolbar`, `TableFilterPanel`, `TableBulkActions`, `TableContent` and
`TablePagination` inside `Table`. An optional `toolbar` slot puts existing domain
controls (including grid/table/wall switches) inside the same table surface.
Use `surface="embedded"` for a table inside a detail panel.

- `features` controls sorting, global/column filtering, pagination, row selection,
  column visibility, editing and row actions. Omitted features retain existing defaults.
- Provide stable `getRowId` values. `select` and `actions` are utility columns and
  cannot be hidden; disable their features to remove them.
- `loading` is the initial skeleton; `fetching` retains existing records and marks
  the table busy. `error` exposes a translated message and `onRetry` action.
- `filterKey` represents domain filters held outside TanStack state. Query/page/
  page-size/sort changes clear selection; filter/sort changes reset the page.
- Page size defaults to 10, with 10/20/50 choices. `features.pagination=false`
  renders the complete supplied dataset and removes pagination controls.
- `getRowClassName` preserves domain highlighting. Row clicks ignore nested buttons,
  links, form controls and menu items; keyboard activation applies to the row itself.
- Column visibility and row-action menus render through portals so short tables
  and panel overflow do not clip their controls.

## Data rules

Operational server lists set `manualPagination`, `manualSorting` and
`manualFiltering`, and provide controlled pagination and API `rowCount`/`pageCount`.
`rowCount` is the total matching the current query, not the length of the loaded page.
`totalRowCount` is optional and should only be supplied when an independent total is known.
Client tables count after filtering and before pagination.

`useTableState` owns pagination/sorting and resets page indexes for filter changes.
The page or domain component owns the API request, URLs and mutations. Search
requests use a 350 ms debounce. `mapTableSort` translates column IDs through an
endpoint allowlist and safely restores the endpoint default when sorting is cleared.

Roles/templates use `collectCatalog` before applying local filters or merging
system templates. Sites/cameras have separate complete catalog queries for KPI
panels and entity/filter lookups, independent of the displayed API page. Catalogs
request up to 100 items per page and at most three pages concurrently; failures
reject the incomplete catalog. Their query keys are covered by existing mutation
invalidation prefixes.

Bulk updates are limited to Users and Cameras. Selection never spans pages.
`settleInBatches` runs at most three requests concurrently and returns successful/
failed identities; only failed visible rows remain selected for retry.

## Capability checklist

| Table | Data processing | Search/filter | Sorting/actions |
| --- | --- | --- | --- |
| Users | Server paging | Name/email/phone, role, account status | `fullName`, `email`, `createdAt` API allowlist; permission-aware menus; activate/deactivate bulk |
| Cameras | Server paging; shared state for alternate views | Existing search/site/zone/status | Name/status UI sort; bounded bulk ping; existing live/ROI/edit/delete |
| Sites | Server paging; shared grid/table state | Existing search/status | Name/status UI sort; zones/safety/archive/edit/delete menus |
| Roles | Complete catalog, client paging | Search, system/custom type | Primitive column sorting; permission-aware role actions |
| Incidents | Server paging | Existing site → camera, status/severity/violation/search | API-supported detected date, severity, status; state/permission-aware actions and highlight |
| Audit logs | Server paging | Existing search/category/action/target/status | `createdAt`, `action`, `targetType`, sent with `order`; details/export preserved |
| Report history | Server paging | Site, report type, status | Search/sort hidden because the API lacks them; download preserved |
| Notification templates | Complete merged catalog, client paging | Search, category, system/custom | Client sorting, preview/test/edit/delete; system-delete protection preserved |
| Email logs | Server paging | Recipient and status | Sort hidden; permission-aware failed-email retry |
| System configs | Server paging | Existing search/category | Sort hidden; existing management permission preserved |
| System health | Complete supplied array, no paging | Existing search/type/status | Sorting/column visibility; all services remain visible |
| Model governance | Supplied model versions, client paging | Client search | Version/framework/mAP/latency/date/status; deployment preserved |
| Camera stored incidents | Server paging in parent | Camera scope | Stable row IDs, query status/retry; default API ordering |
| Camera live violations | Supplied live events | Session scope | Client sorting/column visibility; evidence/seek behavior preserved |
| Site/role KPI detail lists | Supplied records, embedded | Existing panel filters | Column visibility/sorting and existing panel actions |

### Users safety and API limits

- Search is connected to the actual API query. The display column `user` maps to
  `fullName`, never to an unsupported API field.
- 2FA remains visible, but its page-only filter is removed. 2FA, locked and active
  KPI cards are informational: the summary's active count excludes temporary
  lockouts, while the list endpoint only supports `isActive`. The explicit
  "Enabled accounts" filter uses this API boolean, including temporarily locked
  accounts. The total KPI retains its reset interaction.
- Deactivation uses `PUT /users/:id` with `isActive=false`. Deletion is a distinct,
  explicitly labeled soft-delete operation; its confirmation explains session
  revocation and possible email/phone anonymization.
- Deleted accounts are excluded from activation bulk updates, and the current
  administrator cannot deactivate/delete their own account.
- Create/update/delete/restore/role assignment use their respective permissions.
  Account mutations invalidate list/detail/summary data together.

## Verification

- `npm test`: complete existing Node test suite plus table tests.
- `npm run test:tables`: server/client counts, disabled pagination, skeleton/error
  states, catalog pagination/failure, sort allowlists, bounded bulk concurrency,
  and template catalog cache invalidation.
- `npm run test:tables:e2e`: Python Playwright + installed Chromium. Builds an
  isolated fixture from the real components using the existing esbuild dependency.
  All API requests are intercepted; it never writes to a backend. Covers core
  interaction, actual Users API bindings/deactivation/partial bulk failures,
  read-only behavior, business tables, detail lists and mobile rendering.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false` and
  `npm run build`: whole-workspace integration checks. These also validate any
  unrelated changes currently present in the shared checkout.

The browser fixture writes its mobile screenshot under `.next/table-mobile-check.png`.
It is a component integration test, not a substitute for a live-backend acceptance run.
