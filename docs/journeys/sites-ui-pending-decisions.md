# Hiển thị camera và ghi chú thống kê công trường

Các mục UI tiếp nối nhận xét của FE issue #54 đã được áp dụng trong bố cục hiện tại. [FE issue #54](https://github.com/TraDeThuong/fe-ppe/issues/54)

## KPI và badge Camera trên `/sites/[id]`

- KPI dùng màu trung tính và `--` khi chưa có trạng thái camera. Nếu API công trường chỉ cung cấp tổng số, thẻ hiển thị `--/N` và tỷ lệ `--`. Tổng bằng `0` hiển thị `0/0` và `0%`. Khi công trường có camera nhưng tất cả đều ngoại tuyến, biểu tượng dùng màu cảnh báo.
- Badge Camera dùng cùng tổng số với KPI. Badge hiển thị `--` khi chưa biết tổng và `0` khi đã xác nhận công trường không có camera. Trình đọc màn hình nhận được mô tả tương ứng.

## Ghi chú PDF và Excel trong tab Phân tích

`SiteAnalyticsTab` mô tả nguồn số liệu sự cố theo ngày. Mã Reporting trên `develop` tại `a2603ba` dùng chung các hàm thống kê sự cố cho trang và báo cáo xuất, đồng thời bổ sung dữ liệu thời gian thực cho những ngày chưa tổng hợp khi truy xuất được. [Reporting issue #6](https://github.com/smart-ppe-monitoring/smart-ppe-reporting-service/issues/6)
