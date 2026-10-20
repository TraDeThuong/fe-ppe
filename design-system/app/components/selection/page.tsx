"use client";

import { useState } from "react";
import {
  Checkbox,
  RadioGroup,
  Switch,
  Select,
  Label,
} from "@ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ui/card";
import { Button } from "@ui/button";
import {
  ShieldAlert,
  HardHat,
  Glasses,
  Footprints,
  Sliders,
  CheckCircle2,
  Bell,
  Cpu,
} from "lucide-react";

export default function SelectionControlsPage() {
  // State demo Checkbox
  const [ppeItems, setPpeItems] = useState({
    helmet: true,
    glasses: true,
    gloves: false,
    boots: true,
  });

  const allChecked = Object.values(ppeItems).every(Boolean);
  const isIndeterminate = Object.values(ppeItems).some(Boolean) && !allChecked;

  const toggleAll = (checked: boolean) => {
    setPpeItems({
      helmet: checked,
      glasses: checked,
      gloves: checked,
      boots: checked,
    });
  };

  // State demo RadioGroup
  const [incidentSeverity, setIncidentSeverity] = useState("medium");
  const [horizontalShift, setHorizontalShift] = useState("morning");

  // State demo Switch
  const [alertSound, setAlertSound] = useState(true);
  const [aiDetection, setAiDetection] = useState(true);
  const [autoSms, setAutoSms] = useState(false);

  // State demo Select
  const [selectedSite, setSelectedSite] = useState("site-1");
  const [selectedRole, setSelectedRole] = useState("safety_lead");

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-12 pb-16">
      {/* Tiêu đề */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            Nhóm 2 — Selection & Controls
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            src/components/ui/form/selection-controls/
          </span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Bộ chọn & Điều khiển (Selection Controls)
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          Tập hợp các thành phần lựa chọn phương án và thao tác bật/tắt theo phong cách{" "}
          <strong className="text-foreground">Neumorphic 3D</strong>: Hộp kiểm Checkbox (hỗ trợ chọn một phần{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">indeterminate</code>),
          nhóm nút tròn RadioGroup, công tắc gạt Switch êm ái và danh sách thả xuống Select cao cấp.
        </p>
      </header>

      {/* 1. CHECKBOX & QUẢN LÝ THEO NHÓM */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          1. Checkbox (Hộp kiểm & Trạng thái Chọn một phần)
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Nhóm chọn tất cả (Master Checkbox) */}
          <Card variant="raised" padding="md">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <HardHat className="size-4 text-primary" />
                Danh mục thiết bị PPE bắt buộc
              </CardTitle>
              <CardDescription className="text-xs">
                Hộp kiểm cha tự động chuyển sang trạng thái `indeterminate` khi chỉ một phần mục con được chọn.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex flex-col gap-3">
              {/* Check all */}
              <div className="flex items-center gap-3 border-b border-border/70 pb-3">
                <Checkbox
                  id="check-all-ppe"
                  checked={allChecked}
                  indeterminate={isIndeterminate}
                  onCheckedChange={toggleAll}
                />
                <label htmlFor="check-all-ppe" className="cursor-pointer text-sm font-semibold text-foreground select-none">
                  {allChecked ? "Bỏ chọn tất cả trang bị" : "Chọn tất cả trang bị PPE"}
                </label>
              </div>

              {/* Individual items */}
              <div className="flex flex-col gap-2.5 pl-6">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="ppe-helmet"
                    checked={ppeItems.helmet}
                    onCheckedChange={(c) => setPpeItems((p) => ({ ...p, helmet: c }))}
                  />
                  <label htmlFor="ppe-helmet" className="cursor-pointer text-sm select-none">
                    Mũ bảo hộ công trình (Hard Hat)
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <Checkbox
                    id="ppe-glasses"
                    checked={ppeItems.glasses}
                    onCheckedChange={(c) => setPpeItems((p) => ({ ...p, glasses: c }))}
                  />
                  <label htmlFor="ppe-glasses" className="cursor-pointer text-sm select-none">
                    Kính chắn bụi & chống văng (Safety Glasses)
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <Checkbox
                    id="ppe-gloves"
                    checked={ppeItems.gloves}
                    onCheckedChange={(c) => setPpeItems((p) => ({ ...p, gloves: c }))}
                  />
                  <label htmlFor="ppe-gloves" className="cursor-pointer text-sm select-none">
                    Găng tay chống cắt (Safety Gloves)
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <Checkbox
                    id="ppe-boots"
                    checked={ppeItems.boots}
                    onCheckedChange={(c) => setPpeItems((p) => ({ ...p, boots: c }))}
                  />
                  <label htmlFor="ppe-boots" className="cursor-pointer text-sm select-none">
                    Giày mũi thép chống đinh (Steel-toe Boots)
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Kích thước & Trạng thái Checkbox */}
          <Card variant="default" padding="md">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-base">Kích thước & Trạng thái khóa</CardTitle>
              <CardDescription className="text-xs">
                Các kích thước chuẩn `sm` (16px), `md` (20px), `lg` (24px) và vô hiệu hóa.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox size="sm" defaultChecked id="cb-sm" />
                  <label htmlFor="cb-sm" className="text-xs font-mono text-muted-foreground select-none">
                    size="sm"
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox size="md" defaultChecked id="cb-md" />
                  <label htmlFor="cb-md" className="text-xs font-mono text-muted-foreground select-none">
                    size="md" (chuẩn)
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox size="lg" defaultChecked id="cb-lg" />
                  <label htmlFor="cb-lg" className="text-xs font-mono text-muted-foreground select-none">
                    size="lg"
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 pt-2 border-t border-border/60">
                <div className="flex items-center gap-3">
                  <Checkbox disabled defaultChecked id="cb-dis-1" />
                  <label htmlFor="cb-dis-1" className="text-xs text-muted-foreground cursor-not-allowed select-none">
                    Đã kiểm duyệt (Bị khóa - Checked disabled)
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox disabled id="cb-dis-2" />
                  <label htmlFor="cb-dis-2" className="text-xs text-muted-foreground cursor-not-allowed select-none">
                    Chưa phân quyền (Bị khóa - Unchecked disabled)
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 2. SWITCH (NÚT GẠT BẬT/TẮT) */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          2. Switch (Nút gạt điều khiển tức thì)
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Cấu hình cảnh báo */}
          <Card variant="raised" padding="md">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="size-4 text-primary" />
                Cấu hình chuông cảnh báo vi phạm
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div>
                  <p className="text-sm font-medium">Bật loa phát thanh hiện trường</p>
                  <p className="text-xs text-muted-foreground">Phát cảnh báo bằng giọng nói khi có người vi phạm</p>
                </div>
                <Switch
                  checked={alertSound}
                  onCheckedChange={setAlertSound}
                  checkedLabel="BẬT"
                  uncheckedLabel="TẮT"
                />
              </div>

              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div>
                  <p className="text-sm font-medium">Nhận diện AI thông minh</p>
                  <p className="text-xs text-muted-foreground">Tự động gắn nhãn bounding box lên luồng video</p>
                </div>
                <Switch
                  checked={aiDetection}
                  onCheckedChange={setAiDetection}
                  checkedLabel="BẬT"
                  uncheckedLabel="TẮT"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Gửi tin nhắn SMS khẩn</p>
                  <p className="text-xs text-muted-foreground">Chỉ áp dụng khi vi phạm lặp lại quá 3 lần</p>
                </div>
                <Switch
                  checked={autoSms}
                  onCheckedChange={setAutoSms}
                  checkedLabel="BẬT"
                  uncheckedLabel="TẮT"
                />
              </div>
            </CardContent>
          </Card>

          {/* Kích thước Switch */}
          <Card variant="default" padding="md">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-base">Kích thước & Trạng thái khóa</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground">size="sm"</span>
                <Switch size="sm" defaultChecked label="Kích thước nhỏ" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground">size="md" (chuẩn)</span>
                <Switch size="md" defaultChecked label="Kích thước tiêu chuẩn" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground">size="lg"</span>
                <Switch size="lg" defaultChecked label="Kích thước lớn" />
              </div>
              <div className="flex items-center justify-between border-t border-border/60 pt-3">
                <span className="text-xs font-mono text-muted-foreground">disabled=true</span>
                <Switch disabled defaultChecked label="Tính năng bị vô hiệu hóa" />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 3. RADIO GROUP (CHỌN 1 TRONG NHIỀU) */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          3. RadioGroup (Nhóm nút tròn độc quyền)
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Hàng dọc kèm mô tả */}
          <Card variant="raised" padding="md">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="size-4 text-primary" />
                Mức độ nghiêm trọng của sự cố (Vertical)
              </CardTitle>
              <CardDescription className="text-xs">
                Sử dụng các phím mũi tên Lên/Xuống để chuyển đổi mục chọn nhanh.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <RadioGroup
                value={incidentSeverity}
                onValueChange={setIncidentSeverity}
                options={[
                  {
                    value: "low",
                    label: "Mức độ 1 — Nhắc nhở",
                    description: "Quên cài quai nón bảo hộ hoặc mang giày chưa đúng quy cách.",
                  },
                  {
                    value: "medium",
                    label: "Mức độ 2 — Cảnh báo vi phạm",
                    description: "Không đeo kính chắn bụi tại khu vực hàn cắt kim loại.",
                  },
                  {
                    value: "critical",
                    label: "Mức độ 3 — Đình chỉ tức thì",
                    description: "Không đeo dây đai an toàn khi làm việc trên giàn giáo cao tầng.",
                  },
                ]}
              />
            </CardContent>
          </Card>

          {/* Hàng ngang */}
          <Card variant="default" padding="md">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-base">Bố cục hàng ngang (Horizontal)</CardTitle>
              <CardDescription className="text-xs">
                Phù hợp cho các lựa chọn ngắn như ca trực hoặc chế độ hiển thị.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground">Ca trực hiện trường:</span>
                <RadioGroup
                  value={horizontalShift}
                  onValueChange={setHorizontalShift}
                  orientation="horizontal"
                  options={[
                    { value: "morning", label: "Ca sáng" },
                    { value: "afternoon", label: "Ca chiều" },
                    { value: "night", label: "Ca tối" },
                    { value: "weekend", label: "Cuối tuần", disabled: true },
                  ]}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 4. SELECT (HỘP THẢ XUỐNG CAO CẤP) */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">
          4. Select (Hộp chọn danh sách thả xuống)
        </h2>
        <Card variant="raised" padding="md">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base">Menu kính mờ (Backdrop Blur) & Điều hướng phím</CardTitle>
            <CardDescription className="text-xs">
              Mở bằng phím Enter/Space/ArrowDown, di chuyển mục bằng phím mũi tên, đóng khi click ra ngoài hoặc bấm Escape.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 grid gap-6 sm:grid-cols-2">
            {/* Chọn công trường */}
            <div className="flex flex-col gap-2">
              <Label>Công trường đang áp dụng:</Label>
              <Select
                value={selectedSite}
                onValueChange={setSelectedSite}
                options={[
                  {
                    value: "site-1",
                    label: "Nhà máy lọc dầu Dung Quất - Phân xưởng A",
                    description: "Khu vực bồn chứa và đường ống dẫn khí nén",
                  },
                  {
                    value: "site-2",
                    label: "Cầu dây văng Mỹ Thuận 2 - Trụ tháp T15",
                    description: "Thi công độ cao nguy hiểm ngoài mặt nước",
                  },
                  {
                    value: "site-3",
                    label: "Metro Tuyến 1 Bến Thành - Suối Tiên (Depot)",
                    description: "Khu sửa chữa đầu máy toa xe và hệ thống điện",
                  },
                  {
                    value: "site-4",
                    label: "Khu công nghiệp VSIP II Bình Dương",
                    description: "Công trình xây dựng nhà kho logistic thông minh",
                    disabled: true,
                  },
                ]}
              />
            </div>

            {/* Chọn vai trò */}
            <div className="flex flex-col gap-2">
              <Label>Phân quyền cán bộ:</Label>
              <Select
                value={selectedRole}
                onValueChange={setSelectedRole}
                options={[
                  { value: "safety_lead", label: "Chỉ huy trưởng an toàn lao động" },
                  { value: "site_engineer", label: "Kỹ sư giám sát kết cấu hiện trường" },
                  { value: "ppe_auditor", label: "Chuyên viên thanh tra & kiểm toán PPE" },
                  { value: "viewer", label: "Người xem khách mời (Chỉ đọc)" },
                ]}
              />
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
