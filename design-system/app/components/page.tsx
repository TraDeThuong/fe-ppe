import Link from "next/link";

const components = [
  {
    href: "/components/typography",
    name: "Typography",
    description:
      "Hiển thị văn bản phong cách Neumorphism với 5 biến thể (default, embossed, debossed, soft, display) cùng hỗ trợ linh hoạt các thẻ HTML.",
  },
  {
    href: "/components/button",
    name: "Button",
    description:
      "Nút bấm với 9 biến thể (primary, secondary, outline, ghost, danger, hybrid, sculpted, aurora, metal) và 3 kích thước (sm, md, lg).",
  },
  {
    href: "/components/card",
    name: "Card",
    description:
      "Khối chứa nội dung với 6 biến thể (default, raised, inset, interactive, glass, accent) và 4 mức padding.",
  },
  {
    href: "/components/toast",
    name: "Toast",
    description:
      "Hệ thống thông báo Toast phong cách Neumorphic & Wooden với 4 trạng thái (success, error, loading, blank), hiệu ứng đổ bóng 3D và tự động đồng bộ theme sáng/tối.",
  },
  {
    href: "/components/loader",
    name: "Loader & Skeleton",
    description:
      "Biểu tượng đang tải Neumorphic (Spinner, Dots nhấp nháy) và hiệu ứng Skeleton shimmer giả lập khung giao diện khi chờ dữ liệu.",
  },
  {
    href: "/components/input",
    name: "Input & Textarea",
    description:
      "Các trường nhập liệu một dòng và nhiều dòng: Input (3 kích thước, icon nổi 3D, prefix/suffix), Textarea auto-grow và PasswordInput.",
  },
  {
    href: "/components/selection",
    name: "Selection Controls",
    description:
      "Bộ điều khiển lựa chọn: Checkbox (hỗ trợ indeterminate), RadioGroup, công tắc gạt Switch và hộp chọn Select menu kính mờ.",
  },
  {
    href: "/components/form",
    name: "Form (Biểu mẫu hoàn chỉnh)",
    description:
      "Tổng hợp FormField, FormSection đa cột và FormActions tích hợp trạng thái loading qua Form Đăng nhập & Form Tạo công trường.",
  },
];

export default function Page() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Components</h1>
        <p className="text-muted-foreground">
          Thư viện component UI dùng chung của hệ thống. Mỗi component có trang
          riêng với ví dụ và bảng thuộc tính.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {components.map((component) => (
          <Link
            key={component.href}
            href={component.href}
            className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-5 transition-colors hover:bg-accent"
          >
            <span className="font-medium">{component.name}</span>
            <span className="text-sm leading-6 text-muted-foreground">
              {component.description}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
