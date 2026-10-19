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
4. [Bước 3 — `providers/` + `AuthContext` + thứ tự bọc layout](#bước-3--providers--authcontext--thứ-tự-bọc-layout)
5. [Bước 4 — `types/`: định nghĩa contract theo BE](#bước-4--types-định-nghĩa-contract-theo-be)
6. [Bước 5 — `services/`: từng hàm API](#bước-5--services-từng-hàm-api)
7. [Bước 6 — `hooks/`: useQuery / useMutation](#bước-6--hooks-usequery--usemutation)
8. [Bước 7 — Pages / Components](#bước-7--pages--components)
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
│   │   ├── index.tsx              # AppProviders — thứ tự bọc chuẩn
│   │   └── prefetch-provider.tsx  # Bước 8
│   ├── contexts/
│   │   └── AuthContext.tsx
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
│   └── config/
│       └── env.ts                  # đọc + validate env tập trung
└── docs/journeys/                  # file hành trình này & các file sau
```

### 1.4 Tiêu chí hoàn thành

- [ ] `npm run dev` chạy được, cài 3 package + devtools thành công
- [ ] `.env.local` + `.env.example` có đủ biến ở trên
- [ ] `src/config/env.ts` validate env (throw sớm nếu thiếu biến bắt buộc)
- [ ] Cây thư mục `lib/`, `providers/`, `contexts/`, `types/`, `services/`, `hooks/auth/` đã tạo rỗng theo cấu trúc

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

- [ ] Gọi 1 API lỗi 401 `TOKEN_EXPIRED` với 3 request song song → **chỉ 1 request** `/auth/refresh` xuất hiện trên Network tab, cả 3 request gốc được retry thành công
- [ ] Refresh fail → session bị clear, sự kiện `auth:session-expired` phát ra, UI về login
- [ ] 422 hiển thị đủ `errors[{field, message}]` trên form
- [ ] 423/429/500 hiển thị toast đúng chỗ, không trùng

---

## Bước 3 — `providers/` + `AuthContext` + thứ tự bọc layout

### 3.1 `contexts/AuthContext.tsx`

```ts
type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: MeDto | null;
  status: AuthStatus;
  setUser: (u: MeDto | null) => void;   // cập nhật sau profile/2FA đổi trạng thái
  logout: () => Promise<void>;          // gọi POST /auth/logout + clear + về /login
}
```

**Luồng khởi động (phục hồi session):**
1. Mount → `status = "loading"`, gọi `GET /auth/me`.
2. OK → `user = data`, `status = "authenticated"`.
3. 401 → cookie hết hạn → thử `/auth/refresh` (qua service) → OK thì gọi lại `/me`; fail → `status = "unauthenticated"`.
4. **Không redirect trong context** — redirect do guard layout/middleware lo (context không biết route nào là public).

**Lắng nghe sự kiện:** subscribe `auth:session-expired` (từ axios) → clear state → `unauthenticated`.

### 3.2 `providers/index.tsx` — thứ tự bọc CHUẨN

```tsx
// Minh họa thứ tự — bắt buộc đúng tầng
<QueryClientProvider client={queryClient}>   // 1. ngoài cùng — hook dùng được
  <AuthProvider>                              // 2. cần queryClient bên trong
    <PrefetchProvider>                        // 3. cần cả auth + queryClient (Bước 8)
      {children}
      <Toaster position="top-right" />        // react-hot-toast — component UI, đặt đâu cũng chạy
    </PrefetchProvider>
  </AuthProvider>
  <ReactQueryDevtools />                      // chỉ dev
</QueryClientProvider>
```

Mount trong `app/layout.tsx`.

### 3.3 Route guard 2 lớp

**Lớp 1 — `middleware.ts` (server, nhẹ, nhanh):**
- Chỉ check `request.cookies` có `accessToken` hoặc `refreshToken` (cookie httpOnly vẫn đọc được ở server).
- Không có + đang truy cập route protected → `redirect("/login?next=<path>")`.
- Đang có + truy cập `/login` → `redirect("/")` (tránh login khi đã đăng nhập).
- **Không verify JWT ở đây** (tốn, không cần — verify thật do `/me` ở client lo).

**Lớp 2 — `app/(auth)/layout.tsx` (client, chính xác):**
- Chờ `status !== "loading"` (render skeleton) → nếu `unauthenticated` → redirect login.
- Nếu `user.mustChangePassword === true` → redirect `/change-password` (trừ khi đang ở đó).
- Nếu `user.isActive === false` → màn hình "tài khoản đã bị vô hiệu hóa".
- Đây cũng là nơi mount `PrefetchProvider` (Bước 8).

### 3.4 Tiêu chí hoàn thành

- [ ] Reload trang ở route protected → giữ session (không nhảy về login)
- [ ] Reload ở `/login` khi đã đăng nhập → tự về dashboard
- [ ] Tắt cookie (devtools) → mọi route protected redirect `/login?next=...`
- [ ] 3 request 401 đồng thời → refresh 1 lần → UI không giật (không logout oan)

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
| `SystemPublicConfig` | `system-config.constant.ts` | `{ feature: { registration: { enabled }, social_login: { enabled } } }` — shape cần xác minh chính xác khi gọi thật |

**Quy tắc:** type nào BE trả field nào thì khai đúng field đó; mọi chỗ "khác biệt giữa các endpoint trả cùng tên" phải ghi chú ngay trong type (như `mustChangePassword` ở trên) — đây là nguồn bug phổ biến nhất.

### 4.3 Tiêu chí hoàn thành

- [ ] Mọi endpoint ở Bước 5 đều có type payload + response tương ứng
- [ ] `LoginResponse` là discriminated union (TS bắt xử lý nhánh `requires2FA` ở mọi nơi dùng)
- [ ] Có comment trích dẫn file BE cho mỗi type khó (để sau này đối chiếu khi BE đổi)

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

- [ ] Đủ 29 hàm trên, mỗi hàm đúng method/path/payload/return type
- [ ] Không hàm nào import toast/router/queryClient (thuần I/O)

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
| `usePublicConfig` | `authKeys.config()` | gọi 1 lần khi khởi động, cache dài |
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

- [ ] Không hook nào import trực tiếp `auth.service` vào component — component chỉ thấy hook
- [ ] Mọi mutation có `onError` toast đúng ngữ cảnh; không toast trùng với interceptor
- [ ] Login/GoogleLogin/Verify2FA đều trả discriminated union để trang xử lý nhánh 2FA
- [ ] Sau logout/changePassword/resetPassword, cache bị clear hoàn toàn (không rò rỉ dữ liệu user cũ)

---

## Bước 7 — Pages / Components

**Quy tắc chung:** Trang = Client Component gọi hook, render theo `isPending / isError / data` (react-query). Không có logic fetch trong JSX. Component UI tái dùng đặt ở `src/components/ui` (design system) và `src/components/features/auth/`.

### 7.1 Route guards

- `middleware.ts` — lớp 1 (server, check cookie tồn tại) — xem Bước 3.3
- `app/(auth)/layout.tsx` — lớp 2 (client: `/me`, `mustChangePassword`, `isActive`)
- `app/(public)/layout.tsx` — nếu đã đăng nhập → redirect `/` (dùng `useMe`)

### 7.2 Chi tiết từng trang

**Trang công khai — `(public)/`:**

| Trang | Hành vi bắt buộc |
|-------|------------------|
| `/login` | Form email+password. Lỗi 401 → hiển thị "sai thông tin, còn **n** lần thử" (message BE đã có sẵn). Lỗi 423 `ACCOUNT_LOCKED` → đếm ngược số phút từ message. 403 `USER_INACTIVE` → hiện banner + nút "gửi lại mail xác minh" (gọi resend). Thành công → `requires2FA` ? chuyển `/2fa` (kèm tempToken) : redirect `next` query hoặc `/`. TempToken lưu trong state trang + `sessionStorage` (đề phòng reload trong 5 phút) |
| `/register` | Checklist password policy **realtime** (8+ ký tự, hoa, thường, số, ký tự đặc biệt). Tích hợp Cloudflare Turnstile widget → đưa token vào `turnstileToken`. Thành công → màn "check email" (KHÔNG nói email đã tồn tại hay chưa — anti-enum) |
| `/verify-email` | Đọc `?token=` → gọi `verifyEmail` → thành công: nút về login; `TOKEN_EXPIRED`: nút gửi lại (resend) |
| `/forgot-password` | Email + Turnstile → **luôn** hiện "nếu email tồn tại, link reset đã được gửi" (anti-enum) |
| `/reset-password` | Đọc `?token=` → form mật khẩu mới + checklist policy → thành công → login (session đã bị revoke hết) |
| `/auth/callback` | Google redirect về đây: đọc `code` + `state` từ query → gọi `googleLogin({ code, redirectUri })` → nhánh `requires2FA` như login. Xử lý lỗi `state` không khớp (CSRF) → hiển thị lỗi chung |

**Trang cần đăng nhập — `(auth)/`:**

| Trang | Hành vi bắt buộc |
|-------|------------------|
| `/2fa` | Nhập 6 ô số (hoặc 1 ô chấp nhận backup code `XXXX-XXXX`). Đếm ngược 5 phút hiệu lực tempToken → hết hạn: nút "đăng nhập lại". Sai code: toast + vẫn giữ tempToken để thử lại |
| `/change-password` | Form oldPassword+newPassword (checklist policy). Lưu ý user Google-only: BE trả 400 `BAD_REQUEST` "chưa có mật khẩu" → hướng dẫn dùng forgot-password. Thành công → toast + **về `/login`** (session bị revoke hết) |
| `/settings/security` | Tabs: **2FA** (trạng thái từ `me.twoFactorEnabled`; bật → QR từ `otpauthUrl` → nhập code → **modal backupCodes 1 lần** bắt xác nhận "đã lưu" + nút tải .txt; tái tạo → yêu cầu TOTP + password; tắt → code + password) — **Sessions** (bảng thiết bị, nút thu hồi từng cái / tất cả thiết bị khác, đánh dấu `isCurrent`) — **Social** (danh sách đã link, nút link Google / unlink, cảnh báo anti-lockout) — **Password** (đổi mật khẩu) — **Vô hiệu hóa tài khoản** (nhập password + reason → xác nhận qua email) |
| Trang xác nhận deactivate | Đọc token từ link email → gọi `confirmDeactivate` → màn "tạm biệt" (⚠️ link email hiện trỏ path không tồn tại — xem Tiền đề #3) |

### 7.3 Tiêu chí hoàn thành

- [ ] Không trang nào gọi `auth.service` trực tiếp
- [ ] Mọi form có trạng thái `isPending` (disable button, spinner) và `isError` (thông báo rõ ràng)
- [ ] 422 hiển thị lỗi đúng field (map `errors[{field, message}]` vào từng input)
- [ ] Login flow E2E: sai 5 lần → khóa 15 phút hiển thị đếm ngược; có 2FA → nhập TOTP → vào app; hết hạn tempToken → quay lại login mượt

---

## Bước 8 — PrefetchProvider (nâng cao)

**Mục tiêu:** vào dashboard là dữ liệu đã sẵn (tăng UX), prefetch **theo role/permissions**, không prefetch thừa.

### 8.1 Thiết kế

- `PrefetchProvider` mount trong `app/(auth)/layout.tsx` (sau AuthProvider — xem Bước 3.2).
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

- [ ] Vào dashboard → Network tab thấy các query prefetch chạy song song, không chặn render
- [ ] Reload trang → query từ cache hiển thị tức thì, refetch nền nếu hết staleTime
- [ ] User role khác nhau → prefetch đúng danh sách của role đó

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
