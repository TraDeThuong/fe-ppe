# Hành trình xây dựng Auth Frontend — fe-ppe

> **Ngày lập:** 2026-10-19
> **Phạm vi:** Toàn bộ luồng Auth cho fe-ppe (login, register, 2FA, social login, session, profile)
> **Nguồn contract:** `smart-ppe-identity-service` (Express + TS, port 9999, prefix `/api/v1/auth`) — đã khảo sát ngày 2026-10-19
> **Tech stack:** Next.js (App Router) + @tanstack/react-query + axios + react-hot-toast

---

## Mục lục

0. [Kiến trúc tổng thể](#0-kiến-trúc-tổng-thể)
1. [Tiền đề backend cần hoàn thành trước/song song](#1-tiền-đề-backend)
2. [Bước 1 — Khởi tạo dự án & cài đặt nền tảng](#bước-1--khởi-tạo-dự-án--cài-đặt-nền-tảng)
3. [Bước 2 — Tầng `lib/`: token → query-client → axios](#bước-2--tầng-lib-token--query-client--axios)
4. [Bước 3 — Kiến trúc `providers/` + `AuthContext` + Thứ tự bọc layout & Liên kết Microservices](#bước-3--kiến-trúc-providers--authcontext--thứ-tự-bọc-layout--liên-kết-microservices)
5. [Bước 4 — `types/`: định nghĩa contract theo BE](#bước-4--types-định-nghĩa-contract-theo-be)
6. [Bước 5 — `services/`: từng hàm API](#bước-5--services-từng-hàm-api)
7. [Bước 6 — `hooks/`: useQuery / useMutation](#bước-6--hooks-usequery--usemutation)
8. [Bước 7 — Pages / Components](#bước-7--pages--components)
   - [7.5 Quy trình test tay đầu cuối](#75-quy-trình-test-tay-đầu-cuối)
9. [Bước 8 — PrefetchProvider (nâng cao)](#bước-8--prefetchprovider-nâng-cao)
10. [Ma trận xử lý lỗi toàn cục](#ma-trận-xử-lý-lỗi-toàn-cục)
11. [Đảm bảo yếu tố microservice](#đảm-bảo-yếu-tố-microservice)
12. [Milestones & thứ tự thực hiện](#milestones--thứ-tự-thực-hiện)
13. [Checklist hoàn thiện](#checklist-hoàn-thiện)

---

## 0. Kiến trúc tổng thể

```
┌─────────────────────────── Browser ───────────────────────────┐
│  Pages / Components  (chỉ gọi hook, render theo state)         │
│        │                                                       │
│  hooks/{domain}  (useQuery đọc / useMutation ghi + invalidate) │
│        │                                                       │
│  services/{domain}.service.ts  (1 hàm = 1 endpoint, unwrap)    │
│        │                                                       │
│  lib/axios.ts  (interceptor: gắn token, refresh single-flight) │
└──────────────┬────────────────────────────────────────────────┘
               │  credentials: "include"  (cookie httpOnly)
┌──────────────▼────────────────────────────────────────────────┐
│  Traefik Gateway  (localhost:80, PathPrefix /api/v1)           │
└──────────────┬────────────────────────────────────────────────┘
               │
   ┌───────────┼───────────────┬──────────────┐
   ▼           ▼               ▼              ▼
identity    sites/…       incidents/…   notification/…
 :9999     (tương lai)    (tương lai)    (tương lai)
```

**Nguyên tắc vàng:**

1. **Mọi response backend** theo chuẩn `{ success: true, data | message }` / `{ success: false, message, code, errors? }` — tầng axios unwrap thành `data` hoặc throw `ApiError`.
2. **Token**: access (JWT RS256, dev 8h) + refresh (7 ngày, **có rotation**). Server set cookie httpOnly (`accessToken`, `refreshToken`) **và** trả trong body — frontend bật `withCredentials` là cookie tự hoạt động.
3. **Refresh token rotation là rủi ro số 1**: gửi lại refresh token đã dùng → backend revoke **toàn bộ session**. Bắt buộc single-flight + luôn dùng refresh token mới nhất (chi tiết Bước 2).
4. **Response login có 2 shape** (cùng HTTP 200): thường vs `{ requires2FA: true, tempToken }` — mọi luồng đăng nhập (email, Google) đều phải phân nhánh này.
5. **Domain-first**: thư mục types/services/hooks tổ chức theo domain = tên backend microservice (`auth` → identity-service; sau này `sites`, `incidents`, `notifications`...). Thêm service mới = thêm folder, không đụng core.
6. **Pages không gọi service trực tiếp** — chỉ gọi hook; hook không điều hướng — điều hướng do trang/layout quyết định.
7. **Locale tập trung**: mọi chuỗi UI qua `t()` của LocaleProvider (dict `src/i18n/`), số/ngày giờ format qua `Intl` theo locale. Locale mặc định lấy từ BE `app.locale` (`/system/public`), user tự chọn thì lưu localStorage + cookie `ppe_locale` — chi tiết Bước 3.5.3.

---

## 1. Tiền đề backend

Các việc này **chặn** một phần luồng — cần yêu cầu team backend hoặc tự cấu hình trước khi test:

| # | Vấn đề | Ảnh hưởng | Giải pháp |
|---|--------|-----------|-----------|
| 1 | `APP_URL` trong email (verify, reset, deactivate) trỏ backend `localhost:7777` | Link email không về frontend | Cấu hình lại `APP_URL` = URL frontend, hoặc frontend tự build trang đọc token từ query rồi gọi API (khuyến nghị cả 2: APP_URL về frontend + trang frontend gọi API) |
| 2 | `.env` dev chưa có `GOOGLE_CLIENT_ID` | Mọi API Google trả 500 `CONFIGURATION_ERROR` | Cấu hình Google OAuth + thêm redirectUri frontend vào allowlist `GOOGLE_OAUTH_ALLOWED_REDIRECT_URIS` |
| 3 | Link email deactivate trỏ `/api/v1/auth/verify-email/deactivate` — path không tồn tại trên BE | Không deactivate được qua link | Xác minh với backend; phương án B: trang frontend đọc token trong email → gọi `POST /auth/deactivate/confirm` |
| 4 | `TURNSTILE_ENABLED=true` ở dev | Register/forgot/resend yêu cầu captcha thật | Quyết định: giữ bật (tích hợp widget) hay tắt ở dev cho dễ test |
| 5 | Feature flags `feature.registration.enabled`, `feature.social_login.enabled` có nhưng chưa thấy enforce trên BE | Nút đăng ký/social có thể bật mà BE không chặn | Frontend vẫn đọc `GET /api/v1/system/public` để hiển thị đúng, coi BE sẽ enforce sau |

---

## Bước 1 — Khởi tạo dự án & cài đặt nền tảng

### 1.1 Cài đặt dependencies

```bash
npm install @tanstack/react-query axios react-hot-toast
# dev: @tanstack/react-query-devtools (chỉ dev)
```

### 1.2 Cấu hình env — tạo `.env.local` (và `.env.example`)

```
# Gateway (khuyến nghị — mọi service đi qua 1 cổng, cookie cùng origin)
NEXT_PUBLIC_API_BASE_URL=http://localhost:80/api/v1

# Dev trực tiếp identity-service (fallback khi chưa chạy Traefik)
NEXT_PUBLIC_IDENTITY_URL=http://localhost:9999/api/v1

# Frontend (dùng cho redirectUri social login, link email)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Lưu ý microservice:** về sau mỗi service có thể có base URL riêng (`NEXT_PUBLIC_SITES_URL`, `NEXT_PUBLIC_INCIDENTS_URL`...), nhưng ưu tiên đi qua gateway 1 cổng duy nhất để cookie `path=/` hoạt động chuẩn.

### 1.3 Cấu trúc thư mục chuẩn (domain-first)

```
fe-ppe/
├── app/
│   ├── layout.tsx                 # bọc Providers (xem Bước 3)
│   ├── (public)/                  # route group KHÔNG cần đăng nhập
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── verify-email/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   └── auth/callback/page.tsx # Google OAuth callback
│   ├── (auth)/                    # route group CẦN đăng nhập
│   │   ├── layout.tsx             # Protected layout + PrefetchProvider
│   │   ├── 2fa/page.tsx           # màn nhập mã sau login
│   │   ├── change-password/page.tsx
│   │   └── settings/security/page.tsx
│   └── middleware.ts (đặt ở src/ nếu dùng src/, xem cấu hình)
├── src/
│   ├── lib/
│   │   ├── token.ts
│   │   ├── query-client.ts
│   │   └── axios.ts
│   ├── providers/
│   │   ├── index.tsx              # RootProviders / AppProviders — thứ tự bọc chuẩn
│   │   ├── react-query-provider.tsx # ReactQueryProvider (TanStack Query client & cache)
│   │   ├── theme-provider.tsx     # ThemeProvider (Light/Dark/System + class="dark")
│   │   ├── locale-provider.tsx    # LocaleProvider (i18n, dict vi/en, Intl format)
│   │   ├── auth-provider.tsx      # AuthProvider (bọc AuthContext, session restore)
│   │   ├── toast-provider.tsx     # ToastProvider (cấu hình Toaster đồng bộ theme)
│   │   ├── realtime-provider.tsx  # RealtimeProvider (SSE/WebSocket alert - mount tại (auth))
│   │   └── prefetch-provider.tsx  # PrefetchProvider (role-based prefetch - mount tại (auth))
│   ├── contexts/
│   │   ├── AuthContext.tsx        # Context & useAuth() hook
│   │   └── RealtimeContext.tsx    # Context realtime cảnh báo (triển khai theo nhu cầu)
│   ├── types/
│   │   ├── common.ts
│   │   └── auth.types.ts
│   ├── services/
│   │   └── auth.service.ts
│   ├── hooks/
│   │   ├── auth/
│   │   │   ├── auth.query-keys.ts
│   │   │   ├── use-me.ts
│   │   │   ├── use-login.ts
│   │   │   ├── ... (đầy đủ ở Bước 6)
│   ├── components/
│   │   ├── ui/                     # design system (đã có)
│   │   └── features/auth/          # form, card, QR, backup-codes modal...
│   ├── i18n/
│   │   ├── vi-VN.json              # dict chuỗi UI (xem Bước 3.5.3)
│   │   └── en-US.json
│   └── config/
│       └── env.ts                  # đọc + validate env tập trung
└── docs/journeys/                  # file hành trình này & các file sau
```

### 1.4 Tiêu chí hoàn thành

- [x] `npm run dev` chạy được, cài 3 package + devtools thành công
- [x] `.env.local` + `.env.example` có đủ biến ở trên
- [x] `src/config/env.ts` validate env (throw sớm nếu thiếu biến bắt buộc)
- [x] Cây thư mục `lib/`, `providers/`, `contexts/`, `types/`, `services/`, `hooks/auth/` đã tạo rỗng theo cấu trúc

> **Phát sinh thực tế (2026-10-19):** alias `@/*` trong tsconfig gốc trỏ `./*` (root) chưa ai dùng; đã sửa thành `./src/*` để `@/lib`, `@/config`, `@/types`... hoạt động theo chuẩn Next.js. `@ui/*` giữ nguyên (đang dùng rộng rãi). `.gitignore` đã thêm ngoại lệ `!.env.example`.

---

## Bước 2 — Tầng `lib/`: token → query-client → axios

Đây là **nền móng quan trọng nhất** — làm đúng thì mọi bước sau nhàn, làm sai thì bug session khó gỡ.

### 2.1 `lib/token.ts`

**Mục đích:** cookie httpOnly không đọc được từ JS, nhưng frontend vẫn cần token cho:
- Gắn `Authorization: Bearer` (gọi service khác không qua cookie)
- Giữ **refresh token mới nhất** sau mỗi lần rotation (tránh reuse detection)

```ts
// Minh họa giao diện — chưa phải code cuối
let accessToken: string | null = null;
let refreshToken: string | null = null;   // LUÔN là bản mới nhất sau mỗi lần refresh

export const tokenStore = {
  getAccessToken(): string | null,
  getRefreshToken(): string | null,
  setTokens(a: string, r: string): void,  // gọi NGAY LẬP TỨC khi login/refresh thành công
  clear(): void,                          // logout / refresh fail / session bị revoke
};
```

**Quy tắc bắt buộc:**
- `setTokens` phải được gọi **đồng bộ, trước khi** bất kỳ request nào retry bằng token mới.
- Sau reload trang, memory trống nhưng cookie vẫn sống → AuthContext gọi `/me` để phục hồi (không cần đọc lại token từ cookie).
- Không bao giờ lưu token vào `localStorage` (XSS) — memory + cookie httpOnly là đủ.

### 2.2 `lib/query-client.ts`

```ts
// Minh họa cấu hình cốt lõi
export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError }),   // toast lỗi query tập trung
  mutationCache: new MutationCache({ onError }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,              // 5 phút
      retry: (count, error) =>
        error.status >= 500 && count < 2,    // KHÔNG retry 4xx (401/403/422...)
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});
```

**Quy tắc:**
- Không retry lỗi 4xx — đặc biệt 401 đã có interceptor xử lý refresh, retry lại chỉ gây lặp vô nghĩa.
- Query key dùng factory (Bước 6), không hardcode chuỗi rải rác.
- Devtools chỉ mount khi `process.env.NODE_ENV === "development"`.

### 2.3 `lib/axios.ts` — interceptor refresh single-flight

**Chuẩn hóa lỗi trước tiên:**

```ts
export class ApiError extends Error {
  status: number;          // HTTP status
  code: string;            // VD: "ACCOUNT_LOCKED"
  errors?: { field: string; message: string }[];  // zod 422
}
```

**Request interceptor:** gắn `Authorization: Bearer <accessToken>` nếu có (cookie vẫn được gửi nhờ `withCredentials: true` — header chỉ là dự phòng).

**Response interceptor — luồng refresh:**

```
Request thất bại 401 + code TOKEN_EXPIRED?
│
├─ Là request /auth/refresh? → KHÔNG retry, throw (hết phiên thật sự)
├─ Là /auth/login, /auth/2fa/verify, /auth/google? → KHÔNG refresh, throw ngay
│
└─ Request thường:
    ├─ Chưa có refresh đang chạy → gọi POST /auth/refresh VỚI refreshToken MỚI NHẤT từ tokenStore
    │     • Thành công: setTokens(cặp mới) → retry request gốc với accessToken mới
    │     • Thất bại: tokenStore.clear() + emit sự kiện "auth:session-expired" → về /login
    └─ Đã có refresh đang chạy → CHỜ CHUNG promise đó (single-flight), rồi retry
```

**Vì sao single-flight là bắt buộc (không phải tùy chọn):**
- Backend có **refresh token rotation**: mỗi lần refresh, token cũ bị xóa khỏi DB.
- 2 request refresh song song → 1 cái thành công, 1 cái bị `TOKEN_INVALID` → backend **revoke toàn bộ session của user** → user bị đá ra không rõ lý do.
- Giải pháp: 1 biến `refreshPromise` module-level; mọi request 401 khác chờ cùng promise; sau khi xong, tất cả retry với token mới.

**Chiến lược toast tập trung (tránh trùng lặp):**
- Interceptor chỉ toast các lỗi **kỹ thuật/toàn cục**: network offline, 500, 503 `SYSTEM_MAINTENANCE` (kèm màn maintenance), 429 (đọc `Retry-After`).
- Lỗi **nghiệp vụ** (422, `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`...) **không toast ở interceptor** — để từng mutation tự toast với ngữ cảnh riêng (form đang điền, màn hình đang xem).

### 2.4 Tiêu chí hoàn thành

- [x] Gọi 1 API lỗi 401 `TOKEN_EXPIRED` với 3 request song song → **chỉ 1 request** `/auth/refresh` xuất hiện trên Network tab, cả 3 request gốc được retry thành công
- [x] Refresh fail → session bị clear, sự kiện `auth:session-expired` phát ra, UI về login
- [x] 422 hiển thị đủ `errors[{field, message}]` trên form
- [ ] 423/429/500 hiển thị toast đúng chỗ, không trùng — **cần browser, xác minh ở Bước 3+ khi có UI thật**

> **Test tự động (đã đạt 11/11 assertion, 2026-10-19):** `scripts/test-refresh-single-flight.ts` — chạy `npm run test:refresh`, đăng nhập bằng seed user `admin@ppe.local`, forge access token hết hạn (HS256 ký bằng JWT_ACCESS_SECRET đọc runtime từ `.env` backend — backend chấp nhận HS256, xem `jwt-key.service.ts:279-285`), bắn 3 request song song rồi xác minh: cả 3 thành công, session không bị revoke (chứng minh không race), token đã rotate, refresh fail → clear + ApiError, 422 → `errors[]`, cleanup logout.

---

## Bước 3 — Kiến trúc `providers/` + `AuthContext` + Thứ tự bọc layout & Liên kết Microservices

### 3.1 Rà soát & Đánh giá 7 Providers trong hệ thống Smart PPE Monitoring

Frontend Smart PPE Monitoring xây dựng trên Next.js (App Router), TypeScript, TanStack Query, Axios, giao tiếp qua API Gateway (Traefik) tới hệ thống Microservices (`identity-service`, `camera-service`, `smart-ppe-ai-service`, `notification-service`, `incident-service`...).

Dưới đây là kết quả rà soát kiến trúc cho 7 providers được xem xét:

| # | Provider | Trách nhiệm chính | Phân loại & Quyết định | Tầng Mount |
|---|----------|-------------------|------------------------|------------|
| 1 | `ReactQueryProvider.tsx` | Quản lý server-state, query cache, GC, staleTime, retry policy | **Bắt buộc (Core)** — hạ tầng dữ liệu cho toàn bộ hooks | Root (`app/layout.tsx`) |
| 2 | `AuthProvider.tsx` | Quản lý client session state (`user`, `status`), phục hồi session qua `/auth/me`, đón sự kiện `auth:session-expired` | **Bắt buộc (Core)** — định danh người dùng toàn ứng dụng | Root (`app/layout.tsx`) |
| 3 | `ThemeProvider.tsx` | Quản lý Light / Dark / System theme, đồng bộ class `dark` trên `<html>`, triệt tiêu FOUC | **Bắt buộc (Core)** — hạ tầng giao diện Design System | Root (`app/layout.tsx`) |
| 4 | `LocaleProvider.tsx` | Quản lý i18n (`vi-VN`, `en-US`), đọc default từ `/system/public`, cung cấp `t()`, format số/ngày giờ bằng `Intl` | **Bắt buộc (Core)** — đa ngôn ngữ toàn UI | Root (`app/layout.tsx`) |
| 5 | `ToastProvider.tsx` | Container cấu hình `react-hot-toast` Toaster, đồng bộ styling theme, giới hạn số lượng toast tránh ngập thông báo | **Nên gộp / Thin UI Wrapper** — không tạo React Context thừa; bọc UI container Toaster | Root (`app/layout.tsx`) |
| 6 | `RealtimeProvider.tsx` | Quản lý kết nối SSE/WebSocket nhận cảnh báo vi phạm PPE từ AI / Notification Service realtime | **Theo nhu cầu (Scoped)** — KHÔNG bọc ở root để tránh mở socket vô ích ở public routes (`/login`, `/register`); chỉ bọc tại protected routes | Protected (`app/(auth)/layout.tsx`) |
| 7 | `PrefetchProvider.tsx` | Prefetch trước dữ liệu Dashboard (sites, cameras, incidents) theo role/permissions vào query cache | **Theo nhu cầu (Scoped)** — KHÔNG bọc ở root; đặt ở protected layout sau khi user đã xác thực | Protected (`app/(auth)/layout.tsx`) |

**Đánh giá chi tiết & Định hướng tối ưu:**
- **Không lạm dụng Context**: `ToastProvider` và `PrefetchProvider` không cần tạo thêm React Context độc lập (tránh re-render thừa). `ToastProvider` là một UI Component bọc cấu hình Toaster. `PrefetchProvider` là một lifecycle component kích hoạt query prefetch.
- **Tách biệt phạm vi (Scoping)**: `RealtimeProvider` và `PrefetchProvider` tiêu tốn tài nguyên mạng và yêu cầu quyền hạn người dùng, do đó được tách khỏi Root Layout và chỉ kích hoạt trong Route Group `(auth)`.

---

### 3.2 Cấu trúc thư mục chuẩn của tầng `providers/`

```
src/
├── providers/
│   ├── index.tsx                  # RootProviders — gom toàn bộ root providers thành 1 component gọn
│   ├── react-query-provider.tsx   # ReactQueryProvider — cấu hình QueryClient, devtools, staleTime
│   ├── theme-provider.tsx         # ThemeProvider — Light/Dark mode, đồng bộ class dark, localStorage
│   ├── locale-provider.tsx        # LocaleProvider — i18n dict vi/en, Intl formatters, sync BE config
│   ├── auth-provider.tsx          # AuthProvider — bọc AuthContext, quản lý vòng đời session
│   ├── toast-provider.tsx         # ToastProvider — Toaster UI wrapper, theme-aware, deduplication
│   │
│   │   # Các Provider có phạm vi đặc thù (Scoped Providers — chỉ dùng trong (auth)/layout.tsx):
│   ├── realtime-provider.tsx      # RealtimeProvider — SSE/WebSocket client cho PPE alerts (theo nhu cầu)
│   └── prefetch-provider.tsx      # PrefetchProvider — Role-based dashboard prefetch (theo nhu cầu)
├── contexts/
│   ├── AuthContext.tsx            # AuthContext & useAuth() hook
│   └── RealtimeContext.tsx        # RealtimeContext & useRealtime() hook (khi phát triển phase Realtime)
```

---

### 3.3 Thứ tự lồng Providers (Provider Nesting Order) & Lý do kiến trúc

Việc sắp xếp thứ tự lồng nhau giữa các Provider là tối quan trọng để tránh lỗi khởi tạo, vòng lặp dependency và hiện tượng giật giao diện (FOUC).

#### A. Tầng Root — `app/layout.tsx` (Toàn bộ ứng dụng)

```tsx
// Cấu trúc lồng chuẩn tại app/layout.tsx
<html lang="vi" suppressHydrationWarning>
  <head>
    {/* Script đồng bộ theme sớm nhất trong DOM để chặn FOUC */}
    <InlineThemeScript />
  </head>
  <body>
    <ThemeProvider>                              {/* 1. Ngoài cùng: Quản lý Dark/Light class cho toàn DOM */}
      <ReactQueryProvider>                       {/* 2. Cung cấp QueryClient cho mọi query/mutation bên trong */}
        <LocaleProvider>                         {/* 3. Cần QueryClient để đọc /system/public; cung cấp t() */}
          <AuthProvider>                         {/* 4. Cần QueryClient (sync /me) & LocaleProvider (thông báo) */}
            {children}                           {/* 5. Cây component ứng dụng (public & auth routes) */}
            <ToastProvider />                    {/* 6. Nằm trong Theme & Locale để toast ăn màu & ngôn ngữ đúng */}
          </AuthProvider>
        </LocaleProvider>
        <ReactQueryDevtools />                   {/* 7. Devtools (chỉ hiển thị ở NODE_ENV === 'development') */}
      </ReactQueryProvider>
    </ThemeProvider>
  </body>
</html>
```

**Lý do thứ tự tại Root:**
1. **`ThemeProvider` (Tầng 1)**: Đặt ngoài cùng để mọi phần tử con (kể cả Modal Portal, Toast container, Loading Fallback) đều thừa hưởng đúng CSS variables và class `dark`/`light`.
2. **`ReactQueryProvider` (Tầng 2)**: Đặt trước `LocaleProvider` và `AuthProvider` vì cả hai provider này đều tận dụng TanStack Query để truy xuất API hoặc cache (LocaleProvider đọc `usePublicConfig`, AuthProvider tận dụng query cache).
3. **`LocaleProvider` (Tầng 3)**: Đặt trước `AuthProvider` để khi `AuthProvider` hoặc các form đăng nhập, thông báo lỗi khởi động cần render, hàm `t()` đã sẵn sàng chuỗi dịch tương ứng.
4. **`AuthProvider` (Tầng 4)**: Cung cấp session state cho toàn bộ cây `{children}`.
5. **`ToastProvider` (Tầng 5)**: Đặt bên trong `ThemeProvider` và `LocaleProvider` để các thông báo toast vừa ăn theo theme vừa hỗ trợ chuỗi thông điệp đa ngôn ngữ.

#### B. Tầng Protected — `app/(auth)/layout.tsx` (Chỉ các màn hình đã đăng nhập)

```tsx
// Cấu trúc lồng chuẩn tại app/(auth)/layout.tsx
<AuthGuard>                                      {/* Kiểm tra session: unauthenticated -> redirect /login */}
  <RealtimeProvider>                             {/* 1. Mở kết nối SSE/WebSocket nhận cảnh báo PPE realtime */}
    <PrefetchProvider>                           {/* 2. Prefetch dữ liệu sites, cameras, incidents theo role */}
      <AppHeader />
      <AppSidebar />
      <main>{children}</main>
    </PrefetchProvider>
  </RealtimeProvider>
</AuthGuard>
```

**Lý do thứ tự tại Protected:**
1. Chỉ người dùng đã đăng nhập hợp lệ (`status === "authenticated"`) mới có token/cookie để kết nối SSE/WebSocket và truy xuất dữ liệu nghiệp vụ.
2. `RealtimeProvider` thiết lập kênh nhận sự kiện thời gian thực từ AI Service / Incident Service.
3. `PrefetchProvider` đọc `user.role` từ `AuthProvider` và gọi `queryClient.prefetchQuery()` song song trong background mà không chặn luồng render UI chính.

---

### 3.4 Phân định ranh giới & Mối quan hệ giữa các thành phần

Kiến trúc phân tầng rõ ràng giữa **Network (Axios) ↔ Event Bus ↔ State (Context/Query) ↔ UI**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                    UI LAYER                                            │
│   Pages / Forms  ──(useAuth)──> AuthContext                                            │
│   Components     ──(useQuery / useMutation)──> TanStack Query                          │
│   Notifications  ──(useRealtime)──> RealtimeContext (SSE/WS)                           │
└────────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │
┌────────────────────────────────────────▼───────────────────────────────────────────────┐
│                           STATE & CACHE COORDINATION                                   │
│   AuthContext (Client Session State: user, status, logout)                             │
│       ▲                                                │                               │
│       │ lắng nghe event                                │ queryClient.clear() khi logout│
│       │                                                ▼                               │
│   Event Bus ("auth:session-expired")            TanStack Query Cache                   │
│       ▲                                         (Server State Cache)                   │
└───────┼────────────────────────────────────────────────┬───────────────────────────────┘
        │ emit khi refresh fail                          │ queryFn / mutationFn
┌───────┴────────────────────────────────────────────────▼───────────────────────────────┐
│                                 NETWORK LAYER (Axios)                                  │
│   tokenStore (in-memory access/refresh tokens)                                         │
│   lib/axios.ts:                                                                        │
│     - Request Interceptor: đính kèm Authorization: Bearer <token>                      │
│     - Response Interceptor: bắt 401 TOKEN_EXPIRED -> Single-flight refresh token       │
│     - Response Unwrapper: bóc tách { success, data } / throw ApiError                  │
└────────────────────────────────────────┬───────────────────────────────────────────────┘
                                         │ credentials: "include" (HTTP-only cookies)
┌────────────────────────────────────────▼───────────────────────────────────────────────┐
│                        API GATEWAY (Traefik - Port 80)                                 │
│                        PathPrefix: /api/v1                                             │
└───────┬───────────────────────┬────────────────────────┬───────────────────────────────┘
        │ /api/v1/auth          │ /api/v1/cameras        │ /api/v1/ai & /incidents
        ▼                       ▼                        ▼
  identity-service        camera-service          smart-ppe-ai-service
       :9999                   :3002                      :8000
```

#### 1. Phân định Client State (`AuthContext`) vs Server State (`TanStack Query`)
- **`AuthContext`**: Chỉ lưu trữ thông tin nhận diện người dùng tối thiểu (`user: MeDto | null`, `status: "loading" | "authenticated" | "unauthenticated"`, `logout`). Không lưu danh sách logs, incidents, cameras...
- **`TanStack Query`**: Quản lý toàn bộ dữ liệu từ Microservices, xử lý caching, revalidation, deduping request và garbage collection.
- **Tránh trùng lặp chức năng**: `AuthContext` không tự tạo timer refetch hay fetch logic riêng; việc lấy thông tin người dùng được ủy quyền qua hook `useMe` (`authKeys.me()`). Khi đăng xuất hoặc phiên hết hạn, `AuthContext` gọi `queryClient.clear()` để xoá sạch toàn bộ server cache, ngăn chặn rò rỉ dữ liệu giữa các phiên đăng nhập.

#### 2. Cơ chế tách rời giữa Axios Interceptors và React (Decoupling qua Event Bus)
- **Vấn đề**: Axios Interceptor chạy ngoài ngữ cảnh React. Việc import trực tiếp hook React hoặc `useRouter` vào file axios sẽ vi phạm React Rules of Hooks và gây memory leak hoặc circular dependency.
- **Giải pháp**:
  - Axios Interceptor độc lập hoàn toàn với React. Khi request bị 401 và refresh token thất bại (hoặc phát hiện token reuse bị revoke):
    1. Gọi `tokenStore.clear()`.
    2. Phát sự kiện `auth:session-expired` qua module `lib/event-bus.ts` (dựa trên `EventTarget` native, siêu nhẹ).
  - `AuthProvider` trong React Tree subscribe sự kiện `auth:session-expired`:
    1. Cập nhật state nội bộ: `status = "unauthenticated"`, `user = null`.
    2. Gọi `queryClient.clear()`.
    3. Route Guard tự động chuyển hướng người dùng về `/login?next=...`.

#### 3. Vai trò của API Gateway (Traefik) đối với Microservices Frontend
- **Single Entrypoint**: Frontend chỉ gọi qua một base URL duy nhất (`NEXT_PUBLIC_API_BASE_URL=http://localhost:80/api/v1`). Gateway tự định tuyến tới đúng microservice.
- **Đồng nhất Cookie & CORS**: Do tất cả microservices nằm sau cùng domain/port gateway, cookie HTTP-only (`accessToken`, `refreshToken`, `ppe_locale`) hoạt động xuyên suốt không bị rào cản Cross-Site Third-Party Cookie.
- **Factory linh hoạt**: `lib/axios.ts` xuất hàm factory `createApiClient(pathPrefix)` để các service domain khác (`cameras`, `incidents`, `notifications`) có thể khởi tạo instance riêng nếu cần thiết lập cấu hình đặc thù, nhưng đều dùng chung interceptor auth và refresh token của `identity-service`.

#### 4. Phân chia trách nhiệm thông báo (Toast Notifications)
- **Axios Interceptor**: Chỉ hiển thị toast cho các lỗi **hạ tầng toàn cục**: Network offline, 500 Internal Server Error, 503 System Maintenance, 429 Rate Limit hệ thống.
- **React Query Mutations / Form Pages**: Chịu trách nhiệm hiển thị lỗi **nghiệp vụ cụ thể**: Sai mật khẩu, tài khoản bị khoá (423), mã 2FA không hợp lệ, 422 validation lỗi field.
- **`ToastProvider`**: Cấu hình `maxToasts: 3` và toast deduplication theo `toastId` để triệt tiêu hiện tượng spam thông báo khi microservice bắn lỗi dồn dập.

---

### 3.5 Thiết kế chi tiết từng Provider & Context

#### 3.5.1 `contexts/AuthContext.tsx` & `providers/auth-provider.tsx`

```ts
// src/contexts/AuthContext.tsx
export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthContextValue {
  user: MeDto | null;
  status: AuthStatus;
  setUser: (u: MeDto | null) => void;
  logout: () => Promise<void>;
}
```

```tsx
// src/providers/auth-provider.tsx (Minh họa triển khai)
"use client";

import { createContext, useContext, useEffect, useState, useCallback, useTransition } from "react";
import { AuthContext, AuthStatus } from "@/contexts/AuthContext";
import { MeDto } from "@/types/auth.types";
import { authService } from "@/services/auth.service";
import { tokenStore } from "@/lib/token";
import { queryClient } from "@/lib/query-client";
import { eventBus } from "@/lib/event-bus";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MeDto | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [, startTransition] = useTransition();

  const handleSessionExpired = useCallback(() => {
    tokenStore.clear();
    queryClient.clear();
    startTransition(() => {
      setUser(null);
      setStatus("unauthenticated");
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout({ refreshToken: tokenStore.getRefreshToken() ?? undefined });
    } finally {
      handleSessionExpired();
    }
  }, [handleSessionExpired]);

  // Khôi phục phiên khi app khởi động
  useEffect(() => {
    let isMounted = true;
    async function restoreSession() {
      try {
        const me = await authService.getMe();
        if (isMounted) {
          setUser(me);
          setStatus("authenticated");
        }
      } catch {
        if (isMounted) {
          handleSessionExpired();
        }
      }
    }

    restoreSession();
    const unsub = eventBus.on("auth:session-expired", handleSessionExpired);
    return () => {
      isMounted = false;
      unsub();
    };
  }, [handleSessionExpired]);

  return (
    <AuthContext.Provider value={{ user, status, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

#### 3.5.2 `providers/theme-provider.tsx`

```tsx
// src/providers/theme-provider.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  const applyTheme = (t: Theme) => {
    const isDark =
      t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
    setResolvedTheme(isDark ? "dark" : "light");
  };

  const setTheme = (next: Theme) => {
    setThemeState(next);
    localStorage.setItem("ppe.theme", next);
    document.cookie = `ppe_theme=${next}; path=/; max-age=31536000; SameSite=Lax`;
    applyTheme(next);
  };

  useEffect(() => {
    const saved = (localStorage.getItem("ppe.theme") as Theme) || "system";
    setThemeState(saved);
    applyTheme(saved);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => {
      if ((localStorage.getItem("ppe.theme") || "system") === "system") {
        applyTheme("system");
      }
    };
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
```

#### 3.5.3 `providers/locale-provider.tsx` + `i18n/`

```ts
// src/providers/locale-provider.tsx (Hợp đồng dữ liệu)
export type Locale = "vi-VN" | "en-US";

export interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
  number: Intl.NumberFormat;
  dateTime: Intl.DateTimeFormat;
}
```
**Quy tắc khởi tạo:**
1. Khởi tạo: Đọc `localStorage("ppe.locale")` → nếu không có, lấy `"app.locale"` từ query cache của `/system/public` → fallback `"vi-VN"`.
2. Khi `setLocale`: Lưu `localStorage` + ghi cookie `ppe_locale` (để Server Components và Middleware đọc) + gán `document.documentElement.lang = locale`.
3. Dict: `src/i18n/vi-VN.json` và `en-US.json`. Hàm `t(key)` hỗ trợ dot-notation (vd: `login.title`), fallback về `vi-VN` và cuối cùng là chính `key` nếu chưa dịch kịp.

#### 3.5.4 `providers/toast-provider.tsx`

```tsx
// src/providers/toast-provider.tsx (Thin UI Wrapper over react-hot-toast)
"use client";

import { Toaster } from "react-hot-toast";
import { useTheme } from "@/providers/theme-provider";

export function ToastProvider() {
  const { resolvedTheme } = useTheme();

  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      toastOptions={{
        duration: 4000,
        style: {
          background: resolvedTheme === "dark" ? "var(--color-card, #1e293b)" : "#ffffff",
          color: resolvedTheme === "dark" ? "#f8fafc" : "#0f172a",
          border: `1px solid ${resolvedTheme === "dark" ? "var(--color-border, #334155)" : "#e2e8f0"}`,
          borderRadius: "0.5rem",
          fontSize: "0.875rem",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
        },
        success: {
          iconTheme: { primary: "#10b981", secondary: "#ffffff" },
        },
        error: {
          iconTheme: { primary: "#ef4444", secondary: "#ffffff" },
        },
      }}
    />
  );
}
```

#### 3.5.5 `providers/realtime-provider.tsx` (Scoped — Dùng tại Protected Layout)

```tsx
// src/providers/realtime-provider.tsx (Minh họa kiến trúc SSE/WebSocket)
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { env } from "@/config/env";

interface RealtimeContextValue {
  isConnected: boolean;
  lastAlert: PpeAlertEvent | null;
}

const RealtimeContext = createContext<RealtimeContextValue>({ isConnected: false, lastAlert: null });

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastAlert, setLastAlert] = useState<PpeAlertEvent | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;

    // Khởi tạo EventSource / WebSocket tới Gateway (/api/v1/notifications/stream)
    const eventSource = new EventSource(`${env.NEXT_PUBLIC_API_BASE_URL}/notifications/stream`, {
      withCredentials: true,
    });

    eventSource.onopen = () => setIsConnected(true);
    eventSource.onerror = () => setIsConnected(false);
    eventSource.addEventListener("ppe-violation", (e) => {
      try {
        const data = JSON.parse(e.data);
        setLastAlert(data);
      } catch (err) {
        console.error("Lỗi parse sự kiện PPE realtime:", err);
      }
    });

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [status]);

  return (
    <RealtimeContext.Provider value={{ isConnected, lastAlert }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export const useRealtime = () => useContext(RealtimeContext);
```

#### 3.5.6 `providers/prefetch-provider.tsx` (Scoped — Dùng tại Protected Layout)

```tsx
// src/providers/prefetch-provider.tsx (Role-based Dashboard Prefetch)
"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { queryClient } from "@/lib/query-client";
import { authKeys } from "@/hooks/auth/auth.query-keys";

export function PrefetchProvider({ children }: { children: React.ReactNode }) {
  const { user, status } = useAuth();

  useEffect(() => {
    if (status !== "authenticated" || !user) return;

    // Prefetch dữ liệu tùy theo quyền hạn của Role
    if (user.role === "ADMIN" || user.role === "SUPERVISOR") {
      // Prefetch danh sách sessions bảo mật
      queryClient.prefetchQuery({
        queryKey: authKeys.sessions(),
        queryFn: () => import("@/services/auth.service").then((m) => m.authService.getSessions()),
        staleTime: 5 * 60 * 1000,
      });
      // Tương lai: prefetch sites, camera-list, alerts gần nhất từ các microservice tương ứng
    }
  }, [status, user]);

  return <>{children}</>;
}
```

#### 3.5.7 `providers/index.tsx` (Root Composition)

```tsx
// src/providers/index.tsx
"use client";

import { ThemeProvider } from "./theme-provider";
import { ReactQueryProvider } from "./react-query-provider";
import { LocaleProvider } from "./locale-provider";
import { AuthProvider } from "./auth-provider";
import { ToastProvider } from "./toast-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ReactQueryProvider>
        <LocaleProvider>
          <AuthProvider>
            {children}
            <ToastProvider />
          </AuthProvider>
        </LocaleProvider>
      </ReactQueryProvider>
    </ThemeProvider>
  );
}
```

---

### 3.6 Route Guard 2 Lớp (Defense in Depth)

Hệ thống bảo vệ route phối hợp giữa Server và Client:

1. **Lớp 1 — `middleware.ts` (Edge / Server-side, cực nhanh):**
   - Đọc `request.cookies` kiểm tra sự hiện diện của `accessToken` hoặc `refreshToken` (cookie `httpOnly` vẫn đọc được tại Next.js middleware).
   - Nếu truy cập route yêu cầu đăng nhập (`/(auth)/...`) mà không có cookie → `NextResponse.redirect(new URL("/login?next=" + encodeURIComponent(pathname), request.url))`.
   - Nếu đã có cookie mà truy cập trang `/login`, `/register` → `NextResponse.redirect(new URL("/", request.url))`.
   - *Lưu ý*: Không giải mã/verify chữ ký JWT nặng nề ở Edge; việc xác thực sâu do API `/auth/me` đảm nhiệm.

2. **Lớp 2 — `app/(auth)/layout.tsx` (Client-side, chính xác):**
   - Đọc `status` từ `useAuth()`:
     - `status === "loading"`: Hiển thị Skeleton màn hình chờ (ngăn chặn chớp giao diện).
     - `status === "unauthenticated"`: Chuyển hướng về `/login`.
     - `user.mustChangePassword === true`: Ép buộc chuyển hướng sang `/change-password` (nếu đang ở trang khác).
     - `user.isActive === false`: Render thông báo tài khoản bị vô hiệu hóa kèm nút liên hệ quản trị viên.
   - Khi đã vượt qua kiểm tra: Khởi động `RealtimeProvider` và `PrefetchProvider`.

---

### 3.7 Tiêu chí hoàn thành (DoD) của Bước 3

- [x] Cây `providers/` và `contexts/` được tổ chức đúng cấu trúc, tách rời rõ rệt giữa Root Providers và Scoped Providers.
- [x] `ThemeProvider` xử lý mượt mà Light/Dark/System, không gây chớp trắng FOUC khi tải lại trang. *(E2E: đổi theme tức thì, F5 giữ lựa chọn, `data-theme` set trước first paint)*
- [x] `LocaleProvider` khởi tạo thành công từ `localStorage` hoặc cấu hình `/system/public` của backend; chuyển đổi ngôn ngữ tức thì không cần reload trang. *(E2E: vi↔en tức thì, `documentElement.lang` đổi, F5 giữ lựa chọn)*
- [x] Tải lại trang (F5) tại protected route vẫn duy trì phiên làm việc mượt mà thông qua `restoreSession()` của `AuthProvider`. *(E2E: reload vẫn ở /dashboard với user)*
- [x] Đăng nhập rồi mở trang `/login` → tự động điều hướng về dashboard. *(E2E: proxy layer 1 thấy cookie → redirect `/`)*
- [x] Bắn 3 request 401 đồng thời → chỉ có duy nhất 1 request `/auth/refresh` được gọi (Single-flight); giao diện người dùng không bị văng đăng xuất oan. *(Bước 2, test 11/11)*
- [x] Khi refresh token hết hạn hoặc session bị revoke → Event Bus phát tín hiệu, `AuthProvider` lập tức clear cache và đẩy về màn hình login. *(Bước 2 test 5-6 + E2E logout)*
- [x] Thông báo lỗi không bị trùng lặp: lỗi mạng/500/503 hiển thị qua toast tập trung, lỗi form 422 hiển thị inline tại trường tương ứng. *(Toast tập trung đã verify; 422 inline đến cùng form Bước 6 — `ApiError.errors` đã chuẩn hóa sẵn)*
- [x] `RealtimeProvider` và `PrefetchProvider` chỉ được nạp tại `app/(auth)/layout.tsx`, hoàn toàn vắng mặt ở các trang công khai. *(Chỉ import trong (auth) layout — grep xác nhận)*

> **Phát sinh thực tế (2026-10-19) — đã fix trong quá trình verify E2E (Playwright, `scripts/test-step3-e2e.py`, 18/18 đạt):**
>
> 1. **`src/config/env.ts` phải tham chiếu TĨNH `process.env.NEXT_PUBLIC_X`** — Turbopack chỉ inline tham chiếu tĩnh vào client bundle; `process.env[key]` động luôn `undefined` trên browser → app crash client-side trong khi SSR vẫn chạy (rất khó phát hiện nếu không test trình duyệt).
> 2. **Toast phải đi qua `showToast()` của design system** (`@ui/toaster`) — gọi thẳng `react-hot-toast` render toast mặc định không theme gỗ, mất class `.ppe-toast`. `src/lib/toast.ts` đã wrap `showToast`; design system thêm option `{ id }` để dedup toast.
> 3. **`AuthContext.setUser` phải đồng bộ CẢ `status`** — nếu chỉ set user, sau lần thăm dò 401 đầu tiên status vẫn `"unauthenticated"` → AuthGuard redirect nhầm ngay sau khi login thành công.
> 4. **Next 16 `cacheComponents` + instant-navigation validation:** layout `(auth)` KHÔNG được chặn render children khi `status === "loading"` (page bị "dropped segment" trong pass prerender). Trang con tự lo skeleton; layout chỉ redirect qua effect. Page dashboard tạm = server component + `<Suspense>` + nội dung client ở `dashboard-content.tsx`.
> 5. **ThemeProvider theo design system:** `data-theme` trên `<html>` + localStorage key `"theme"` (không phải class `dark` + `ppe.theme` như draft).
> 6. **RealtimeProvider dùng luồng `stream-ticket`** (POST `/notifications/stream-ticket` → EventSource `?ticket=`). Hiện notification-service trả 500 "Cấu hình khóa công khai RS256 chưa sẵn sàng" (BE thiếu `JWT_PUBLIC_KEY`/`keys/public.key.pem` khớp cặp khóa identity-service) — FE xử lý graceful ("Mất kết nối"), cần BE fix để realtime chạy thật.
> 7. **Test sai mật khẩu làm khóa tài khoản thật** (BE khóa sau 5 lần sai — `users.failed_login_attempts`, `locked_until`). E2E dùng email không tồn tại cho bước "login sai" để chạy lại được; nếu bị khóa: `UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE email = 'admin@ppe.local'`.
> 8. **Cảnh báo cho Bước 7:** `/2fa` nằm trong nhóm `(auth)` — trong luồng 2FA user chưa có session cookies nên proxy layer 1 sẽ redirect `/2fa` về `/login`. Cần quyết định: đưa `/2fa` ra nhóm `(public)` (tempToken chỉ ở sessionStorage, guard không bảo vệ được gì thêm) hoặc thêm ngoại lệ cho `/2fa` ở proxy. **→ Đã quyết ở Bước 7.1: đưa `/2fa` ra nhóm `(public)`, proxy coi `/2fa` là public-auth.**
> 9. `ThemeToggle` của design system giữ nguyên standalone (không refactor sang `useTheme`) — site design system (:3001) dùng nó không có provider.
> 10. Placeholder `app/(public)/login/page.tsx` và `app/(auth)/dashboard/page.tsx` chỉ để verify Bước 3 — Bước 7 sẽ thay bằng trang thật.

---

## Bước 4 — `types/`: định nghĩa contract theo BE

### 4.1 `types/common.ts`

```ts
// Chuẩn response chung cho MỌI microservice
export interface ApiSuccess<T> { success: true; data?: T; message?: string }
export interface ApiErrorBody { success: false; message: string; code: string; errors?: { field: string; message: string }[] }

// Enum đầy đủ lấy từ smart-ppe-identity-service/src/common/errors/error-code.ts
export enum ErrorCode {
  UNAUTHORIZED = "UNAUTHORIZED", FORBIDDEN = "FORBIDDEN", NOT_FOUND = "NOT_FOUND",
  VALIDATION_ERROR = "VALIDATION_ERROR", INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  USER_INACTIVE = "USER_INACTIVE", TOKEN_EXPIRED = "TOKEN_EXPIRED", TOKEN_INVALID = "TOKEN_INVALID",
  DUPLICATE_ENTRY = "DUPLICATE_ENTRY", RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  TWO_FACTOR_INVALID_CODE = "TWO_FACTOR_INVALID_CODE", TWO_FACTOR_ALREADY_ENABLED = "TWO_FACTOR_ALREADY_ENABLED",
  GOOGLE_AUTH_FAILED = "GOOGLE_AUTH_FAILED", TOO_MANY_REQUESTS = "TOO_MANY_REQUESTS",
  BAD_REQUEST = "BAD_REQUEST", ACCOUNT_LOCKED = "ACCOUNT_LOCKED",
  CAPTCHA_REQUIRED = "CAPTCHA_REQUIRED", CAPTCHA_INVALID = "CAPTCHA_INVALID",
  CONFIGURATION_ERROR = "CONFIGURATION_ERROR", SYSTEM_MAINTENANCE = "SYSTEM_MAINTENANCE",
  GATEWAY_REQUIRED = "GATEWAY_REQUIRED",
  // ── Bổ sung khi đối chiếu BE (2026-10-19): error-code.ts thật có 42 mã ──
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR", FEATURE_DISABLED = "FEATURE_DISABLED",
  DEVICE_NOT_FOUND = "DEVICE_NOT_FOUND", TWO_FACTOR_REQUIRED = "TWO_FACTOR_REQUIRED",
  FILE_NOT_FOUND = "FILE_NOT_FOUND",
  // Cross-service (site/camera/incident/report/AI/gateway...)
  SITE_NOT_FOUND = "SITE_NOT_FOUND", CAMERA_NOT_FOUND = "CAMERA_NOT_FOUND",
  INCIDENT_NOT_FOUND = "INCIDENT_NOT_FOUND", EVIDENCE_NOT_FOUND = "EVIDENCE_NOT_FOUND",
  INVALID_STATUS_TRANSITION = "INVALID_STATUS_TRANSITION",
  REPORT_TEMPLATE_NOT_FOUND = "REPORT_TEMPLATE_NOT_FOUND", REPORT_GENERATION_NOT_FOUND = "REPORT_GENERATION_NOT_FOUND",
  AI_MODEL_NOT_FOUND = "AI_MODEL_NOT_FOUND", AI_MODEL_VERSION_NOT_FOUND = "AI_MODEL_VERSION_NOT_FOUND",
  IDEMPOTENCY_CONFLICT = "IDEMPOTENCY_CONFLICT", RETRY_EXHAUSTED = "RETRY_EXHAUSTED",
  REQUEST_TIMEOUT = "REQUEST_TIMEOUT", SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  BAD_GATEWAY = "BAD_GATEWAY", CIRCUIT_BREAKER_OPEN = "CIRCUIT_BREAKER_OPEN",
}
```

### 4.2 `types/auth.types.ts` — từng type theo đúng contract BE

| Type | Nguồn BE | Ghi chú quan trọng |
|------|----------|---------------------|
| `MeDto` | `auth.dto.ts:17-30` | `{ id, email, fullName, avatarUrl, phoneNumber, role, roleId, permissions: string[], isActive, twoFactorEnabled, mustChangePassword, createdAt }` |
| `AuthUser` | `auth.dto.ts:32-46` | `{ id, email, fullName, role, roleId, permissions: string[], mustChangePassword?: boolean }` — **`mustChangePassword` CHỈ có ở login thường; response `/2fa/verify` và `/auth/google` KHÔNG có field này** → khai `optional` + ghi chú rõ |
| `LoginResponse` | — | **Discriminated union bắt buộc:** `{ requires2FA: true; tempToken: string } \| { requires2FA?: false; accessToken; refreshToken; user: AuthUser }` |
| `RegisterPayload` | `auth.validation.ts:21-35` | `{ email, password, fullName?, turnstileToken? }` |
| `ForgotPasswordPayload` | `:81-84` | `{ email, turnstileToken? }` |
| `ResetPasswordPayload` | `:86-98` | `{ token, newPassword }` |
| `ResendVerificationPayload` | `:100-103` | `{ email, turnstileToken? }` |
| `TwoFactorSetupResponse` | `auth.dto.ts:96-99` | `{ secret, otpauthUrl }` — dùng otpauthUrl render QR |
| `Enable2FAResponse` | `:106-108` | `{ backupCodes: string[] }` (8 mã, **chỉ trả 1 lần**) |
| `Verify2FAPayload` | `auth.validation.ts:143-149` | `{ tempToken, code }` — code: TOTP 6 số hoặc backup `XXXX-XXXX` |
| `GoogleUrlResponse` | — | `{ url }` |
| `GoogleLoginPayload` | `:170-206` | `{ idToken }` HOẶC `{ code, redirectUri }` — union |
| `SocialAccount` | `auth.dto.ts:147-152` | `{ id, provider, providerUserId, createdAt }` |
| `LinkSocialPayload` | `:216-261` | `{ provider: "GOOGLE", idToken }` hoặc `{ provider, code, redirectUri }` |
| `SessionDto` | `auth.service.ts:1277-1292` | `{ id, deviceName, ipAddress, createdAt, isCurrent }` |
| `UpdateProfilePayload` | `:49-65` | `{ fullName?, avatarUrl?, phoneNumber? }` — phone regex `^[0-9]{10,11}$` |
| `ChangePasswordPayload` | `:67-79` | `{ oldPassword?, newPassword }` — oldPassword bắt buộc nếu user có password |
| `AvatarUploadUrlResponse` | `auth.dto.ts:76-81` | `{ uploadUrl, publicUrl, key, expiresIn }` |
| `AvatarConfirmPayload` | — | `{ key }` |
| `DeactivateRequestPayload` | — | `{ password, reason? }` |
| `DeactivateConfirmPayload` | — | `{ token }` |
| `SystemPublicConfig` | `system-config.constant.ts` | `data` là `Record<string, unknown>` **phẳng** (đã xác minh 2026-10-19): `"app.locale"` (`"vi-VN"`), `"app.timezone"` (`"Asia/Ho_Chi_Minh"`), `"feature.registration.enabled"`, `"feature.social_login.enabled"`, `"app.name"`, `"app.support_email"`... — khai helper `getConfig(key)` thay vì type cố định |

**Quy tắc:** type nào BE trả field nào thì khai đúng field đó; mọi chỗ "khác biệt giữa các endpoint trả cùng tên" phải ghi chú ngay trong type (như `mustChangePassword` ở trên) — đây là nguồn bug phổ biến nhất.

### 4.3 Tiêu chí hoàn thành

- [x] Mọi endpoint ở Bước 5 đều có type payload + response tương ứng
- [x] `LoginResponse` là discriminated union (TS bắt xử lý nhánh `requires2FA` ở mọi nơi dùng)
- [x] Có comment trích dẫn file BE cho mỗi type khó (để sau này đối chiếu khi BE đổi)

---

## Bước 5 — `services/`: từng hàm API

**Nguyên tắc:** 1 hàm = 1 endpoint; chỉ gọi axios + unwrap; **không toast, không điều hướng, không logic nghiệp vụ**; throw `ApiError` khi lỗi.

`services/auth.service.ts` — bảng đầy đủ (prefix `/api/v1`):

| # | Hàm | Method + Path | Payload | Return | Ghi chú đặc biệt |
|---|-----|---------------|---------|--------|-------------------|
| 1 | `register` | POST `/auth/register` | `RegisterPayload` | `{ message }` | **Anti-enum**: email tồn tại cũng trả 201 — không phân biệt được, đừng cố |
| 2 | `verifyEmail` | GET `/auth/verify-email?token=` | query token | `{ message }` | 400 `TOKEN_INVALID`/`TOKEN_EXPIRED` |
| 3 | `login` | POST `/auth/login` | `{ email, password }` | `LoginResponse` | 2 shape; 423 `ACCOUNT_LOCKED`; 403 `USER_INACTIVE` |
| 4 | `getMe` | GET `/auth/me` | — | `MeDto` | phục hồi session, guard |
| 5 | `refresh` | POST `/auth/refresh` | `{ refreshToken }` | `{ accessToken, refreshToken }` | **KHÔNG có user**; rotation; reuse → revoke all |
| 6 | `logout` | POST `/auth/logout` | `{ refreshToken? }` | `{ message }` | xóa session + clear cookie |
| 7 | `forgotPassword` | POST `/auth/forgot-password` | `ForgotPasswordPayload` | `{ message }` | **luôn 200** (chống enum); cooldown 60s |
| 8 | `resetPassword` | POST `/auth/reset-password` | `ResetPasswordPayload` | `{ message }` | revoke toàn bộ session |
| 9 | `resendVerification` | POST `/auth/resend-verification` | `ResendVerificationPayload` | `{ message }` | 429 `TOO_MANY_REQUESTS` nếu < 60s |
| 10 | `setup2FA` | POST `/auth/2fa/setup` | — | `TwoFactorSetupResponse` | secret hết hạn sau 10 phút |
| 11 | `enable2FA` | POST `/auth/2fa/enable` | `{ code, secret? }` | `Enable2FAResponse` | backupCodes **chỉ 1 lần** |
| 12 | `verify2FA` | POST `/auth/2fa/verify` | `Verify2FAPayload` | giống login thường | tempToken 5 phút; sai code vẫn thử lại được |
| 13 | `disable2FA` | POST `/auth/2fa/disable` | `{ code, password? }` | `{ message }` | password bắt buộc nếu user có password |
| 14 | `regenerateBackupCodes` | POST `/auth/2fa/backup-codes/regenerate` | `{ code, password? }` | `Enable2FAResponse` | code **chỉ TOTP**, không nhận backup code |
| 15 | `getGoogleUrl` | GET `/auth/google/url?redirectUri&state` | — | `GoogleUrlResponse` | redirectUri phải trong allowlist BE |
| 16 | `googleLogin` | POST `/auth/google` | `GoogleLoginPayload` | giống login | nhánh requires2FA; 500 `CONFIGURATION_ERROR` khi chưa cấu hình |
| 17 | `getSocialAccounts` | GET `/auth/social` | — | `SocialAccount[]` | |
| 18 | `linkSocial` | POST `/auth/social/link` | `LinkSocialPayload` | `{ provider, email }` | 409 `DUPLICATE_ENTRY` nếu đã link user khác |
| 19 | `unlinkSocial` | DELETE `/auth/social/:provider` | — | `{ message }` | anti-lockout: Google-only không unlink được cái cuối |
| 20 | `getSessions` | GET `/auth/sessions` | — | `SessionDto[]` | `isCurrent` đánh dấu thiết bị hiện tại |
| 21 | `revokeSession` | DELETE `/auth/sessions/:id` | — | `{ message }` | 404 nếu không thuộc user |
| 22 | `revokeOtherSessions` | DELETE `/auth/sessions` | `{ refreshToken? }` | `{ message }` | "đăng xuất tất cả thiết bị khác" |
| 23 | `updateProfile` | PUT `/auth/profile` | `UpdateProfilePayload` | `{ message }` | 400 `DUPLICATE_ENTRY` nếu phone đã tồn tại |
| 24 | `changePassword` | PUT `/auth/password` | `ChangePasswordPayload` | `{ message }` | **revoke toàn bộ session → ép đăng nhập lại** |
| 25 | `getAvatarUploadUrl` | POST `/auth/avatar/upload-url` | `{ contentType }` | `AvatarUploadUrlResponse` | sau đó **PUT trực tiếp** file lên `uploadUrl` (axios riêng, không qua interceptor auth) |
| 26 | `confirmAvatar` | POST `/auth/avatar/confirm` | `AvatarConfirmPayload` | `{ avatarUrl }` | |
| 27 | `requestDeactivate` | POST `/auth/deactivate/request` | `DeactivateRequestPayload` | `{ message }` | token email 15 phút |
| 28 | `confirmDeactivate` | POST `/auth/deactivate/confirm` | `DeactivateConfirmPayload` | `{ message }` | clear cookie + revoke all |
| 29 | `getPublicConfig` | GET `/system/public` | — | `SystemPublicConfig` | feature flags — gọi khi app khởi động |

> **Hàm 25 ngoại lệ:** PUT file lên presigned URL là request tới Cloudflare R2, **không** đi qua instance có interceptor auth (tránh gắn header thừa, tránh refresh trigger sai) — dùng `axios.put(uploadUrl, file, { headers: { "Content-Type": contentType } })` thuần.

### Tiêu chí hoàn thành

- [x] Đủ 29 hàm trên, mỗi hàm đúng method/path/payload/return type
- [x] Không hàm nào import toast/router/queryClient (thuần I/O)

> **Phát sinh thực tế (2026-10-19) — đối chiếu trực tiếp với BE:**
>
> - 29/29 route khớp `auth.route.ts`; payload khớp `auth.validation.ts`; response khớp `auth.dto.ts` + controller. Login success trả `{ accessToken, refreshToken, user }` (không kèm `requires2FA`) → union FE vẫn đúng.
> - `ErrorCode` BE thật có **42 mã** — đã bổ sung đủ vào `types/common.ts` (quan trọng: `INTERNAL_SERVER_ERROR` là mã các service thực tế trả khi lỗi 500, như notification-service đã thấy ở Bước 3).
> - `LinkSocialPayload.provider`: bỏ `| string` (union với `string` tự thu gọn thành `string`, mất hết type safety) → enum `"GOOGLE" | "ZALO"` theo schema BE; `unlinkSocial()` cũng type enum.
> - `SocialAccount.provider`: BE khai `string` (không phải enum) — giữ `string`.
> - `SessionDto.isCurrent`: BE **luôn trả** (so khớp hash token) → required, không optional.
> - Helper `getConfig(key)` + `SYSTEM_CONFIG_KEYS` đặt tại `src/lib/system-config.ts` (không nhét hàm vào file types); LocaleProvider đã dùng.
> - `refresh()`: payload optional — nếu không truyền, BE route lấy từ cookie httpOnly (đã verify ở Bước 2).

---

## Bước 6 — `hooks/`: useQuery / useMutation

### 6.1 Query key factory — `hooks/auth/auth.query-keys.ts`

```ts
// Mọi query key đi qua factory — dùng để invalidate chính xác
export const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
  sessions: () => [...authKeys.all, "sessions"] as const,
  social: () => [...authKeys.all, "social"] as const,
  config: () => [...authKeys.all, "config"] as const,
};
```

### 6.2 Danh sách hooks (đặt trong `hooks/auth/`)

**Đọc (useQuery):**

| Hook | Query | Ghi chú |
|------|-------|---------|
| `useMe` | `authKeys.me()` | `staleTime` dài (5-10 phút); `enabled` theo auth status |
| `useSessions` | `authKeys.sessions()` | settings/security |
| `useSocialAccounts` | `authKeys.social()` | settings/security |
| `usePublicConfig` | `authKeys.config()` | gọi 1 lần khi khởi động, cache dài; LocaleProvider đọc `"app.locale"` từ đây (Bước 3.5.3) |
| `useGoogleUrl(redirectUri, state)` | — | dùng `queryFn` hoặc gọi trong handler (nếu chỉ gọi khi click → đặt trong mutation/handler) |

**Ghi (useMutation — quy tắc chung: `onSuccess` → invalidate + toast.success; `onError` → toast.error từ `ApiError.message`, KHÔNG toast ở service/interceptor):**

| Hook | Invalidate sau thành công | Hành động đặc biệt |
|------|---------------------------|---------------------|
| `useLogin` | `authKeys.me()` + `config` | trả `LoginResponse` để trang quyết định nhánh `requires2FA`; gọi `tokenStore.setTokens` NGAY khi nhận response |
| `useRegister` | — | luôn hiện message chung chung (anti-enum) |
| `useVerifyEmail` | — | token từ URL query |
| `useResendVerification` | — | bắt 429 `TOO_MANY_REQUESTS` → hiển thị đếm ngược 60s |
| `useForgotPassword` | — | luôn toast thành công giống nhau (anti-enum) |
| `useResetPassword` | — | thành công → redirect login |
| `useLogout` | `queryClient.clear()` | gọi `authService.logout` + `tokenStore.clear` + sự kiện về login |
| `useSetup2FA` | — | trả `{ secret, otpauthUrl }` cho trang render QR |
| `useEnable2FA` | `authKeys.me()` | trả backupCodes → trang mở modal hiển thị 1 lần; sau đó `setUser` cập nhật `twoFactorEnabled` |
| `useVerify2FA` | `authKeys.me()` | giống useLogin (setTokens + phân nhánh) |
| `useDisable2FA` | `authKeys.me()` | |
| `useRegenerateBackupCodes` | — | modal backupCodes mới |
| `useGoogleLogin` | `authKeys.me()` | giống useLogin (nhánh requires2FA) |
| `useLinkSocial` | `authKeys.social()` | bắt 409 → toast "tài khoản đã liên kết với user khác" |
| `useUnlinkSocial` | `authKeys.social()` | bắt 400 anti-lockout |
| `useRevokeSession` | `authKeys.sessions()` | nếu revoke chính `isCurrent` → logout |
| `useRevokeOtherSessions` | `authKeys.sessions()` | |
| `useUpdateProfile` | `authKeys.me()` | cập nhật `user` trong AuthContext |
| `useChangePassword` | `queryClient.clear()` | **revoke all** → toast "vui lòng đăng nhập lại" → về login |
| `useAvatarUpload` | `authKeys.me()` | 3 bước gộp trong 1 mutation: lấy uploadUrl → PUT file → confirm |
| `useRequestDeactivate` | — | toast hướng dẫn check email |
| `useConfirmDeactivate` | `queryClient.clear()` | về trang tạm biệt |

### 6.3 Tiêu chí hoàn thành

- [x] Không hook nào import trực tiếp `auth.service` vào component — component chỉ thấy hook (27 hooks qua barrel `@/hooks/auth` và `@/hooks`).
- [x] Mọi mutation có `onError` toast đúng ngữ cảnh; không toast trùng với interceptor (đã loại trừ status 0, >= 500, 429 RATE_LIMIT_EXCEEDED đã toast ở axios interceptor, và 422 inline form validation).
- [x] Login/GoogleLogin/Verify2FA đều trả discriminated union để trang xử lý nhánh 2FA (`requires2FA: true` kèm `tempToken` vs `LoginSuccessResponse`).
- [x] Sau logout/changePassword/resetPassword/confirmDeactivate, cache bị clear hoàn toàn (`queryClient.clear()`, `tokenStore.clear()`, không rò rỉ dữ liệu user cũ).

---

## Bước 7 — Pages / Components

**Quy tắc chung:** Trang = Client Component gọi hook, render theo `isPending / isError / data` (react-query). Không có logic fetch trong JSX. Component UI tái dùng đặt ở `src/components/ui` (design system) và `src/components/features/auth/`.

### 7.1 Route guards

- `middleware.ts` — lớp 1 (server, check cookie tồn tại) — xem Bước 3.6
- `app/(auth)/layout.tsx` — lớp 2 (client: `/me`, `mustChangePassword`, `isActive`)
- `app/(public)/layout.tsx` — nếu đã đăng nhập → redirect `/` (dùng `useMe`)

> **Phát sinh thực tế (2026-10-20):**
>
> 1. **Next 16 đổi tên `middleware.ts` → `proxy.ts`** — file đã có sẵn từ Bước 3 với tên mới, 7.1 chỉ điều chỉnh logic.
> 2. **Quyết định `/2fa` (cảnh báo #8 Bước 3):** đưa `/2fa` sang nhóm `(public)` — giữa luồng 2FA user chưa có session cookie, guard nhóm `(auth)` không bảo vệ được gì thêm (tempToken ở sessionStorage). Proxy xóa `/2fa` khỏi danh sách protected và thêm vào public-auth (user ĐÃ đăng nhập mở `/2fa` → về `/`). Trang 2FA tự guard bằng tempToken (placeholder đã làm mẫu, 7.2 hoàn thiện).
> 3. **`app/(public)/layout.tsx` dùng `useAuth()` thay vì `useMe()`** như kế hoạch gốc: AuthProvider đã phục hồi session qua `/auth/me` ở root — `status` là nguồn duy nhất, dùng `useMe` sẽ gọi `/me` lần 2. Layout luôn render children (Next 16 constraint như (auth) layout), redirect qua effect — điều này chặn được điều hướng client-side (SPA), thứ proxy không chạy.
> 4. **Purge cookie khi session hết hạn (fix bounce loop):** BE không clear cookie khi refresh fail (`auth.controller.ts` refresh → `next(error)`) → cookie cũ khiến proxy thấy "có session" và bounce `/login → / → /login` mỗi lần tải trang. Fix: `purgeSessionCookies()` trong `lib/axios.ts` — gọi `POST /auth/logout` bằng client trần (route không có `authMiddleware`, luôn xóa cookie, cần body `{}` vì `logoutSchema` là zod object). Gọi trong `AuthProvider.handleSessionExpired` (chỉ khi refresh bị BE từ chối thật sự — không gọi khi lỗi mạng, session còn hiệu lực).
> 5. **Màn `isActive=false` của (auth) layout hiện không reachable qua `/me`:** BE `getMe` trả 404 `NOT_FOUND` khi user inactive → FE nhận `unauthenticated` chứ không thấy `MeDto.isActive=false`. Giữ code theo kế hoạch 3.6 (phòng khi BE đổi) + thêm nút Đăng xuất để user có lối thoát. Cần hỏi BE nếu muốn FE phân biệt trạng thái này.
> 6. **Trang gốc `/`** chuyển thành server redirect → `/dashboard` (thay template mặc định) — điểm hạ cánh của các redirect guard.
> 7. **Placeholder để guard kiểm thử được:** `app/(public)/2fa/page.tsx` + `app/(auth)/change-password/page.tsx` (trang tạm, 7.2 thay thật). Test E2E: `scripts/test-step7-1-e2e.py` (Playwright — proxy 2 lớp, /2fa 3 trạng thái, purge cookie chống bounce, mustChangePassword ép redirect, có flip DB tạm + restore).
> 8. **Kết quả test (2026-10-20):** `test-step7-1-e2e.py` **17/17 đạt**; regression `test-step3-e2e.py` **18/18 đạt** (cập nhật 1 assertion: `/login` khi đã login giờ kết thúc ở `/dashboard` vì trang gốc `/` redirect tiếp — hành vi mới đúng). Lưu ý khi viết test: Playwright 1.60 cấm cookie dict có cả `url` lẫn `path`; forge token hết hạn phải dùng `JWT_REFRESH_SECRET` cho refresh (HS256) — tránh dùng refresh token đã rotate vì BE revoke toàn bộ session (reuse detection).

### 7.2 Chi tiết từng trang

**Trang công khai — `(public)/`:**

| Trang | Hành vi bắt buộc |
|-------|------------------|
| `/login` | Form email+password. Lỗi 401 → hiển thị "sai thông tin, còn **n** lần thử" (message BE đã có sẵn). Lỗi 423 `ACCOUNT_LOCKED` → đếm ngược số phút từ message. 403 `USER_INACTIVE` → hiện banner + nút "gửi lại mail xác minh" (gọi resend). Thành công → `requires2FA` ? chuyển `/2fa` (kèm tempToken) : redirect `next` query hoặc `/`. TempToken lưu trong state trang + `sessionStorage` (đề phòng reload trong 5 phút) |
| `/register` | Checklist password policy **realtime** (8+ ký tự, hoa, thường, số, ký tự đặc biệt). Tích hợp Cloudflare Turnstile widget → đưa token vào `turnstileToken`. Thành công → màn "check email" (KHÔNG nói email đã tồn tại hay chưa — anti-enum) |
| `/verify-email` | Đọc `?token=` → gọi `verifyEmail` → thành công: nút về login; `TOKEN_EXPIRED`: nút gửi lại (resend) |
| `/forgot-password` | Email + Turnstile → **luôn** hiện "nếu email tồn tại, link reset đã được gửi" (anti-enum) |
| `/reset-password` | Đọc `?token=` → form mật khẩu mới + checklist policy → thành công → login (session đã bị revoke hết) |
| `/auth/callback` | Google redirect về đây: đọc `code` + `state` từ query. State có prefix `link:` → luồng **liên kết** (`linkSocial`) → về /settings/security; còn lại → `googleLogin({ code, redirectUri })` → nhánh `requires2FA` như login. Xử lý lỗi `state` không khớp (CSRF) → hiển thị lỗi chung |

**Trang cần đăng nhập — `(auth)/`:**

| Trang | Hành vi bắt buộc |
|-------|------------------|
| `/2fa` | Nhập 6 ô số (hoặc 1 ô chấp nhận backup code `XXXX-XXXX`). Đếm ngược 5 phút hiệu lực tempToken → hết hạn: nút "đăng nhập lại". Sai code: toast + vẫn giữ tempToken để thử lại |
| `/change-password` | Form oldPassword+newPassword (checklist policy). Lưu ý user Google-only: BE trả 400 `BAD_REQUEST` "chưa có mật khẩu" → hướng dẫn dùng forgot-password. Thành công → toast + **về `/login`** (session bị revoke hết) |
| `/settings/security` | Tabs: **2FA** (trạng thái từ `me.twoFactorEnabled`; bật → QR từ `otpauthUrl` → nhập code → **modal backupCodes 1 lần** bắt xác nhận "đã lưu" + nút tải .txt; tái tạo → yêu cầu TOTP + password; tắt → code + password) — **Sessions** (bảng thiết bị, nút thu hồi từng cái / tất cả thiết bị khác, đánh dấu `isCurrent`) — **Social** (danh sách đã link, nút link Google / unlink, cảnh báo anti-lockout) — **Password** (đổi mật khẩu) — **Vô hiệu hóa tài khoản** (nhập password + reason → xác nhận qua email) |
| `/verify-email/deactivate` (xác nhận deactivate) | Đọc token từ link email → gọi `confirmDeactivate` → màn "tạm biệt" (link email: `${APP_URL}/verify-email/deactivate?token=...` — notification-service). Guard 2 lớp có ngoại lệ cho path này (user đang đăng nhập bấm link không bị đá về "/") |

### 7.3 Tiêu chí hoàn thành

> **Phát sinh thực tế (2026-10-20) — trang /login hoàn thành (Bước 7.2):**
>
> - Dùng **react-hook-form + zod** (đã thêm `react-hook-form@^7`, `zod@^4`, `@hookform/resolvers@^5` — v6 resolvers xung đột peer effect nên chọn v5). Validation client: email định dạng + password bắt buộc; 422 từ BE map vào đúng field qua `setError`.
> - Cấu trúc `src/components/features/auth/`: `auth-shell.tsx` (vỏ chung 4 trang form đơn giản), `auth-footer-link.tsx`, `turnstile-field.tsx` (wrapper widget Cloudflare, đọc `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — chưa cấu hình site key nên widget chưa render, BE sẽ trả CAPTCHA_REQUIRED để xử lý), `forms/login-form.tsx`.
> - Logic lỗi: 401 → banner inline hiển thị nguyên message BE (kèm "còn n lần thử"), xóa mật khẩu để nhập lại; 423 → banner + **đếm ngược mm:ss** parse số phút từ message BE, disable nút đăng nhập trong lúc đếm; 403 → banner + nút "Gửi lại email xác minh" (useResendVerification + TurnstileField khi có site key); 429/5xx/mạng → chỉ toast toàn cục của interceptor (không banner đè).
> - Luồng 2FA: tempToken lưu `sessionStorage["ppe.tempToken"]` (trang /2fa đọc lại — "state trang" sẽ xử lý khi làm trang /2fa thật); `next` query được bảo vệ open-redirect (`startsWith("/") && !startsWith("//")`).
> - Form dùng hooks Bước 6 (`useLogin`, `useResendVerification` với `suppressToast: true` cho lỗi cần hiển thị inline) — đạt tiêu chí "không gọi auth.service trực tiếp".
> - Lưu ý quan sát khi test 423: message BE báo "thử lại sau 25 phút" trong khi DB flip +5 phút — nghi ngờ lệch múi giờ giữa container identity (UTC) và psql session (+07) khi đọc cột `locked_until` → cần kiểm tra kiểu cột (timestamptz vs timestamp) phía BE.
> - Test: `scripts/test-step7-2-login-e2e.py` 15/15 (render + zod + 401 + 423 đếm ngược + 403 banner + next redirect, có restore DB). Regression `test-step3-e2e.py` 18/18 (sửa assert: login sai giờ là banner `form [role=alert]` thay vì toast — **toast lỗi cũng có `role="alert"` nên selector phải scope trong form**), `test-step7-1-e2e.py` 17/17.
> - **Bug full-width ＠ (2026-10-20):** nhập `admin＠ppe.local` (＠ U+FF20 từ copy-paste/IME) → zod `z.email()` reject → "Email không hợp lệ" dù nhìn đúng. Chrome strip ZWSP (U+200B) và chấm full-width (U+FF0E) khỏi input `type=email` nhưng **giữ nguyên ＠** → chỉ ＠ gây lỗi. Fix: `src/lib/email.ts` `normalizeEmail()` (＠→@, ．→., ideographic space→space, bỏ ký tự vô hình) — áp dụng schema login/register/forgot (`z.string().transform(normalizeEmail).pipe(z.string().min(1)).pipe(z.email())` — transform phải ĐẶT TRƯỚC để message "bắt buộc" đúng với giá trị đã chuẩn hóa). zodResolver trả values đã transform → API nhận email sạch. Regression: 3 suite E2E xanh (15/15 + 15/15 + 11/11), thêm `scripts/test-email-normalize.py`.
>
> **Phát sinh thực tế (2026-10-20) — trang /forgot-password hoàn thành (Bước 7.2):**
>
> - Cấu trúc bám theo register-form: `forms/forgot-password-form.tsx` + `app/(public)/forgot-password/page.tsx` (AuthShell), dùng `useForgotPassword` (Bước 6, `suppressToast: true`) — không gọi auth.service trực tiếp.
> - Turnstile action `forgot_password` (khớp `TURNSTILE_ACTION` BE). 422 map field; CAPTCHA lỗi → banner vàng + reset widget; 429/5xx/mạng → chỉ toast interceptor.
> - Anti-enum: màn "Kiểm tra email của bạn" luôn giống nhau — BE `forgotPassword` **luôn 200** kể cả email không tồn tại hay đang cooldown 60s (cooldown là *graceful*, KHÁC resend-verification trả 429 `TOO_MANY_REQUESTS` → không cần đếm ngược trên nút như ma trận lỗi ghi, BE đã nuốt).
> - Test: `scripts/test-step7-2-forgot-password-e2e.py` 11/11 (render + zod + CAPTCHA_REQUIRED BE thật + mock 422 + mock 200 anti-enum + nút về login). Regression `test-step7-2-login-e2e.py` 15/15.
>
> **Phát sinh thực tế (2026-10-21) — trang /reset-password hoàn thành (Bước 7.2):**
>
> - Cấu trúc bám theo register/forgot-password: `forms/reset-password-form.tsx` + `app/(public)/reset-password/page.tsx` (AuthShell), dùng `useResetPassword` (Bước 6, `suppressToast: true`) — không gọi auth.service trực tiếp.
> - **Không có Turnstile**: `resetPasswordSchema` (BE) không nhận `turnstileToken` — token trong link email đã là yếu tố xác thực (spec 7.2 không yêu cầu captcha cho trang này).
> - Token đọc từ `window.location.search` 1 lần duy nhất lúc mount (state `undefined` = đang xác định → render `Loader`; `null` = link thiếu token → màn "Liên kết không hợp lệ" + nút yêu cầu liên kết mới). KHÔNG dùng `useSearchParams` — bản Next này build production bắt buộc Suspense boundary cho page tĩnh dùng hook đó, trong khi `(public)` layout đang có constraint `cacheComponents` phải render page segment trong pass prerender.
> - Checklist password policy realtime 5 tiêu chí (khớp `resetPasswordSchema` BE) — nhân bản cục bộ từ register-form với nhãn `resetPassword.checklist.*` (chưa tách shared component; cân nhắc khi làm change-password trang thứ 3).
> - Lỗi: 400 `TOKEN_INVALID`/`TOKEN_EXPIRED` → banner đỏ i18n + nút "Yêu cầu liên kết mới" → `/forgot-password`; 422 map field `newPassword`; 429/5xx/mạng → chỉ toast interceptor. `autoComplete="new-password"` cho trình quản lý mật khẩu.
> - Thành công: hook đã dọn `tokenStore` + `queryClient` + `setUser(null)` (BE revoke toàn bộ session) → màn "Đặt lại mật khẩu thành công" render bình thường dưới guard (public), nút "Đăng nhập ngay" → `/login`.
> - Test: `scripts/test-step7-2-reset-password-e2e.py` 17/17 (render + màn link không hợp lệ + zod + checklist realtime + TOKEN_INVALID BE thật + mock TOKEN_EXPIRED/422/200 + nút về login). Regression forgot-password 12/12, register 16/16, step7-1 17/17, step3 18/18. Lưu ý: suite login & step7-1 thỉnh thoảng flaky trong môi trường hiện tại (đếm ngược 423 lệch giây gây hydration mismatch, Turnstile headless lúc cấp token lúc không) — chạy lại là xanh, không liên quan trang mới.
> - ✅ BE đã sửa cho khớp (2026-10-21): `mail.config.ts` (identity + media) đổi `verificationUrl` → `${appUrl}/verify-email`, `resetPasswordUrl` → `${appUrl}/reset-password` (notification đã sửa trước đó); link deactivate tự động thành `${appUrl}/verify-email/deactivate?token=...` (khớp route FE). Identity `.env` + `.env.example` thêm `APP_URL="http://localhost:3000"` (origin FE — trước đó identity thiếu nên fallback `localhost:7777`). Container identity đã rebuild + recreate để nhận env mới (compose đọc env_file chỉ khi recreate).
>
> **Phát sinh thực tế (2026-10-21) — trang /verify-email hoàn thành + fix link email & register 500:**
>
> - Cấu trúc: `forms/verify-email-form.tsx` + `app/(public)/verify-email/page.tsx` (AuthShell), dùng `useVerifyEmail` + `useResendVerification` (Bước 6, `suppressToast: true`).
> - Trang tự gọi `GET /auth/verify-email?token=` ngay khi mở — token dùng 1 lần nên có guard chống StrictMode double-fire (ref + E2E assert đếm request == 1). Token đọc trong `useEffect` (KHÔNG đọc `window.location` ở initial state — server render không thấy URL → hydration mismatch; pattern reset-password dùng state `undefined` "đang xác định" cũng tương đương).
> - Trạng thái: `TOKEN_EXPIRED` → panel nhập email + Turnstile (action `resend_verification`) + nút gửi lại — resend luôn trả 200 (anti-enum) → màn "Kiểm tra email của bạn"; `TOKEN_INVALID`/thiếu token → màn link không hợp lệ; 5xx/mạng → màn lỗi + nút Thử lại; 422 map field; 429 → toast interceptor.
> - **Fix BE đăng ký 500**: schema Prisma có cột `type` (`verification_tokens`) nhưng chưa migrate → mọi register 500 ở `verificationToken.create()` (user test thật phát hiện 2026-10-21). Đã chạy `prisma migrate dev --name add_verification_token_type` — kèm drift cũ (drop 4 bảng notification tàn dư trong identity DB do tách microservice).
> - **Fix link email**: notification-service build link từ `mailConfig.appUrl` default `localhost:7777` + path API (`/api/v1/auth/verify-email`) → set `APP_URL=http://localhost:3000` trong `smart-ppe-notification-service/.env` + đổi `verificationUrl`/`resetPasswordUrl` thành trang FE (`/verify-email`, `/reset-password`) trong `mail.config.ts`, rebuild container notification_service. ⚠️ Email cũ gửi trước fix có link chết (7777) — phải dùng email gửi lại, hoặc tự ghép `http://localhost:3000/verify-email?token=<token cũ>` (token cũ vẫn còn hiệu lực 24h nếu chưa dùng).
> - Test: `scripts/test-step7-2-verify-email-e2e.py` 16/16 (mock 200/TOKEN_EXPIRED/TOKEN_INVALID/500+retry/resend 200+422, widget gate, verify gọi đúng 1 lần, console sạch).
>
> **Phát sinh thực tế (2026-10-21) — trang /auth/callback (Google OAuth2) hoàn thành (Bước 7.2):**
>
> - Cấu trúc: `app/(public)/auth/callback/page.tsx` (không dùng AuthShell — trang trung chuyển, card lỗi gọn) + `src/lib/oauth.ts` (state OAuth, `TEMP_TOKEN_STORAGE_KEY` dùng chung với login-form và /2fa — trước đây mỗi nơi hardcode `"ppe.tempToken"`).
> - Luồng: đọc `code`/`state`/`error` từ query (đọc trong `useEffect`, không đọc URL ở initial state — tránh hydration mismatch như pattern verify-email) → `?error=` (user hủy) → màn hủy; thiếu `code` hoặc `state` không khớp bản lưu sessionStorage → màn lỗi chung (chống CSRF, state bị xóa sau 1 lần dùng — chống replay); hợp lệ → `useGoogleLogin({ code, redirectUri })` với `redirectUri = ${NEXT_PUBLIC_APP_URL}/auth/callback` → `requires2FA` → lưu tempToken → `/2fa`; thành công → hook đã lưu token + AuthContext → `/` (trang gốc chuyển tiếp /dashboard). Guard ref chống StrictMode double-fire (Google chỉ chấp nhận đổi code đúng 1 lần). Lỗi API hiển thị message BE inline (suppressToast).
> - Nút "Đăng nhập bằng Google" trên /login (form): `useGoogleUrl` (`enabled` theo params + `retry: false` — click nút mới fetch), click → sinh `state` (`crypto.randomUUID`) → lưu sessionStorage → đổi URL → `window.location.assign`. Gate `feature.social_login.enabled` qua mounted-state (`useEffect setMounted`) — flag đến từ query async, render nút sau hydrate để tránh mismatch server/client HTML (Next prerender client components).
> - **BE Google OAuth đã cấu hình (2026-10-21)** — `smart-ppe-identity-service/.env` thêm `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (OAuth app Testing `ppe-monitoring-512306`) + `GOOGLE_OAUTH_ALLOWED_REDIRECT_URIS="http://localhost:3000/auth/callback"`. **Lưu ý vận hành:** `docker restart identity_service` KHÔNG nạp lại env_file — phải `docker compose up -d identity-service` (recreate container). Verify: `GET /auth/google/url?redirectUri=http://localhost:3000/auth/callback` → URL accounts.google.com thật (client_id, scope openid email profile, access_type=offline, prompt=consent); redirectUri ngoài allowlist (evil.com) → `VALIDATION_ERROR` (chống open redirect). ⚠️ Secret chỉ nằm ở .env dev — không commit git.
> - Đường đi thành công (đổi code thật, kể cả nhánh 2FA) còn chờ **Test users trong Google Cloud Console** (OAuth app chế độ Testing chỉ cho phép email trong danh sách Test users — việc thủ công của người quản lý Google Cloud). Test thủ công theo `docs/test-cases/auth.md` mục 6 (GOOGLE-2xx) — milestone M4.
> - Test: `scripts/test-step7-3-google-callback-e2e.py` **21/21** (2026-10-21, sau khi BE cấu hình) — nút Google render + click → điều hướng accounts.google.com THẬT (client_id/redirect_uri/scope/state khớp sessionStorage) + 3 nhánh lỗi callback + state khớp + code giả → BE đổi code với Google thật → invalid_grant hiển thị inline + replay + link mode mock 200/400 + console sạch. Regression: `test-step7-2-login-e2e.py` 15/15, `test-step7-1-e2e.py` 17/17. ⚠️ Lưu ý chạy suite dồn dập gặp 429 auth rate limit (BE: 30 req/15 phút) → login "kẹt" ở /login giả như bug — reset bằng `docker restart identity_service` (limiter in-memory, xem 7.4).
>
> **Phát sinh thực tế (2026-10-21) — trang /2fa thật hoàn thành (Bước 7.2):**
>
> - Cấu trúc: `forms/two-factor-form.tsx` + `app/(public)/2fa/page.tsx` (thay placeholder). Guard trang: mở `/2fa` không có tempToken (`sessionStorage["ppe.tempToken"]`) → redirect `/login`.
> - Nhập mã: 6 ô OTP riêng (gõ tự nhảy, paste 6 số vào ô đầu, backspace lùi ô, `inputMode="numeric"`) — mode "Dùng mã dự phòng" chuyển sang 1 ô `autocomplete="one-time-code"`, chấp nhận `XXXX-XXXX` và tự uppercase trước khi gửi. Zod theo mode (`/^\d{6}$/` hoặc `/^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/`).
> - Đếm ngược 5 phút hiệu lực tempToken (mm:ss, parse `exp` JWT nếu decode được — fallback 5:00 khi token rác) → hết hạn: màn "mã đã hết hạn" + nút "Đăng nhập lại" (xóa tempToken, về /login).
> - Lỗi: 401 `TOKEN_EXPIRED`/`TOKEN_INVALID` (BE thật — tempToken rác) → màn hết hạn; 400 `TWO_FACTOR_INVALID_CODE` → toast + xóa các ô + **giữ tempToken** để thử lại; 401 `INVALID_CREDENTIALS` (backup code sai) → toast tương tự. Thành công → hook lưu token + AuthContext → redirect `next` (bảo vệ open-redirect) hoặc `/dashboard`, xóa tempToken.
> - **Phát sinh — React warning `non-boolean attribute`:** `FormField` (ui/form) `cloneElement` inject `error: true` vào child — khi child là host element (`div role="group"` chứa 6 ô OTP) React 19 cảnh báo `Received true for a non-boolean attribute error`. Fix tại `form-field.tsx`: chỉ inject `error` khi `typeof child.type !== "string"` (component); host element nhận error qua `aria-invalid` + `FormMessage` như cũ.
> - **Phát sinh — mock 200 phải kèm Set-Cookie:** token giả chỉ ở memory (tokenStore) — proxy LỚP 1 chỉ check SỰ HIỆN DIỆN cookie, RSC fetch `/dashboard` sau `router.replace` sẽ bị 307 đá về `/login` → loop vô hạn. Mock verify 2FA thành công phải `Set-Cookie` accessToken/refreshToken giả + catch-all 200 cho 2 origin API (đăng ký TRƯỚC — Playwright route LIFO) để prefetch không 401; trước bước quay lại luồng public phải `context.clear_cookies()` (cookie giả khiến proxy đá /login, /2fa về "/").
> - Test: `scripts/test-step7-2-two-factor-e2e.py` **16/16** (guard + render 6 ô + countdown + zod 2 mode + auto-advance + 401 BE thật + mock sai mã giữ tempToken + mock 200 về dashboard + payload backup uppercase + console sạch).
>
> **Phát sinh thực tế (2026-10-21) — trang /change-password thật hoàn thành (Bước 7.2):**
>
> - Cấu trúc: `forms/change-password-form.tsx` + `app/(auth)/change-password/page.tsx` (thay placeholder); form cũng được tái dùng trong tab Password của /settings/security (`settings/password-panel.tsx`). Checklist policy 5 tiêu chí realtime = component `password-checklist.tsx` (tách dùng chung, label i18n theo prefix).
> - Google-only: 400 `BAD_REQUEST` → banner vàng (message BE) + gợi ý i18n + nút "Tạo mật khẩu qua Quên mật khẩu" → `useLogout` rồi chuyển `/forgot-password`. **Phát sinh — phải hard navigation:** `router.replace` trong onSuccess thua race với guard `(auth)` layout (status → unauthenticated → `replace("/login?next=...")` chạy sau, hủy transition) → dùng `window.location.assign("/forgot-password")` (logout xong nhảy thẳng, guard không kịp chạy).
> - 401 `INVALID_CREDENTIALS` (BE thật) → banner i18n "Mật khẩu hiện tại không chính xác." + xóa ô oldPassword + focus. **Phát sinh:** BE trả message tiếng Anh ("Invalid old password") → FE map sang i18n thay vì hiển thị nguyên message BE như login (UI dự án tiếng Việt).
> - Thành công → hook đã dọn `tokenStore` + cache + `setUser(null)` + emit `auth:session-expired` (BE thu hồi TOÀN BỘ session) → `router.replace("/login")`.
> - **⚠️ Phát sinh nghiêm trọng khi viết test:** endpoint thật là **PUT `/auth/password`** — mock pattern đầu tiên viết nhầm `**/auth/change-password` → request THẬT lọt qua và đổi mật khẩu admin thật. Đã restore mật khẩu gốc qua API (login bằng mật khẩu mới → PUT đổi lại). Bài học: luôn đối chiếu pattern mock với `auth.service.ts` trước khi chạy.
> - **Phát sinh — mock 200 phải clear cookie TRONG handler:** Playwright áp dụng `Set-Cookie: Max-Age=0` TRỄ hơn JS onSuccess → `router.replace("/login")` chạy trước khi cookie bị xóa → proxy đá /login về "/". Fix: gọi `context.clear_cookies()` ngay đầu mock handler (trước `route.fulfill`).
> - Test: `scripts/test-step7-2-change-password-e2e.py` **14/14** (render + checklist + zod + 401 BE thật + mock 422 map field + Google-only → logout → /forgot-password + mock 200 dọn session về /login + console sạch).
>
> **Phát sinh thực tế (2026-10-21) — trang /settings/security hoàn thành (Bước 7.2):**
>
> - Cấu trúc: `app/(auth)/settings/security/page.tsx` (server component + Suspense, pattern như dashboard để qua validation `cacheComponents`) + `security-settings-content.tsx` (tab shell client, skeleton khi `!user`) + 5 panel trong `components/features/auth/settings/`.
> - **Tab 2FA:** 3 trạng thái — chưa bật (card + nút "Bật xác thực hai yếu tố"), đang setup (`useSetup2FA` → QR render từ `otpauthUrl` bằng `qrcode` lib + secret + ô nhập code), đã bật (nút "Tạo lại mã dự phòng" / "Tắt xác thực hai yếu tố"). Enable thành công → **modal backupCodes 1 lần** (8 mã, checkbox "đã lưu" mở khóa nút "Hoàn tất", nút tải .txt). Regenerate → TOTP + password (password OPTIONAL cho user Google-only). Disable → chấp nhận TOTP 6 số HOẶC backup `XXXX-XXXX` + password. Lỗi: `TWO_FACTOR_INVALID_CODE` → gắn dưới ô code + xóa; `INVALID_CREDENTIALS` → gắn dưới ô password + xóa.
> - **Tab Sessions:** bảng thiết bị (`useSessions`, staleTime 60s), badge "Thiết bị hiện tại" (`isCurrent`), revoke từng phiên (2 bấm xác nhận inline), "Thu hồi tất cả thiết bị khác" chỉ hiện khi có phiên khác phiên hiện tại.
> - **Tab Social:** danh sách đã liên kết, link Google (click → `state = "link:" + uuid` → `saveOAuthState` → `useGoogleUrl` → `window.location.assign`), unlink 2 bấm xác nhận, 400 anti-lockout → cảnh báo inline (không toast đè).
> - **Tab Deactivate:** password + lý do (max 500). 400 `INVALID_CREDENTIALS` → banner + xóa ô; **400 `VALIDATION_ERROR` không có `errors` array (Google-only)** → banner hiển thị message BE; thành công → màn "Kiểm tra email của bạn".
> - **Phát sinh khi test:** sessions/social có `staleTime: 60s` → mock đăng ký giữa trang KHÔNG được gọi — phải `page.reload()` để queryClient mới chạm mock. Bước "Liên kết Google" assign sang accounts.google.com bị abort → không đọc được sessionStorage trên trang lỗi — quay về cùng origin rồi đọc (sessionStorage giữ theo tab + origin). Check "nút thu hồi tất cả" phải nhất quán với số phiên THẬT (admin dev có nhiều phiên từ các lần login test — không giả định chỉ 1 phiên).
> - Test: `scripts/test-step7-2-settings-security-e2e.py` **33/33** (5 tab render + 2FA enable/regenerate/disable mock + QR + modal backupCodes + sessions BE thật + revoke mock + social link/unlink + anti-lockout + password 401 BE thật + deactivate sai mật khẩu BE thật + mock 200 + console sạch).
>
> **Phát sinh thực tế (2026-10-21) — trang xác nhận vô hiệu hóa tài khoản hoàn thành (Bước 7.2):**
>
> - Cấu trúc: `app/(public)/verify-email/deactivate/page.tsx` — token đọc từ `window.location.search` trong `useEffect` (không đọc URL ở initial state — hydration mismatch), guard ref chống StrictMode double-fire (confirm gọi đúng 1 lần).
> - Trạng thái: thiếu token / `TOKEN_INVALID` / `TOKEN_EXPIRED` (BE thật với token rác) → màn "Liên kết không hợp lệ" + nút về /login; 5xx/mạng → màn lỗi + nút "Thử lại" (đọc lại token, mutate lại); 200 → màn "tạm biệt" "Tài khoản đã được vô hiệu hóa" + nút về /login.
> - **Ngoại lệ guard 2 lớp:** link email đến từ notification-service khi user ĐANG đăng nhập — `proxy.ts` (thêm `DEACTIVATE_CONFIRM_PREFIX = "/verify-email/deactivate"`) và `(public)` layout đều bỏ qua bounce về "/" cho path này (đồng bộ 2 tầng).
> - Test: `scripts/test-step7-2-deactivate-confirm-e2e.py` **10/10** (thiếu token + TOKEN_INVALID BE thật + đếm request == 1 + mock TOKEN_EXPIRED/500→retry→200 + user đang đăng nhập mở link không bị bounce + console sạch).
>
> **Phát sinh thực tế (2026-10-21) — link mode Google (Social → callback) hoàn thành:**
>
> - `app/(public)/auth/callback/page.tsx`: state có prefix `link:` (lưu bởi SocialPanel qua `saveOAuthState`) → gọi `useLinkSocial({ provider: "GOOGLE", code, redirectUri })` thay vì `useGoogleLogin` → thành công `router.replace("/settings/security")`; lỗi → màn linkError + nút "Về cài đặt bảo mật" (không phải về /login).
> - **Bug hệ thống phát hiện khi test:** user ĐANG đăng nhập bấm link Google → về `/auth/callback` mang theo cookie → proxy (nằm trong PUBLIC_AUTH_PREFIXES) + `(public)` layout đá về "/" → link flow hỏng. Fix 2 tầng: thêm `OAUTH_CALLBACK_PREFIX = "/auth/callback"` vào ngoại lệ proxy.ts + `(public)` layout (callback phải chạy được cho CẢ 2 chế độ: đăng nhập — chưa có cookie; liên kết — đang có cookie).
> - Test: `scripts/test-step7-3-google-callback-e2e.py` nâng lên **17/17** (thêm bước 8-9: mock link 200 → payload GOOGLE + code → /settings/security; link lỗi → màn linkError + nút về cài đặt; cookie giả để proxy cho qua /settings).

### 7.3 Tiêu chí hoàn thành

- [ ] Không trang nào gọi `auth.service` trực tiếp
- [ ] Mọi form có trạng thái `isPending` (disable button, spinner) và `isError` (thông báo rõ ràng)
- [ ] 422 hiển thị lỗi đúng field (map `errors[{field, message}]` vào từng input)
- [ ] Login flow E2E: sai 5 lần → khóa 15 phút hiển thị đếm ngược; có 2FA → nhập TOTP → vào app; hết hạn tempToken → quay lại login mượt

### 7.4 Tài liệu test case E2E

Tất cả test đặt trong `scripts/` (Playwright Python), chạy `python3 scripts/<file>.py`. Yêu cầu: dev server fe-ppe (:3000), gateway (:80), Docker đang chạy.

**Nguyên tắc test (đảm bảo an toàn môi trường):**
- Đường đi LỖI dùng BE thật (an toàn); đường đi THÀNH CÔNG dùng mock route — không đổi mật khẩu admin thật, không bật/tắt 2FA thật, không gửi request deactivate với mật khẩu ĐÚNG (BE sẽ gửi email thật), không gửi token xác nhận hợp lệ lên BE thật.
- Login sai trong test luôn dùng email KHÔNG tồn tại (tránh khóa tài khoản admin thật); bước login thật chỉ dùng đúng credentials.
- Mọi flip DB tạm phải có bước restore; mock theo đúng endpoint trong `src/services/auth.service.ts` (đối chiếu trước khi chạy — từng có sự cố mock sai pattern làm đổi mật khẩu thật).
- Mock trả 200 kèm điều hướng phải tái hiện hành vi cookie của BE thật (Set-Cookie/clear cookie — proxy LỚP 1 check sự hiện diện cookie).
- Query có `staleTime` (sessions/social 60s) → đăng ký mock xong phải `page.reload()`.
- ⚠️ **Auth rate limit** (BE: 30 req/15 phút cho mọi request `/api/v1/auth/*` kể cả `/auth/me` — cạn là MỌI suite login đều crash vì guard đá redirect). `REDIS_ENABLED=false` trong identity-service → limiter nằm TRONG BỘ NHỚ container → reset bằng `docker restart identity_service` (không phải flush Redis). Chạy hồi quy đủ 14 suite liên tục sẽ vượt ngân sách — nên chạy nhóm nhỏ hoặc restart giữa chừng.

| File | Trang / luồng | Kết quả | Bao phủ chính |
|------|---------------|---------|---------------|
| `test-step3-e2e.py` | Providers + guards + login cơ bản | 18/18 | Provider nesting, guard 2 lớp, login/logout, session-expired, redirect root |
| `test-email-normalize.py` | normalizeEmail | ✓ chạy sạch | Ký tự full-width ＠．, ZWSP, ideographic space trên login/register/forgot (submit qua `form.requestSubmit()` — gate Turnstile) |
| `test-step7-1-e2e.py` | Route guards Bước 7.1 | 17/17 | Proxy 2 lớp, /2fa 3 trạng thái, purge cookie chống bounce, mustChangePassword (flip DB + restore) |
| `test-step7-2-login-e2e.py` | /login | 15/15 | Render, zod, 401 banner, 423 đếm ngược + khóa, 403 banner + resend, `next` redirect, requires2FA → /2fa |
| `test-step7-2-register-e2e.py` | /register | 16/16 | Checklist policy realtime, Turnstile, mock 200 → check email, 422 map field |
| `test-step7-2-forgot-password-e2e.py` | /forgot-password | 12/12 | Anti-enum luôn 200, CAPTCHA_REQUIRED BE thật, mock 422/200, nút về login |
| `test-step7-2-reset-password-e2e.py` | /reset-password | 17/17 | Link không hợp lệ, TOKEN_INVALID BE thật, mock TOKEN_EXPIRED/422/200, checklist realtime |
| `test-step7-2-verify-email-e2e.py` | /verify-email | 16/16 | Verify gọi đúng 1 lần (StrictMode), TOKEN_EXPIRED → resend, mock 200/500+retry, widget gate |
| `test-step7-2-two-factor-e2e.py` | /2fa | 16/16 | Guard tempToken, 6 ô + auto-advance + paste, countdown mm:ss, mode backup XXXX-XXXX, 401 TOKEN_EXPIRED BE thật, mock sai mã giữ tempToken, mock 200 → dashboard |
| `test-step7-2-change-password-e2e.py` | /change-password | 14/14 | Checklist, zod, 401 BE thật → banner i18n + xóa ô, mock 422 map field, Google-only → logout → /forgot-password, mock 200 dọn session → /login |
| `test-step7-2-settings-security-e2e.py` | /settings/security | 33/33 | 5 tab, 2FA enable (QR + modal backupCodes 1 lần + .txt) / regenerate / disable, sessions BE thật + revoke mock, social link (`link:` state) + unlink + anti-lockout, password 401, deactivate sai mật khẩu + mock 200 |
| `test-step7-2-deactivate-confirm-e2e.py` | /verify-email/deactivate | 10/10 | Thiếu token, TOKEN_INVALID BE thật (1 request), mock TOKEN_EXPIRED / 500 → Thử lại → 200, user đang đăng nhập không bị bounce |
| `test-step7-3-google-callback-e2e.py` | /auth/callback + nút Google | 17/17 | Nút Google render, state CSRF + replay, 3 nhánh lỗi, login mode gọi API, **link mode** → /settings/security + màn linkError |
| `test-step8-prefetch-e2e.py` | PrefetchProvider | 7/7 | Prefetch theo role khi authenticated, không prefetch khi 2FA/mustChangePassword |

### 7.5 Quy trình test tay đầu cuối (tự bấm trình duyệt, đi qua mọi trang)

> Mục đích: 1 người test đi từ đầu đến cuối toàn bộ hành trình auth bằng tay, không cần chạy Playwright. Nhánh lỗi dùng BE thật (an toàn); nhánh "sai mật khẩu" KHÔNG dùng admin thật. Môi trường: FE :3000 + gateway :80 + Docker đang chạy.

#### 7.5.0 Chuẩn bị

| Mục | Trạng thái |
|-----|-----------|
| FE app | http://localhost:3000 (design system :3001) |
| Gateway + Docker | :80; `docker ps` thấy `identity_service`, `notification_service`... |
| Email | BE gửi qua SMTP Gmail thật → dùng 1 hộp thư THẬT của bạn; chậm thì check Spam |
| Turnstile | BẬT (site key thật) → register/forgot/resend có widget, tick bình thường |
| Google OAuth | **CHƯA cấu hình BE** → luồng Google thật chưa test được (mục 7.5.5) |
| Chính sách mật khẩu | ≥ 8 ký tự, có hoa + thường + số + ký tự đặc biệt |
| Rate limit | 30 req/15 phút cho MỌI request `/api/v1/auth/*` — dính 429 (bị đá khỏi app) → `docker restart identity_service` rồi chạy tiếp |
| Tài khoản seed | `admin@ppe.local` / `Admin@123456`; `user@template.local` / `User@123456` (role USER) |

⚠️ Ghi lại mật khẩu sau MỖI bước đổi (đổi mật khẩu thu hồi toàn bộ session). Sai mật khẩu 5 lần = khóa 15 phút; nếu lỡ khóa tài khoản test:

```bash
docker exec ppe_postgres psql -U postgres -d ppe_identity_db -c \
  "UPDATE users SET failed_login_attempts=0, locked_until=NULL WHERE email='<email>';"
```

#### 7.5.1 Hành trình chính A — vòng đời 1 user mới

> Thứ tự các bước được sắp để trạng thái không bị phá giữa chừng. Bước A18 giết tài khoản test — để cuối.

| # | Thao tác | Kỳ vọng |
|---|----------|---------|
| A1 | Mở `/register`, gõ email thật + mật khẩu yếu dần | Checklist 5 tiêu chí tick realtime theo từng ký tự. Đủ mạnh + tick Turnstile + submit → màn "Kiểm tra email của bạn" (không phân biệt email đã tồn tại — anti-enum) |
| A2 | `/login` bằng email vừa đăng ký (CHƯA verify) | Banner 403 "Tài khoản chưa được kích hoạt..." + nút "Gửi lại email xác minh" → bấm (tick Turnstile nếu có) → email mới trong hộp thư |
| A3 | Bấm link trong email → `/verify-email?token=...` | Màn "Email đã được xác minh" + nút về đăng nhập. Bấm lại link đó lần 2 → "Liên kết không hợp lệ" (token dùng 1 lần) |
| A4 | Login đúng credentials | Vào `/dashboard` |
| A5 | Đang login, mở `/login`, `/register`, `/forgot-password`, `/2fa` | Tất cả bị đá về `/dashboard` (guard 2 lớp) |
| A6 | `/settings/security` → tab **Sessions** | Bảng phiên, ít nhất 1 dòng badge "Thiết bị hiện tại" |
| A7 | Tab **Password**: nhập SAI mật khẩu hiện tại → nhập đúng + mật khẩu mới | Sai → banner "Mật khẩu hiện tại không chính xác." + ô bị xóa. Đúng → toast + bị đá về `/login` (mọi phiên thu hồi). ⚠️ GHI LẠI mật khẩu mới |
| A8 | Login lại bằng mật khẩu mới | Vào `/dashboard` |
| A9 | Tab **2FA** → "Bật xác thực hai yếu tố" | Hiện QR + secret → quét bằng Google Authenticator/Aegis → nhập TOTP → modal 8 backup codes. ⚠️ Secret hết hạn sau 10 phút (thao tác nhanh); backup codes CHỈ hiện 1 lần → tải .txt + tick "đã lưu" → Hoàn tất. Card chuyển trạng thái "Đã bật" |
| A10 | Logout → login → tới `/2fa` | 6 ô OTP + đếm ngược 5:00. Nhập mã SAI → toast lỗi + xóa ô, VẪN ở `/2fa` → nhập đúng TOTP → `/dashboard` |
| A11 | Logout → login → `/2fa` → "Dùng mã dự phòng" | Nhập 1 mã `XXXX-XXXX` từ .txt (tự uppercase) → vào app. ⚠️ Mã đó mất hiệu lực |
| A12 | Tab 2FA → "Tạo lại mã dự phòng" | Yêu cầu TOTP + mật khẩu → modal 8 mã mới → tải + tick → Hoàn tất |
| A13 | Tab 2FA → "Tắt xác thực hai yếu tố" (TOTP + mật khẩu) → logout → login lại | Login vào thẳng `/dashboard`, KHÔNG còn màn `/2fa` |
| A14 | Mở `/change-password` | Sai mật khẩu hiện tại → banner. Đúng → về `/login` (session thu hồi hết). ⚠️ Ghi mật khẩu mới → login lại |
| A15 | Logout → `/forgot-password` (thử cả 1 email không tồn tại) | Luôn màn "Kiểm tra email của bạn" (anti-enum). Mở email → link `/reset-password?token=` → checklist realtime → mật khẩu mới → màn thành công → "Đăng nhập ngay" → login. ⚠️ Ghi lại |
| A16 | Mở cửa sổ ẩn danh, login cùng tài khoản | Tab Sessions cửa sổ chính (reload) thấy 2 phiên. Revoke phiên kia (2 bấm) → cửa sổ ẩn danh thao tác tiếp bị đá về `/login`. Login lại ở ẩn danh → "Thu hồi tất cả thiết bị khác" → ẩn danh bị logout, cửa sổ chính vẫn hoạt động |
| A17 | Tab **Social** → "Liên kết Google" | Hiện tại lỗi vì BE chưa cấu hình Google (7.5.5) — ghi nhận, bỏ qua |
| A18 | Tab **Vô hiệu hóa tài khoản** (bước cuối — tài khoản test sẽ CHẾT) | Nhập SAI mật khẩu → banner + xóa ô. Nhập đúng + lý do → màn "Kiểm tra email". Mở email → link `/verify-email/deactivate?token=` → màn tạm biệt "Tài khoản đã được vô hiệu hóa" → "Về đăng nhập". Login lại → 403 "tài khoản chưa được kích hoạt hoặc đã bị vô hiệu hóa". ✅ HẾT — chạy lại thì tạo user mới ở A1 |

#### 7.5.2 Nhánh lỗi /login (không đụng tài khoản thật)

| # | Thao tác | Kỳ vọng |
|---|----------|---------|
| B1 | `/login` với email KHÔNG tồn tại + mật khẩu bất kỳ | Banner 401 "sai thông tin, còn n lần thử" (anti-enum) |
| B2 | Sai mật khẩu 5 lần với 1 tài khoản test riêng | Banner 423 + đếm ngược mm:ss, nút đăng nhập bị disable. Mở khóa bằng lệnh ở 7.5.0 |
| B3 | Chưa login, mở `/settings/security` | Về `/login?next=%2Fsettings%2Fsecurity` → login xong về ĐÚNG trang đó |
| B4 | Chưa login, mở `/2fa` | Về `/login` (không có tempToken) |
| B5 | Chưa login, mở `/dashboard`, `/change-password` | Về `/login?next=...` |
| B6 | (Tùy chọn) Chờ 5 phút ở `/2fa` | Màn "mã đã hết hạn" + nút "Đăng nhập lại" (xóa tempToken, về /login) |

#### 7.5.3 Nhánh lỗi link email

| # | Thao tác | Kỳ vọng |
|---|----------|---------|
| C1 | Mở `/verify-email` (không token) | "Liên kết không hợp lệ" + nút về login |
| C2 | `/verify-email?token=abc` | TOKEN_INVALID → "Liên kết không hợp lệ" |
| C3 | Gửi lại email xác minh 2 lần trong < 60s | Lần 2: toast 429 "thao tác quá nhanh" |
| C4 | Mở `/reset-password` (không token / token rác) | "Liên kết không hợp lệ" + nút "Yêu cầu liên kết mới" → `/forgot-password` |
| C5 | Mở `/verify-email/deactivate` (không token / token rác) | "Liên kết không hợp lệ" + nút về login |

#### 7.5.4 Guard & session (kiểm nhanh)

- F5 ở `/dashboard` → giữ session (cookie httpOnly + restore qua `/auth/me`).
- Logout → cache sạch → về `/login`; đang login mở trang public → đá về `/dashboard`.

#### 7.5.5 Google OAuth (CHƯA test được — điều kiện để test sau)

- Hiện tại BE thiếu `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` + allowlist redirect → click nút Google sẽ 500 `CONFIGURATION_ERROR` (FE hiển thị toast "tính năng đang bảo trì").
- Khi BE cấu hình xong (thêm `http://localhost:3000/auth/callback` vào allowlist): login Google → `/auth/callback` → `/dashboard` (user có 2FA thì qua `/2fa`); liên kết Google ở Tab Social → về `/settings/security`.

#### 7.5.6 Checklist tổng kết

- [ ] `/register` (A1) — [ ] `/login` (A2, A4, B1-B3) — [ ] `/verify-email` (A3, C1-C3) — [ ] `/forgot-password` (A15, C4) — [ ] `/reset-password` (A15)
- [ ] `/auth/callback` (7.5.5 — bị giới hạn bởi cấu hình BE) — [ ] `/2fa` (A10-A11, B4, B6) — [ ] `/change-password` (A14)
- [ ] `/settings/security` 5 tab: 2FA (A9, A12-A13) — Sessions (A6, A16) — Social (A17) — Password (A7) — Deactivate (A18)
- [ ] `/verify-email/deactivate` (A18, C5) — [ ] `/dashboard` + guards (A4-A5, B3-B5, F5)

---

## Bước 8 — PrefetchProvider (nâng cao)

**Mục tiêu:** vào dashboard là dữ liệu đã sẵn (tăng UX), prefetch **theo role/permissions**, không prefetch thừa.

### 8.1 Thiết kế

- `PrefetchProvider` mount trong `app/(auth)/layout.tsx` (sau AuthProvider — xem Bước 3.3).
- Khi `status === "authenticated"`, dựa vào `user.role` + `user.permissions` → map ra danh sách query cần prefetch:

```ts
// Minh họa bảng ánh xạ — mở rộng dần khi có service khác
const ROLE_PREFETCH: Record<Role, Array<() => Promise<unknown>>> = {
  ADMIN:    [prefetchSites, prefetchIncidents, prefetchNotifications], // tương lai
  SUPERVISOR: [...],
  USER:     [prefetchNotifications],                                    // tương lai
};
```

- Gọi `queryClient.prefetchQuery({ queryKey, queryFn, staleTime: 5m })` — nếu đã có cache tươi thì không gọi lại.
- Chạy khi tab visible + network idle (tùy chọn), bỏ qua nếu đang trong luồng 2FA.

### 8.2 Áp dụng ngay cho auth

- Prefetch `authKeys.sessions()` nếu user vào settings thường xuyên (hoặc để on-demand khi hover tab).
- **Không prefetch gì nặng ở bước này** — giá trị thật sự nằm ở các service domain khác (sites, incidents, notifications) ở các hành trình sau; bước này dựng khung + cơ chế sẵn sàng.

### 8.3 Tiêu chí hoàn thành

- [x] Vào dashboard → Network tab thấy các query prefetch chạy song song, không chặn render
- [x] Reload trang → query từ cache hiển thị tức thì, refetch nền nếu hết staleTime
- [x] User role khác nhau → prefetch đúng danh sách của role đó

> **Phát sinh thực tế (2026-10-21) — Bước 8 (PrefetchProvider) hoàn thành — KHÔNG phụ thuộc phần còn lại của Bước 7:**
>
> - **Bước 8 xây được độc lập với 7.2**: PrefetchProvider chỉ cần AuthProvider (Bước 3.3) + guard `(auth)` layout (7.1) — cả hai đã xong. Các trang 7.2 còn thiếu (/2fa, /change-password, /settings/security) không chặn bước này.
> - **Cấu trúc**: `src/config/prefetch-jobs.ts` (registry + `resolvePrefetchJobs`) + `src/providers/prefetch-provider.tsx` viết lại. Chọn **job-centric** (mỗi job khai `roles?`/`permissions?`) thay vì map `Record<Role, jobs[]>` trong kế hoạch gốc — job dùng chung cho nhiều role khai 1 lần, không nhân bản; role BE thêm mới tự động nhận job không ràng buộc role.
> - **Sửa bug bản cũ**: prefetch-provider sơ khai (từ Bước 3.3) hardcode `["ADMIN", "SUPERVISOR"]` — **SUPERVISOR không tồn tại** (role hệ thống thật: ADMIN, SAFETY_MANAGER, SAFETY_OFFICER, MANAGER, USER — xem prisma/seed.ts).
> - **Registry hiện tại**: 1 job duy nhất `auth.sessions` (GET /auth/sessions, staleTime 5m) áp dụng **mọi role** — /settings/security là trang cá nhân mà role nào cũng có; chưa có job domain khác (sites/incidents/notifications chưa có FE). Không prefetch `authKeys.me()` (AuthProvider đã fetch) hay `social` (chỉ cần khi mở tab Social).
> - **Cơ chế chạy**: chỉ khi `status === "authenticated"` (luồng 2FA chưa có session → tự bỏ qua, kể cả nếu sau này mount nhầm); bỏ qua khi `mustChangePassword` (sắp bị đá sang đổi mật khẩu — prefetch vô ích). Chạy qua `requestIdleCallback` (timeout 3s, fallback setTimeout) — không tranh chấp render/điều hướng đầu tiên; chạy lại khi tab quay lại `visible` (bù `refetchOnWindowFocus: false` toàn cục — `prefetchQuery` tự no-op nếu cache còn tươi). `retry: false` cho prefetch nền (trang cần sẽ tự fetch lại). StrictMode double-run vô hại (GET idempotent + prefetchQuery dedup) — khác verify-email cần guard vì token dùng 1 lần.
> - **Tiêu chí 8.3 đối chiếu thực tế**: (1) mock sessions delay 4s → dashboard render trước khi response về (E2E đo heading xuất hiện trước lúc fulfill); (2) "từ cache hiển thị tức thì" áp dụng trong SPA session — navigation nội bộ không gọi lại khi cache tươi (đã test bằng visibilitychange synthetic), reload thì prefetch chạy lại nền không chặn render (cache memory mất khi reload, KHÔNG thêm persistQueryClient — kế hoạch không yêu cầu); (3) phân kỳ role được chứng minh ở tầng unit (jobMatchesUser với job synthetic: lọc role, permission ANY-of, kết hợp cả hai).
> - **Test**: `scripts/test-step8-prefetch-unit.ts` (tsx, chạy kèm `--env-file=.env.local`) — registry hợp lệ, 5 role hệ thống đều nhận sessions, role tương lai không crash, lọc role/permission đúng. `scripts/test-step8-prefetch-e2e.py` **7/7** — dùng `async_playwright` (khác convention sync: cần delay route sessions mà không chặn request khác để chứng minh "không chặn render"); flip must_change_password của admin (có restore). Lưu ý test user: `user@ppe.local` KHÔNG có trong DB (seed cũ để lại `user@template.local` / User@123456, role USER) — dùng template user cho test role.
> - **Regression toàn bộ auth (2026-10-21, sau Bước 8)**: 7/8 suite xanh — step3 18/18, step7-1 15/17, login 15/15, register 16/16, forgot 12/12, reset 17/17, verify-email 16/16, google-callback 11/11. 2 check đỏ của step7-1 (check 2: `[data-testid=two-factor-form]` trên /2fa; check 11a: text "Trang đổi mật khẩu tạm" trên /change-password) là do **placeholder 7.1 đang được thay bằng trang thật của 7.2** (hai form mới chưa có testid/text cũ) — KHÔNG phải regression từ PrefetchProvider (các check guard còn lại của step7-1 đều xanh, và check 11b/11c về hành vi mustChange vẫn đạt). Khi hoàn thành trang /2fa và /change-password thật phải cập nhật lại 2 assertion này của step7-1.
> - Lưu ý: cột `must_change_password` nullable — test psql phải `COALESCE(must_change_password, false)` khi đọc/restore.

---

## Ma trận xử lý lỗi toàn cục

| Code (field `code`) | HTTP | Bối cảnh | Hành động UX chuẩn |
|---------------------|------|----------|---------------------|
| `TOKEN_EXPIRED` | 401 | Access token hết hạn | Interceptor tự refresh + retry (im lặng) |
| `TOKEN_EXPIRED` | 401 | Refresh/tempToken 2FA hết hạn | Refresh fail → về login; 2FA → nút "đăng nhập lại" |
| `TOKEN_INVALID` | 401 | Refresh token bị reuse | Session bị revoke toàn bộ → toast cảnh báo + về login |
| `INVALID_CREDENTIALS` | 401 | Login / đổi mật khẩu / deactivate | Hiển thị message BE (có số lần thử còn lại) |
| `USER_INACTIVE` | 403 | Login user chưa verify/bị khóa | Banner + nút resend verification |
| `ACCOUNT_LOCKED` | 423 | Sai mật khẩu 5 lần | Màn đếm ngược 15 phút (parse phút từ message) |
| `TWO_FACTOR_INVALID_CODE` | 400 | Nhập sai TOTP/backup code | Toast + cho nhập lại (tempToken còn hiệu lực) |
| `TWO_FACTOR_ALREADY_ENABLED` | 400 | Bật lại 2FA | Toast + đồng bộ lại `me` |
| `RATE_LIMIT_EXCEEDED` | 429 | Bất kỳ | Toast "thao tác quá nhanh" + đọc header `Retry-After` nếu có |
| `TOO_MANY_REQUESTS` | 429 | Resend verification / forgot | Đếm ngược 60s trên nút |
| `VALIDATION_ERROR` | 422 | Zod validation | Map `errors[]` vào từng field của form |
| `DUPLICATE_ENTRY` | 400/409 | Phone đã tồn tại / social đã link | Toast message BE |
| `CAPTCHA_REQUIRED` / `CAPTCHA_INVALID` | 400 | Turnstile thiếu/sai | Reset widget + yêu cầu tick lại |
| `GOOGLE_AUTH_FAILED` | 401 | idToken/code không hợp lệ | Toast + cho thử lại |
| `CONFIGURATION_ERROR` | 500 | Google chưa cấu hình | Toast "tính năng đang bảo trì" (đừng hiện lỗi kỹ thuật) |
| `SYSTEM_MAINTENANCE` | 503 | Maintenance mode | Trang maintenance toàn cục (không phải toast) |
| Network offline / 5xx khác | — | — | Toast chung "lỗi kết nối, thử lại" (từ interceptor) |

---

## Đảm bảo yếu tố microservice

Kiến trúc backend là nhiều service độc lập sau **Traefik gateway** — frontend phải chuẩn bị từ đầu để không phải refactor khi thêm service:

1. **Domain-first folder**: `types/{domain}.ts` + `services/{domain}.service.ts` + `hooks/{domain}/` — mỗi domain tương ứng 1 backend service. Thêm service mới (sites, cameras, incidents, notifications, media, reporting, ai) = thêm 3 folder, KHÔNG đụng core (lib/providers/contexts).
2. **axios instance factory**: `lib/axios.ts` export hàm `createApiClient(baseURL)` — instance hiện tại cho identity; về sau mỗi service có base URL riêng nhưng **dùng chung interceptor** (auth header + refresh single-flight + chuẩn hóa lỗi). Lưu ý: refresh endpoint luôn thuộc identity-service nên interceptor phải nhận URL refresh cố định, không phụ thuộc baseURL của instance.
3. **Chuẩn response chung**: mọi service dùng chung error middleware → `ApiError` và ma trận lỗi ở trên dùng được cho toàn hệ thống, không cần viết lại.
4. **Cookie & CORS**: cookie `path=/`, `sameSite=lax`, `secure` chỉ khi prod → gọi qua gateway cùng origin thì không vấn đề gì. Khi deploy tách domain (fe.example.com vs api.example.com) phải yêu cầu BE cấu hình `ALLOWED_ORIGINS` + cookie domain/secure phù hợp — ghi vào checklist deploy.
5. **Env tập trung**: `src/config/env.ts` là nơi duy nhất đọc `NEXT_PUBLIC_*` — thêm service mới = thêm 1 dòng, không rải `process.env` khắp code.
6. **Chuẩn bị cho notification service**: BE đã gửi in-app notification khi có thiết bị mới đăng nhập; sau này nối SSE/WebSocket qua service riêng — cấu trúc hook/domain đã sẵn chỗ (`hooks/notifications/`), không cần sửa core.
7. **Maintenance mode**: gateway có middleware 503 — trang maintenance toàn cục đặt ở tầng provider/root layout để phủ mọi service.

---

## Milestones & thứ tự thực hiện

| Milestone | Nội dung | Tiêu chí xong |
|-----------|----------|----------------|
| **M0** | Tiền đề backend (mục 1) | APP_URL, Google OAuth, Turnstile, deactivate link — đã có quyết định/cấu hình |
| **M1** | Bước 1 + 2 + 3: nền tảng + login/logout/me + guard | Login bằng email/password E2E; reload giữ session; 3 request 401 → 1 refresh; logout sạch cache |
| **M2** | Register + verify + resend + forgot/reset (Bước 4-7 phần tương ứng) | Full vòng đời tài khoản không 2FA: đăng ký → verify → login → quên mật khẩu → reset → login lại |
| **M3** | 2FA: login flow + settings (setup/enable/backup codes/disable/regenerate) | Bật 2FA → logout → login thấy màn nhập mã → TOTP đúng vào app; backup code dùng 1 lần; disable thành công |
| **M4** | Social login Google: url → callback → login; link/unlink trong settings | Login Google E2E (kể cả nhánh 2FA); unlink bị chặn đúng khi anti-lockout |
| **M5** | Sessions + profile + avatar + đổi mật khẩu + deactivate | Revoke thiết bị khác → thiết bị đó 401 ngay; đổi mật khẩu → mọi nơi logout; avatar upload 2 bước |
| **M6** | PrefetchProvider + tối ưu (devtools audit, cache tuning) | Dashboard vào nhanh hơn, không query thừa, không rò rỉ cache giữa user |

**Thứ tự khuyến nghị:** M0 → M1 → M2 → M3 → M4 → M5 → M6. M3-M4 có thể đổi chỗ tùy độ ưu tiên business.

---

## Checklist hoàn thiện

**Chức năng**
- [ ] Login/register/verify/resend/forgot/reset đầy đủ, xử lý đúng mọi error code trong ma trận
- [ ] 2FA: login flow + đủ 4 thao tác settings; backup codes chỉ hiện 1 lần kèm bắt buộc xác nhận đã lưu
- [ ] Social Google: login + link/unlink + nhánh 2FA
- [ ] Sessions: xem/revoke 1/revoke tất cả thiết bị khác
- [ ] Profile: cập nhật, đổi mật khẩu (ép đăng nhập lại), avatar 2 bước, deactivate 2 bước
- [ ] `mustChangePassword` ép đổi mật khẩu trước khi dùng app
- [ ] Feature flags từ `/system/public` điều khiển nút đăng ký/social

**Kỹ thuật**
- [ ] Refresh single-flight hoạt động (test 3 request 401 song song)
- [ ] Không lưu token trong localStorage; memory + cookie httpOnly
- [ ] Logout/đổi mật khẩu → query cache cleared hoàn toàn
- [ ] 422 map đúng field; không toast trùng giữa interceptor và mutation
- [ ] `credentials: "include"` trên mọi request; cookie hoạt động qua gateway
- [ ] Turnstile reset đúng sau lỗi CAPTCHA_*
- [ ] Maintenance mode có trang toàn cục
- [ ] Không gọi service trực tiếp trong component; không điều hướng trong hook
- [ ] Mọi chuỗi UI auth qua `t()` (dict vi/en đầy đủ, không hardcode); đổi locale không cần reload, reload vẫn giữ lựa chọn
- [ ] Số/ngày giờ (đếm ngược khóa tài khoản, hạn tempToken 2FA...) format qua `Intl` theo locale; locale mặc định lấy từ `app.locale` của BE

**Microservice**
- [ ] Cây thư mục domain-first; thêm domain mới không đụng core
- [ ] `createApiClient(baseURL)` dùng chung interceptor cho mọi service tương lai
- [ ] Env tập trung tại `src/config/env.ts`
- [ ] Ghi chú deploy: CORS allowed origins + cookie secure khi tách domain

---

## Tài liệu tham khảo (backend)

| File | Nội dung |
|------|----------|
| `smart-ppe-identity-service/src/modules/auth/auth.route.ts` | Toàn bộ route auth |
| `smart-ppe-identity-service/src/modules/auth/auth.controller.ts` | Response shape từng endpoint |
| `smart-ppe-identity-service/src/modules/auth/auth.service.ts` | Logic nghiệp vụ, error codes |
| `smart-ppe-identity-service/src/modules/auth/auth.validation.ts` | Zod schema (payload chính xác) |
| `smart-ppe-identity-service/src/modules/auth/auth.dto.ts` | DTO (MeDto, AuthUser, 2FA...) |
| `smart-ppe-identity-service/src/common/errors/error-code.ts` | Enum error codes |
| `smart-ppe-identity-service/src/middlewares/error.middleware.ts` | Chuẩn response lỗi |
| `smart-ppe-infra/traefik/dynamic.yml` | Gateway routing `/api/v1` |
