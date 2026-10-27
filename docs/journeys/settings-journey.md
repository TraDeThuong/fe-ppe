# Hành trình xây dựng Trung tâm Cài đặt Hồ sơ & Bảo mật (/settings) — fe-ppe

> **Ngày lập:** 2026-10-28  
> **Phạm vi:** Trung tâm Cài đặt Tài khoản, Hồ sơ Cá nhân & Bảo mật Đa lớp (`/settings/profile`, `/settings/security`, `/change-password`) thuộc nhóm Cá nhân & Thiết lập (`settings`) sau đăng nhập — quản lý thông tin định danh nhân sự (Avatar, Họ tên, SĐT, Vai trò, Công trường phân công), đổi mật khẩu chủ động kèm checklist độ mạnh thời gian thực, thiết lập xác thực 2 yếu tố (2FA TOTP QR Code & 8 Mã dự phòng khẩn cấp), liên kết tài khoản Google OAuth 2.0, và quản lý các phiên làm việc đang hoạt động (Active Sessions) kèm khả năng đăng xuất từ xa khỏi các thiết bị lạ.  
> **Nguồn contract:** Backend `smart-ppe-identity-service` (cổng 9999 / Gateway Traefik cổng 80 tại `/api/v1/users/me`, `/api/v1/auth`, `/api/v1/2fa`, `/api/v1/sessions`).  
> **Tài liệu tham khảo:** [Tra.md](file:///Users/thanhtra/D08/D08-DATN/Tra.md) | [tra-21-10-2026.md](file:///Users/thanhtra/D08/D08-DATN/tra-21-10-2026.md) | [auth-journey.md](file:///Users/thanhtra/D08/D08-DATN/fe-ppe/docs/journeys/auth-journey.md) | [users-journey.md](file:///Users/thanhtra/D08/D08-DATN/fe-ppe/docs/journeys/users-journey.md)  
> **Tài khoản test (seed identity-service):**  
> - Áp dụng cho **TẤT CẢ** người dùng đã đăng nhập: `admin@ppe.local`, `manager@ppe.local`, `officer@ppe.local`, `user@ppe.local` (mỗi người dùng toàn quyền tự quản lý hồ sơ và bảo mật của chính mình).  

---

## Mục lục

0. [Mục tiêu & Định vị phân hệ /settings](#0-mục-tiêu--định-vị-phân-hệ-settings)
1. [Khảo sát Backend Contract (smart-ppe-identity-service)](#1-khảo-sát-backend-contract-smart-ppe-identity-service)
2. [Kiến trúc phân tầng & Cấu trúc thư mục đích](#2-kiến-trúc-phân-tầng--cấu-trúc-thư-mục-đích)
3. [Thiết kế giao diện & Trải nghiệm (UI/UX Neumorphism)](#3-thiết-kế-giao-diện--trải-nghiệm-uiux-neumorphism)
4. [Cơ chế kỹ thuật cốt lõi: 2FA TOTP, Single-Flight Session & Avatar Upload](#4-cơ-chế-kỹ-thuật-cốt-lõi-2fa-totp-single-flight-session--avatar-upload)
5. [Ma trận bảo mật & Quyền truy cập](#5-ma-trận-bảo-mật--quyền-truy-cập)
6. [Kế hoạch triển khai chi tiết từng bước](#6-kế-hoạch-triển-khai-chi-tiết-từng-bước)
   - [Bước 1 — Tầng DTOs & Types (src/types/auth.types.ts & user.types.ts)](#bước-1--tầng-dtos--types-srctypesauthtypests--usertypests)
   - [Bước 2 — Tầng Service API (src/services/auth.service.ts & user.service.ts)](#bước-2--tầng-service-api-srcservicesauthservicets--userservicets)
   - [Bước 3 — Tầng React Query Hooks (src/hooks/auth/)](#bước-3--tầng-react-query-hooks-srchooksauth)
   - [Bước 4 — Bổ sung Từ điển i18n đa ngôn ngữ (VI / EN)](#bước-4--bổ-sung-từ-điển-i18n-đa-ngôn-ngữ-vi--en)
   - [Bước 5 — Hoàn thiện UI Components Hồ sơ Cá nhân (/settings/profile)](#bước-5--hoàn-thiện-ui-components-hồ-sơ-cá-nhân-settingsprofile)
   - [Bước 6 — Hoàn thiện UI Components Trung tâm Bảo mật (/settings/security)](#bước-6--hoàn-thiện-ui-components-trung-tâm-bảo-mật-settingssecurity)
   - [Bước 7 — Xây dựng Modal Bật 2FA, Tải Backup Codes & Đăng xuất phiên](#bước-7--xây-dựng-modal-bật-2fa-tải-backup-codes--đăng-xuất-phiên)
   - [Bước 8 — Kiểm thử E2E & Tinh chỉnh Responsive](#bước-8--kiểm-thử-e2e--tinh-chỉnh-responsive)
7. [Ma trận xử lý lỗi & Khả năng chịu lỗi (Resilience Matrix)](#7-ma-trận-xử-lý-lỗi--khả-năng-chịu-lỗi-resilience-matrix)
8. [Checklist hoàn thiện nghiệm thu](#8-checklist-hoàn-thiện-nghiệm-thu)

---

## 0. Mục tiêu & Định vị phân hệ /settings

### 0.1 Vai trò trong hệ sinh thái Smart PPE Monitoring
Phân hệ Cài đặt Tài khoản (`/settings/profile`, `/settings/security`, `/change-password`) là "thành lũy phòng thủ cá nhân" và trung tâm quản trị định danh tự phục vụ (Self-service IAM) của mỗi cán bộ nhân viên trong hệ thống Smart PPE. Bất kể là Quản trị viên tối cao, Kỹ sư Giám sát an toàn, hay Công nhân vận hành, người dùng đều sử dụng không gian này để bảo vệ tài khoản và tùy biến trải nghiệm làm việc. Phân hệ giải quyết 4 bài toán trọng tâm:

1. **Quản trị Hồ sơ & Định danh Hiện trường (Personnel Identity Management):** Cập nhật thông tin cá nhân chính xác (Họ tên, Số điện thoại khẩn cấp, Ảnh đại diện nhận diện khuôn mặt). Giúp các cán bộ khác dễ dàng nhận diện và liên lạc ngay khi có sự cố vi phạm xảy ra tại công trường.
2. **Bảo vệ Tài khoản Đa lớp Cấp Công nghiệp (Two-Factor Authentication TOTP):** Ngăn chặn 100% rủi ro bị chiếm quyền kiểm soát do lộ mật khẩu. Bật xác thực 2 lớp qua ứng dụng Google Authenticator/Authy kèm bộ 8 mã dự phòng khẩn cấp được mã hóa để cứu trợ khi mất điện thoại.
3. **Quản lý Phiên Đăng nhập & Đăng xuất Từ xa (Active Sessions & Remote Revocation):** Giám sát mọi thiết bị đang truy cập vào hệ thống (máy tính văn phòng, điện thoại hiện trường, máy tính bảng). Cho phép người dùng phát hiện truy cập bất thường từ IP lạ và bấm 1 nút để đăng xuất tức thì khỏi tất cả các thiết bị khác.
4. **Liên kết Định danh Mạng xã hội (Google OAuth 2.0 Single Sign-On):** Hỗ trợ liên kết tài khoản nội bộ với Google Workspace của doanh nghiệp, giúp việc đăng nhập nhanh chóng chỉ với 1 cú nhấp chuột mà vẫn đảm bảo qua bước kiểm tra 2FA nếu đã bật.

### 0.2 Phạm vi thực hiện
* ✅ **Trong phạm vi:**
  1. **Tab Hồ sơ Cá nhân (`/settings/profile`):**
     - Hiển thị thẻ thông tin định danh: Avatar Neumorphic có nút đổi ảnh, Họ và tên, Email (chỉ đọc), Số điện thoại, Vai trò RBAC hiện tại (`ADMIN`, `SAFETY_MANAGER`, v.v.), Công trường phụ trách.
     - Form chỉnh sửa Họ tên, Số điện thoại có kiểm tra định dạng số điện thoại Việt Nam.
     - Tải lên ảnh đại diện (Upload Avatar trực tiếp lên MinIO qua `media-service`).
  2. **Tab Trung tâm Bảo mật (`/settings/security`):**
     - **Khối Đổi Mật khẩu:** Form nhập Mật khẩu hiện tại, Mật khẩu mới, Xác nhận mật khẩu mới. Tích hợp thanh checklist độ mạnh mật khẩu theo thời gian thực (chữ hoa, số, ký tự đặc biệt, tối thiểu 8 ký tự).
     - **Khối Xác thực 2 Yếu tố (2FA TOTP):** Nút công tắc Bật/Tắt 2FA. Khi bật: mở modal quét mã QR Authenticator, nhập mã 6 số xác nhận và hiển thị 8 mã dự phòng khẩn cấp (Backup Codes) có nút Copy và Tải file text.
     - **Khối Tài khoản Liên kết:** Hiển thị trạng thái liên kết với Google. Nút "Liên kết Google" hoặc "Hủy liên kết".
     - **Khối Quản lý Phiên Hoạt động (Active Sessions):** Danh sách các thiết bị đang online kèm nhãn "Thiết bị này", thông tin trình duyệt, hệ điều hành, địa chỉ IP và thời gian truy cập gần nhất. Nút "Đăng xuất khỏi thiết bị này" và "Đăng xuất khỏi tất cả các thiết bị khác".
  3. **Trang Đổi Mật khẩu Bắt buộc (`/change-password`):**
     - Dành cho tài khoản mới được cấp tạm thời hoặc nhận yêu cầu đổi mật khẩu từ quản trị viên.
  4. **Đa ngôn ngữ & Giao diện Neumorphic:** Hỗ trợ đầy đủ tiếng Việt (`vi-VN`) và tiếng Anh (`en-US`), tương thích Dark/Light Mode.

* ❌ **Ngoài phạm vi:**
  - Không cho phép người dùng tự sửa đổi Vai trò (`Role`) hoặc gán thêm quyền cho bản thân (đây là quyền của Admin tại trang `/users` và `/roles`).
  - Không cho phép người dùng tự đổi Email tài khoản (email là định danh duy nhất của hệ thống).

---

## 1. Khảo sát Backend Contract (smart-ppe-identity-service)

Các endpoint dưới đây được cung cấp bởi `smart-ppe-identity-service` (cổng 9999 / Gateway Traefik `/api/v1`):
- Controller: [user.controller.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-identity-service/src/modules/users/user.controller.ts) & [auth.controller.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-identity-service/src/modules/auth/auth.controller.ts)
- 2FA Controller: [two-factor.controller.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-identity-service/src/modules/two-factor/two-factor.controller.ts)
- Session Controller: [session.controller.ts](file:///Users/thanhtra/D08/D08-DATN/smart-ppe-identity-service/src/modules/session/session.controller.ts)

### 1.1 Bảng đối chiếu REST Endpoints

| Phân hệ | Method | Endpoint | Yêu cầu | Payload Request | Response Dự kiến |
|---|---|---|---|---|---|
| **Xem Hồ sơ Cá nhân** | `GET` | `/api/v1/users/me` | Đã xác thực | Không | `{ success: true, data: UserProfileDto }` |
| **Cập nhật Hồ sơ** | `PUT` | `/api/v1/users/me` | Đã xác thực | Body: `{ fullName?, phoneNumber? }` | `{ success: true, message: string, data: UserProfileDto }` |
| **Upload Avatar** | `POST` | `/api/v1/users/me/avatar` | Đã xác thực | FormData: `file (image)` | `{ success: true, message: string, data: { avatarUrl: string } }` |
| **Đổi Mật khẩu** | `POST` | `/api/v1/auth/change-password` | Đã xác thực | Body: `{ currentPassword, newPassword }` | `{ success: true, message: string }` |
| **Khởi tạo 2FA QR** | `POST` | `/api/v1/2fa/generate` | Đã xác thực | Không | `{ success: true, data: { qrCodeUrl, secret } }` |
| **Kích hoạt 2FA** | `POST` | `/api/v1/2fa/enable` | Đã xác thực | Body: `{ token: string (6 số) }` | `{ success: true, message: string, data: { backupCodes: string[] } }` |
| **Hủy kích hoạt 2FA** | `POST` | `/api/v1/2fa/disable` | Đã xác thực | Body: `{ password: string }` | `{ success: true, message: string }` |
| **Lấy Mã Dự phòng** | `GET` | `/api/v1/2fa/backup-codes` | Đã xác thực | Không | `{ success: true, data: { backupCodes: string[] } }` |
| **Danh sách Phiên** | `GET` | `/api/v1/sessions` | Đã xác thực | Không | `{ success: true, data: SessionItemDto[] }` |
| **Thu hồi 1 Phiên** | `DELETE`| `/api/v1/sessions/:id` | Đã xác thực | Params: `id` | `{ success: true, message: string }` |
| **Thu hồi Phiên khác**| `DELETE`| `/api/v1/sessions/other` | Đã xác thực | Không | `{ success: true, message: string }` |
| **Hủy liên kết Google**|`DELETE`| `/api/v1/auth/google/unlink`| Đã xác thực | Không | `{ success: true, message: string }` |

---

## 2. Kiến trúc phân tầng & Cấu trúc thư mục đích

```
fe-ppe/
├── app/(auth)/
│   ├── settings/
│   │   ├── page.tsx                                  ← Chuyển hướng tự động về /settings/profile
│   │   ├── layout.tsx                                ← Layout chia khung Neumorphic Tabs cho Profile và Security
│   │   ├── profile/
│   │   │   └── page.tsx                              ← Trang Hồ sơ Cá nhân (/settings/profile)
│   │   └── security/
│   │       └── page.tsx                              ← Trang Trung tâm Bảo mật (/settings/security)
│   │
│   └── change-password/
│       └── page.tsx                                  ← Trang Đổi Mật khẩu Độc lập (/change-password)
│
├── src/
│   ├── types/
│   │   ├── auth.types.ts                             ← ĐÃ CÓ: DTOs đổi mật khẩu, 2FA, Backup codes, Sessions
│   │   └── user.types.ts                             ← ĐÃ CÓ: UserProfileDto, UpdateProfileDto
│   │
│   ├── services/
│   │   ├── auth.service.ts                           ← ĐÃ CÓ: Client gọi các API bảo mật, 2FA, sessions
│   │   └── user.service.ts                           ← ĐÃ CÓ: Client gọi API hồ sơ cá nhân và avatar
│   │
│   ├── hooks/auth/
│   │   ├── use-user-profile.ts                       ← Lấy & Cập nhật thông tin cá nhân
│   │   ├── use-change-password.ts                    ← Mutation đổi mật khẩu có checklist validation
│   │   ├── use-two-factor.ts                         ← Quản lý vòng đời 2FA: Sinh QR, Enable, Disable, Backup Codes
│   │   └── use-sessions.ts                           ← Lấy danh sách phiên & Mutation thu hồi phiên từ xa
│   │
│   ├── components/features/auth/settings/            ← ĐÃ CÓ & NÂNG CẤP: UI Components Neumorphism
│   │   ├── profile-settings-content.tsx              ← Khung nội dung trang Hồ sơ
│   │   ├── security-settings-content.tsx             ← Khung nội dung trang Bảo mật
│   │   ├── settings-tabs-nav.tsx                     ← Thanh Tab điều hướng: [ Hồ sơ ] [ Bảo mật ]
│   │   ├── avatar-upload-dropzone.tsx                ← Bộ chọn ảnh avatar Neumorphic có xem trước
│   │   ├── password-checklist.tsx                    ← Checklist thời gian thực 4 điều kiện mật khẩu
│   │   ├── active-sessions-list.tsx                  ← Danh sách các thiết bị đang đăng nhập
│   │   │
│   │   └── modals/                                   ← Các modal tương tác
│   │       ├── enable-2fa-modal.tsx                  ← Modal quét QR TOTP và xác thực mã 6 số
│   │       ├── backup-codes-dialog.tsx               ← Modal hiển thị và tải về 8 mã dự phòng
│   │       ├── disable-2fa-dialog.tsx                ← Hộp thoại xác nhận mật khẩu để tắt 2FA
│   │       └── revoke-sessions-dialog.tsx            ← Hộp thoại xác nhận đăng xuất mọi thiết bị khác
│   │
│   └── i18n/
│       ├── vi-VN.json                                ← Bổ sung namespace "settings.*"
│       └── en-US.json                                ← Bổ sung namespace "settings.*"
```

---

## 3. Thiết kế giao diện & Trải nghiệm (UI/UX Neumorphism)

### 3.1 Bố cục Trang Trung tâm Bảo mật (`/settings/security`)
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PageHeader: Icon ShieldAlert + "Cài đặt Tài khoản & Bảo mật" + Badge "ACCOUNT SECURITY"│
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [NEUMORPHIC SETTINGS TABS]                                                             │
│ [ 👤 Hồ sơ Cá nhân (/settings/profile) ]   [ 🛡️ Trung tâm Bảo mật (/settings/security) ] │
├───────────────────────────────────────────────────┬────────────────────────────────────┤
│ CỘT TRÁI (6 CỘT): MẬT KHẨU & 2FA TOTP             │ CỘT PHẢI (6 CỘT): PHIÊN & LIÊN KẾT │
│ ┌───────────────────────────────────────────────┐ │ ┌────────────────────────────────┐ │
│ │ 🔑 ĐỔI MẬT KHẨU                               │ │ │ 🌐 LIÊN KẾT TÀI KHOẢN GOOGLE   │ │
│ │ [ Mật khẩu hiện tại ...................... ] │ │ │ Đã liên kết: user@gmail.com    │ │
│ │ [ Mật khẩu mới .......................... ] │ │ │ [ Nút: "Hủy liên kết Google" ] │ │
│ │ [ Xác nhận mật khẩu mới ................. ] │ │ ├────────────────────────────────┤ │
│ │ Checklist Mật khẩu:                           │ │ │ 💻 CÁC THIẾT BỊ ĐANG ĐĂNG NHẬP │ │
│ │  ✓ Tối thiểu 8 ký tự                          │ │ │ • Chrome trên macOS (Hiện tại) │ │
│ │  ✓ Chứa chữ hoa và chữ thường                 │ │ │   IP: 113.161.x.x • 🟢 Online  │ │
│ │  ✓ Chứa ít nhất 1 chữ số                      │ │ │ • Safari trên iPhone 14 Pro    │ │
│ │  ✓ Chứa ký tự đặc biệt (!@#$)                 │ │ │   IP: 14.169.x.x • 2 giờ trước │ │
│ │ [ Nút: "Lưu thay đổi mật khẩu" ]              │ │ │   [ 🗑️ Đăng xuất từ xa ]       │ │
│ ├───────────────────────────────────────────────┤ │ │ ────────────────────────────── │ │
│ │ 🛡️ XÁC THỰC HAI YẾU TỐ (2FA TOTP)             │ │ │ [ Nút: "Đăng xuất khỏi tất cả  │ │
│ │ Trạng thái: 🟢 ĐÃ KÍCH HOẠT (Bảo vệ tối đa)   │ │ │        các thiết bị khác" ]    │ │
│ │ Quét mã QR qua Google Authenticator / Authy   │ │ └────────────────────────────────┘ │
│ │ [ Nút: "Xem 8 Mã dự phòng" ]  [ Nút: "Tắt 2FA"]│                                    │
│ └───────────────────────────────────────────────┘                                      │
└───────────────────────────────────────────────────┴────────────────────────────────────┘
```

---

## 4. Cơ chế kỹ thuật cốt lõi: 2FA TOTP, Single-Flight Session & Avatar Upload

### 4.1 Quy trình Bật 2FA An toàn Tuyệt đối
1. Người dùng bấm "Kích hoạt 2FA".
2. Client gọi `POST /api/v1/2fa/generate`, nhận chuỗi `secret` và mã ảnh `qrCodeUrl` (Data URI Base64).
3. Modal `enable-2fa-modal.tsx` hiển thị mã QR nổi 3D Neumorphic kèm nút "Sao chép khóa bí mật".
4. Người dùng mở ứng dụng Authenticator, quét mã và nhập mã 6 số vào ô Input 6 ký tự tự động chuyển focus.
5. Gọi `POST /api/v1/2fa/enable`. Server kiểm tra tính hợp lệ của mã thời gian (Time-drift tolerance: 1 bước).
6. Khi xác thực thành công, server trả về **8 Mã dự phòng khẩn cấp** (`backupCodes`).
7. Giao diện mở ngay hộp thoại `backup-codes-dialog.tsx` bắt buộc người dùng bấm "Tải về file text" hoặc "Sao chép tất cả" trước khi đóng modal để đảm bảo người dùng không bị mất quyền truy cập nếu mất điện thoại.

### 4.2 Thu hồi Phiên Làm việc Từ xa (Remote Session Revocation)
Mỗi phiên làm việc mang một `sessionId` được lưu trữ trong Redis/PostgreSQL:
- Khi người dùng bấm "Đăng xuất khỏi thiết bị này": Client gọi `DELETE /api/v1/sessions/:id`.
- Khi bấm "Đăng xuất khỏi tất cả các thiết bị khác": Gọi `DELETE /api/v1/sessions/other`. Server lập tức xóa sạch các refresh token tương ứng trong DB.
- Thiết bị bị thu hồi phiên khi gửi bất kỳ request nào tiếp theo sẽ nhận mã lỗi `401 Unauthorized` và tự động bị đẩy về trang `/login`.

---

## 5. Ma trận bảo mật & Quyền truy cập

Phân hệ `/settings` áp dụng quyền sở hữu tài nguyên cá nhân (**Self-Resource Ownership**):

| Thao tác | ADMIN | SAFETY_MANAGER | SAFETY_OFFICER | USER |
|---|:---:|:---:|:---:|:---:|
| **Xem & Sửa Hồ sơ của chính mình** | ✅ Có | ✅ Có | ✅ Có | ✅ Có |
| **Đổi Mật khẩu của chính mình** | ✅ Có | ✅ Có | ✅ Có | ✅ Có |
| **Bật / Tắt 2FA của chính mình** | ✅ Có | ✅ Có | ✅ Có | ✅ Có |
| **Xem & Thu hồi Phiên của chính mình**| ✅ Có | ✅ Có | ✅ Có | ✅ Có |
| **Sửa Vai trò của chính mình** | ❌ Chặn (Anti-lockout)| ❌ Chặn | ❌ Chặn | ❌ Chặn |

---

## 6. Kế hoạch triển khai chi tiết từng bước

### Bước 1 — Tầng DTOs & Types (`src/types/auth.types.ts` & `user.types.ts`)
- Rà soát các kiểu `UserProfileDto`, `UpdateProfileDto`, `ChangePasswordDto`, `TwoFactorSecretDto`, `SessionItemDto`.

### Bước 2 — Tầng Service API (`src/services/auth.service.ts` & `user.service.ts`)
- Rà soát `authService.changePassword()`, `generate2faSecret()`, `enable2fa()`, `disable2fa()`, `getBackupCodes()`.
- Rà soát `authService.getSessions()`, `revokeSession()`, `revokeOtherSessions()`.
- Rà soát `userService.getProfile()`, `updateProfile()`, `uploadAvatar()`.

### Bước 3 — Tầng React Query Hooks (`src/hooks/auth/`)
- Quản lý invalidation các keys: `["auth", "me"]`, `["auth", "sessions"]`, `["auth", "2fa"]`.
- Hoàn thiện `useChangePassword`, `useTwoFactor`, `useSessions`.

### Bước 4 — Bổ sung Từ điển i18n đa ngôn ngữ (VI / EN)
Cập nhật `vi-VN.json` và `en-US.json`:
- `settings.profile.*` (fullName, phone, role, site, updateProfile, avatarSuccess)
- `settings.security.*` (changePassword, checklist, twoFactor, sessions, linkGoogle)
- `settings.dialogs.*` (enable2faTitle, scanQrPrompt, backupCodesWarning, revokePrompt)

### Bước 5 — Hoàn thiện UI Components Hồ sơ Cá nhân (`/settings/profile`)
- `profile-settings-content.tsx`: Thẻ hồ sơ Neumorphic 3D, tích hợp Avatar Upload Dropzone có xem trước ảnh tức thời.

### Bước 6 — Hoàn thiện UI Components Trung tâm Bảo mật (`/settings/security`)
- `security-settings-content.tsx`: Bố cục 2 cột chứa Form Đổi mật khẩu có checklist động và Khối Quản lý Phiên.

### Bước 7 — Xây dựng Modal Bật 2FA, Tải Backup Codes & Đăng xuất phiên
- `enable-2fa-modal.tsx`: Modal quét mã QR và nhập OTP 6 số.
- `backup-codes-dialog.tsx`: Hộp thoại hiển thị 8 mã dự phòng và nút tải file `.txt`.
- `revoke-sessions-dialog.tsx`: Hộp thoại xác nhận đăng xuất từ xa.

### Bước 8 — Kiểm thử E2E & Tinh chỉnh Responsive
- Kiểm tra luồng đổi mật khẩu: Nhập sai mật khẩu hiện tại báo lỗi chính xác.
- Kiểm tra luồng kích hoạt 2FA qua Google Authenticator trên điện thoại thật.
- Kiểm tra tính năng đăng xuất thiết bị khác: Mở 2 trình duyệt (Chrome và Firefox), đăng xuất Firefox từ Chrome thành công.

---

## 7. Ma trận xử lý lỗi & Khả năng chịu lỗi (Resilience Matrix)

| Mã lỗi HTTP | Tình huống phát sinh | Cách xử lý trên giao diện người dùng |
|---|---|---|
| **400 Bad Request** | Mật khẩu mới trùng với mật khẩu cũ hoặc OTP 2FA sai | Báo lỗi inline cụ thể dưới trường nhập liệu |
| **401 Unauthorized**| Nhập sai mật khẩu hiện tại khi đổi pass hoặc tắt 2FA | Báo lỗi "Mật khẩu hiện tại không chính xác" |
| **403 Forbidden**   | Cố gắng can thiệp vào phiên đăng nhập của người khác | Chặn thao tác, thông báo lỗi quyền hạn |
| **413 Payload Too Large**| File ảnh avatar tải lên vượt quá 5MB | Toast cảnh báo "Dung lượng ảnh tối đa là 5MB" |
| **500 Server Error**| Lỗi kết nối Redis khi thu hồi phiên | Toast thông báo đỏ "Không thể thu hồi phiên lúc này, vui lòng thử lại sau" |

---

## 8. Checklist hoàn thiện nghiệm thu

- [ ] Cả 2 route `/settings/profile` và `/settings/security` được bảo vệ bằng Auth Guard.
- [ ] Cập nhật Họ tên và Số điện thoại cá nhân lưu thành công vào cơ sở dữ liệu.
- [ ] Tải lên ảnh đại diện Avatar thành công và tự động đồng bộ lên User Menu trên Header.
- [ ] Đổi mật khẩu hoạt động chuẩn xác với thanh Checklist 4 tiêu chuẩn mật khẩu mạnh.
- [ ] Kích hoạt 2FA TOTP quét mã QR và tải về 8 mã dự phòng thành công.
- [ ] Tắt 2FA yêu cầu xác thực lại mật khẩu an toàn.
- [ ] Danh sách các phiên làm việc (Sessions) hiển thị đúng thiết bị hiện tại và cho phép đăng xuất từ xa.
- [ ] Đa ngôn ngữ tiếng Việt (`vi-VN`) và tiếng Anh (`en-US`) đồng bộ 100%.
- [ ] Thiết kế Neumorphism chuẩn mực, tương thích hoàn hảo Dark Mode và Light Mode.
