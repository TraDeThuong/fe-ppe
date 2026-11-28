# Scheduled Tasks (/scheduled-tasks) — theo dõi nhận xét rà soát

Cập nhật: 2026-11-28. BE liên quan: smart-ppe-identity-service#10 (trả `lastRunAt` / `lastStatus` trực tiếp từ `/cron/jobs`). FE không sửa BE.

## 1. Mục code — đã đạt theo nhận xét

| Nhận xét | Trạng thái ở FE |
|---|---|
| Detail modal hiện "Chưa có lịch sử" / "Không có lỗi nào" khi thiếu `AUDIT_LOG_READ` | Đã xử lý: `auditForbidden` (thiếu quyền hoặc API trả 403) → hiện khung khoá + `cron.detail.noAuditPermission`; bộ đếm tab hiện "—" (`cron-job-detail-modal.tsx`) |
| Trạng thái chạy cuối phụ thuộc Audit Log | Đã xử lý: `mergeRecentExecutions` lấy `lastRunAt`/`lastStatus` từ `/cron/jobs` (`src/lib/cron.ts`); khi thiếu quyền audit, bỏ bản ghi nguồn `audit` |
| Thiếu nút Chỉnh sửa trong footer detail modal | Đã có nút "Chỉnh sửa" (Pencil) cạnh Bật/Tắt & Chạy ngay, màn hình truyền `onEdit={openEdit}` |
| Nhánh `action === "toggle"` chết trong `CronJobDialog` | Đã gỡ — dialog chỉ còn luồng Chạy ngay |
| Import thừa `useDebounce` | Đã gỡ |
| Kiểm tra vai trò ADMIN/SUPER_ADMIN thủ công | Đã chuyển sang `useCan()` (`CRON_JOB_READ`, `CRON_JOB_MANAGE`, `AUDIT_LOG_READ`) |
| `lastSynced = new Date()` từ lần render đầu | Đã dùng `query.dataUpdatedAt` (null khi chưa có dữ liệu) |
| Ô mô tả trong Edit modal thiếu `maxLength` | Đã có `maxLength={500}` + bộ đếm `x/500` |

Kiểm tra: test cron 23/23 pass; `tsc` không báo lỗi trong scheduled-tasks.

## 2. Mục UI — đã quyết định & thực hiện (2026-11-28)

### 2.1 `CronStatsDetailPanel` — phương án A (ĐÃ LÀM)

- Bỏ danh sách job và các nút Chạy ngay / Bật / Tắt trong panel (đã có ở `CronJobTable` / `CronJobCardGrid`).
- Giữ: tiêu đề + mô tả, số `x / tổng`, nút "Lọc đang bật/tắt", nút đóng, ô thống kê (dọn dẹp, tổng hợp, theo tần suất), thanh "Mức độ sẵn sàng tự động hóa" (% bật trên toàn bộ job), trạng thái rỗng khi không có job tắt.
- Ô thống kê giờ tính theo nhóm của thẻ đang mở (tổng / đang bật / đã tắt) thay vì chỉ hiện ở thẻ Tổng.
- Bấm thẻ KPI → lọc bảng/lưới chính (`enabled` / `disabled`, thẻ Tổng → `all`); đóng thẻ → bỏ lọc (`all`).
- Gỡ prop `canManage` / `blockedJobs` / `onTrigger` / `onToggle` khỏi `CronKpiSummary` và `CronStatsDetailPanel`.
- Test: thêm case kiểm panel không còn tên job / nút thao tác.

### 2.2 Ghi chú nhỏ (ĐÃ SỬA, chữ hiển thị giữ nguyên)

- Footer detail modal: dùng `CRON_TIMEZONE` thay chuỗi ghi cứng `Asia/Ho_Chi_Minh`.
- Banner hệ thống: thay ghép câu theo `locale === "vi-VN"` bằng khoá i18n `cron.scheduledJobCount` (vi: "{count} tác vụ được định thời", en: "{count} scheduled jobs").
