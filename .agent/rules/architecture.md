# Kiến trúc Dữ liệu, Auth & Microservices — fe-ppe

> **Mục đích:** Quy định kiến trúc luồng dữ liệu, quản lý phiên đăng nhập (Auth), bảo mật Token, giao tiếp Microservices và chiến lược xử lý lỗi trong dự án `fe-ppe`.

---

## 1. Kiến trúc Phân tầng Domain-First

Frontend giao tiếp với các Backend Microservices qua Traefik Gateway (`localhost:80` với tiền tố `/api/v1`):

```
┌─────────────────────────── Browser ───────────────────────────┐
│  Pages / Components  (chỉ gọi hook, render theo state)         │
│        │                                                       │
│  hooks/{domain}  (useQuery đọc / useMutation ghi + invalidate) │
│        │                                                       │
│  services/{domain}.service.ts  (1 hàm = 1 endpoint, unwrap)    │
│        │                                                       │
│  lib/axios.ts  (interceptor: gắn token, refresh single-flight) │
└────────────────────────────────────────────────────────────────┘
```

- **Tổ chức theo Domain backend:**
  - `auth` ➔ Phục vụ `smart-ppe-identity-service` (cổng 9999).
  - `sites` ➔ Phục vụ microservice quản lý công trường.
  - `incidents` ➔ Phục vụ microservice sự cố vi phạm an toàn PPE.
  - `notifications` ➔ Phục vụ microservice thông báo & cảnh báo.
- **Nguyên tắc phân tầng nghiêm ngặt:**
  - Pages/Components **không** gọi trực tiếp các hàm service trong `services/`.
  - Mọi thao tác đọc/ghi dữ liệu bắt buộc đi qua Custom Hook trong `hooks/`.
  - Hooks **không** tự ý chuyển trang (redirect); việc điều hướng do trang hoặc Guard Layout quyết định.

---

## 2. Chuẩn hóa Hợp đồng Dữ liệu (Backend Contract)

- Mọi phản hồi backend đều tuân theo cấu trúc:
  - Thành công: `{ success: true, data: T, message?: string }`
  - Thất bại: `{ success: false, message: string, code: string, errors?: { field: string; message: string }[] }`
- **Axios unwrap:** Tầng `lib/axios.ts` tự động unwrap và trả về trực tiếp `response.data.data` (hoặc ném lỗi `ApiError`), các service không cần chấm `.data` lặp lại.

---

## 3. Quản lý Token & Cơ chế Refresh Single-Flight

1. **Lưu trữ Token:**
   - Access Token: Lưu trong memory (`lib/token.ts`).
   - Refresh Token: Lưu đồng bộ qua httpOnly Cookie của trình duyệt (`withCredentials: true`) và dự phòng trong memory.
   - **Tuyệt đối không lưu token vào `localStorage`** (nguy cơ XSS).
2. **Cơ chế Refresh Single-Flight (Chống Race Condition):**
   - Backend sử dụng **Refresh Token Rotation**: Mỗi lần refresh, token cũ bị hủy ngay lập tức trong cơ sở dữ liệu.
   - Khi có nhiều request song song gặp lỗi 401 `TOKEN_EXPIRED`, interceptor **chỉ phát 1 request duy nhất** `/auth/refresh` bằng biến promise dùng chung ở cấp module (`refreshPromise`).
   - Tất cả các request 401 khác phải chờ chung promise này, sau đó retry bằng access token mới.
   - Nếu refresh thất bại: Xóa sạch bộ nhớ token, phát sự kiện `auth:session-expired` và chuyển hướng người dùng về trang `/login`.

---

## 4. Thứ tự Bọc Provider Chuẩn ở Root Layout

Các Provider phải được lồng đúng thứ tự phụ thuộc tại `src/providers/index.tsx`:

```tsx
<QueryClientProvider client={queryClient}>   {/* 1. Ngoài cùng để mọi hook bên dưới dùng được queryClient */}
  <LocaleProvider>                            {/* 2. Cần queryClient để tải config ngôn ngữ hệ thống */}
    <AuthProvider>                            {/* 3. Cung cấp AuthContext (user, status, logout) */}
      <PrefetchProvider>                      {/* 4. Tải trước dữ liệu cần thiết (dashboard, permissions) */}
        {children}
        <ToasterProvider />                   {/* 5. Giao diện thông báo Toast Neumorphic */}
      </PrefetchProvider>
    </AuthProvider>
  </LocaleProvider>
  <ReactQueryDevtools />                      {/* Chỉ mount trong môi trường Development */}
</QueryClientProvider>
```

---

## 5. Chiến lược Xử lý & Thông báo Lỗi (Toast Strategy)

Tránh gây phiền toái hoặc lặp thông báo lỗi trên màn hình:

- **Lỗi Hạ tầng / Toàn cục (Global Errors):**
  - Do `lib/axios.ts` interceptor tự động hiển thị Toast: Mất kết nối mạng (offline), lỗi máy chủ 500, lỗi bảo trì 503 (`SYSTEM_MAINTENANCE`), lỗi giới hạn tần suất 429 (`TOO_MANY_REQUESTS`).
- **Lỗi Nghiệp vụ / Form Validation (Business Errors):**
  - **Không** tự động toast ở interceptor (tránh hiện đè 2-3 thông báo cùng lúc).
  - Từng mutation hoặc form tự bắt lỗi và hiển thị theo ngữ cảnh riêng: Lỗi 422 hiển thị đỏ dưới từng trường input, lỗi sai mật khẩu hiển thị thông báo dưới nút submit.
