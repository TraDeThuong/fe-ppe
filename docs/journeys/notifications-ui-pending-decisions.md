# /notifications — Các mục UI chờ quyết định (Hướng A: bỏ WEBHOOK cá nhân)

Ngày ghi: 28/11/2026. Liên quan: fe-ppe #48, #65; BE smart-ppe-notification-service#3.

## Đã xong trong code (không cần quyết định)

- Thẻ cấu hình WEBHOOK đã gỡ khỏi `notification-preferences-card.tsx`; lưới kênh là `lg:grid-cols-2` (IN_APP + EMAIL); không còn import icon `Radio` thừa.
- Bộ lọc kênh Inbox/Archive (`notification-filter-toolbar.tsx`) không còn WEBHOOK (sau P2 bên dưới còn "Hộp thư trong ứng dụng" + "Email đã gửi").
- `notification-meta-badges.tsx` vẫn giữ case WEBHOOK để hiển thị dữ liệu cũ.
- Test `notifications-ui.test.tsx` đã kiểm tra: không có option WEBHOOK, không có thẻ Webhook.
- Bổ sung 28/11: kiểu `UpdateNotificationPreferencePayload.channel` thu hẹp thành `PersonalNotificationPreferenceChannel` (IN_APP | EMAIL), nên không đoạn code FE nào gửi được preference WEBHOOK nữa.

## Đã chốt và triển khai (28/11)

- **P1 — Làm:** thêm ghi chú dưới lưới 2 thẻ kênh: "Outbound Webhook (gửi sang ERP/Bot) là cấu hình cấp hệ thống, quản lý tại trang Tích hợp." Chữ "Tích hợp" là link `/integrations` khi người dùng có `WEBHOOK_READ` hoặc `API_KEY_READ` (cùng điều kiện với menu); người không có quyền chỉ thấy chữ, để không bị dẫn vào trang 403.
- **P2 — Làm theo logic BE:** BE ghi tin hộp thư với kênh `IN_APP`; `WEB` chỉ là bí danh cũ (cùng vào hộp thư, cùng SSE). Khi không truyền `channel`, BE trả IN_APP + WEB và **không gồm Email**, nên nhãn cũ "Mọi kênh" là sai nghĩa. Bộ lọc giờ còn 2 lựa chọn: "Hộp thư trong ứng dụng" (mặc định, IN_APP + WEB) và "Email đã gửi" (`EMAIL`). Badge của tin cũ kênh `WEB` hiển thị là "In-App". Đã xóa key i18n `notifications.filter.allChannels` vì không còn dùng.
- **P3 — Giữ nguyên theo nhận xét:** các form Mẫu thông báo vẫn có option "Webhook (ERP / Bot)".
