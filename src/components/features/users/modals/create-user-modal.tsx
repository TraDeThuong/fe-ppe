"use client";

import { useState, useMemo } from "react";
import { UserPlus, Mail, Lock, User, Phone, Building2 } from "lucide-react";
import { SculptedModal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import {
  FormField,
  Input,
  PasswordInput,
  Select,
  Checkbox,
  type SelectOption,
} from "@ui/form";
import { useCan } from "@/hooks/use-can";
import { useCreateUser } from "@/hooks/users";
import { useRoles } from "@/hooks/rbac";
import { useSitesCatalog } from "@/hooks/sites";
import { useLocale } from "@/providers/locale-provider";
import { toast } from "@/lib/toast";

export interface CreateUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateUserModal({ open, onOpenChange }: CreateUserModalProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [roleId, setRoleId] = useState("");
  const [siteIds, setSiteIds] = useState<string[]>([]);
  const [mustChangePassword, setMustChangePassword] = useState(true);
  const canReadSites = useCan()("PPE_SITE_READ");

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    phoneNumber?: string;
    roleId?: string;
  }>({});

  const { data: roles = [], isLoading: isLoadingRoles } = useRoles(undefined, {
    enabled: open,
  });
  const { data: sites = [], isLoading: isLoadingSites } = useSitesCatalog({
    enabled: open && canReadSites,
  });
  const createUserMutation = useCreateUser();

  const selectedRoleName = useMemo(
    () => roles.find((r) => r.id === roleId)?.name,
    [roles, roleId],
  );

  const roleOptions: SelectOption[] = useMemo(() => {
    return roles.map((r) => ({
      value: r.id,
      label: r.name,
      description: r.description || undefined,
    }));
  }, [roles]);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setFullName("");
    setPhoneNumber("");
    setRoleId("");
    setSiteIds([]);
    setMustChangePassword(true);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: {
      email?: string;
      password?: string;
      phoneNumber?: string;
      roleId?: string;
    } = {};

    if (!email.trim()) {
      newErrors.email = isVietnamese
        ? "Vui lòng nhập email đăng nhập."
        : "Login email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = isVietnamese
        ? "Email không đúng định dạng."
        : "Invalid email format.";
    }

    if (!password.trim()) {
      newErrors.password = isVietnamese
        ? "Vui lòng nhập mật khẩu khởi tạo."
        : "Initial password is required.";
    } else if (password.length < 8) {
      newErrors.password = isVietnamese
        ? "Mật khẩu phải có tối thiểu 8 ký tự."
        : "Password must be at least 8 characters.";
    } else if (password.length > 128) {
      newErrors.password = isVietnamese
        ? "Mật khẩu không được vượt quá 128 ký tự."
        : "Password must not exceed 128 characters.";
    } else if (
      !/[a-z]/.test(password) ||
      !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^a-zA-Z0-9]/.test(password)
    ) {
      newErrors.password = isVietnamese
        ? "Mật khẩu phải bao gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt."
        : "Password must contain uppercase, lowercase, number, and special character.";
    }

    const trimmedPhone = phoneNumber.trim();
    if (trimmedPhone && !/^[0-9]{10,11}$/.test(trimmedPhone)) {
      newErrors.phoneNumber = isVietnamese
        ? "Số điện thoại phải gồm 10–11 chữ số."
        : "Phone number must be 10–11 digits.";
    }

    if (!roleId) {
      newErrors.roleId = isVietnamese
        ? "Vui lòng chọn vai trò cho tài khoản."
        : "Please select a system role.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error(
        isVietnamese
          ? "Vui lòng điền đầy đủ và chính xác các thông tin bắt buộc."
          : "Please fill in all required fields accurately.",
      );
      return;
    }

    try {
      await createUserMutation.mutateAsync({
        email: email.trim(),
        password,
        roleId,
        fullName: fullName.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined,
        siteIds:
          selectedRoleName !== "ADMIN" && siteIds.length > 0 ? siteIds : undefined,
        mustChangePassword,
      });

      resetForm();
      onOpenChange(false);
    } catch {
      // Error handled by mutation hook toast
    }
  };

  return (
    <SculptedModal
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm();
        onOpenChange(next);
      }}
      title={isVietnamese ? "Thêm người dùng mới" : "Add New User"}
      description={
        isVietnamese
          ? "Tạo tài khoản mới và thiết lập vai trò ban đầu trong hệ thống Smart PPE"
          : "Provision a new account and configure initial system roles in Smart PPE"
      }
      icon={<UserPlus className="h-5 w-5 text-primary" />}
      size="md"
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={createUserMutation.isPending}
          >
            {isVietnamese ? "Hủy bỏ" : "Cancel"}
          </Button>
          <Button
            type="submit"
            form="create-user-form"
            variant="primary"
            disabled={createUserMutation.isPending}
          >
            {createUserMutation.isPending
              ? isVietnamese
                ? "Đang tạo..."
                : "Creating..."
              : isVietnamese
              ? "Tạo tài khoản"
              : "Create Account"}
          </Button>
        </>
      }
    >
      <form id="create-user-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Email */}
        <FormField
          id="create-user-email"
          label={isVietnamese ? "Email đăng nhập" : "Login Email"}
          required
          error={errors.email}
        >
          <Input
            id="create-user-email"
            type="email"
            size="sm"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
            }}
            placeholder="user@example.com"
            prefix={<Mail className="h-4 w-4" />}
            disabled={createUserMutation.isPending}
            autoComplete="off"
          />
        </FormField>

        {/* Mật khẩu khởi tạo */}
        <FormField
          id="create-user-password"
          label={isVietnamese ? "Mật khẩu khởi tạo" : "Initial Password"}
          required
          error={errors.password}
          helperText={
            !errors.password
              ? isVietnamese
                ? "Tối thiểu 8 ký tự"
                : "Minimum 8 characters"
              : undefined
          }
        >
          <PasswordInput
            id="create-user-password"
            size="sm"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
            }}
            placeholder={isVietnamese ? "Tối thiểu 8 ký tự..." : "At least 8 characters..."}
            prefix={<Lock className="h-4 w-4" />}
            disabled={createUserMutation.isPending}
            autoComplete="new-password"
            toggleLabel={{
              show: isVietnamese ? "Hiện mật khẩu" : "Show password",
              hide: isVietnamese ? "Ẩn mật khẩu" : "Hide password",
            }}
          />
        </FormField>

        {/* Họ và tên & Số điện thoại */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField
            id="create-user-fullname"
            label={isVietnamese ? "Họ và tên" : "Full Name"}
          >
            <Input
              id="create-user-fullname"
              type="text"
              size="sm"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={isVietnamese ? "Nguyễn Văn A" : "John Doe"}
              prefix={<User className="h-4 w-4" />}
              disabled={createUserMutation.isPending}
            />
          </FormField>

          <FormField
            id="create-user-phone"
            label={isVietnamese ? "Số điện thoại" : "Phone Number"}
            error={errors.phoneNumber}
          >
            <Input
              id="create-user-phone"
              type="tel"
              size="sm"
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value);
                if (errors.phoneNumber) {
                  setErrors((prev) => ({ ...prev, phoneNumber: "" }));
                }
              }}
              placeholder="0912345678"
              prefix={<Phone className="h-4 w-4" />}
              disabled={createUserMutation.isPending}
            />
          </FormField>
        </div>

        {/* Chọn Vai trò */}
        <FormField
          id="create-user-role"
          label={isVietnamese ? "Vai trò hệ thống" : "System Role"}
          required
          error={errors.roleId}
        >
          <Select
            id="create-user-role"
            size="sm"
            value={roleId}
            onValueChange={(val) => {
              setRoleId(val);
              if (errors.roleId) setErrors((prev) => ({ ...prev, roleId: "" }));
            }}
            placeholder={
              isLoadingRoles
                ? isVietnamese
                  ? "Đang tải vai trò..."
                  : "Loading roles..."
                : isVietnamese
                ? "-- Chọn vai trò (Role) --"
                : "-- Select a role --"
            }
            options={roleOptions}
            disabled={isLoadingRoles || createUserMutation.isPending}
            emptyMessage={isVietnamese ? "Không có vai trò khả dụng" : "No roles available"}
          />
        </FormField>

        {/* Chọn Công trường phụ trách (tùy chọn cho non-Admin) */}
        {canReadSites && selectedRoleName !== "ADMIN" && (
          <div className="rounded-xl border border-border/50 bg-background p-3.5 shadow-[inset_1px_1px_2px_var(--shadow-dark),inset_-1px_-1px_2px_var(--shadow-light)] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-foreground">
                  {isVietnamese
                    ? "Công trường phụ trách (Tùy chọn)"
                    : "Assigned Sites (Optional)"}
                </span>
              </div>
              <span className="text-[10px] font-semibold text-primary px-2 py-0.5 rounded-full bg-primary/10">
                {siteIds.length} {isVietnamese ? "đã chọn" : "selected"}
              </span>
            </div>

            {isLoadingSites ? (
              <p className="text-[11px] text-muted-foreground italic py-1">
                {isVietnamese ? "Đang tải công trường..." : "Loading sites..."}
              </p>
            ) : sites.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic py-1">
                {isVietnamese ? "Chưa có công trường nào." : "No sites available."}
              </p>
            ) : (
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 pt-0.5">
                {sites.map((site) => {
                  const isChecked = siteIds.includes(site.id);
                  return (
                    <label
                      key={site.id}
                      className={`flex items-center justify-between p-2 rounded-lg border transition cursor-pointer text-xs ${
                        isChecked
                          ? "border-primary/40 bg-primary/5 text-foreground font-semibold"
                          : "border-border/30 bg-surface/40 text-muted-foreground hover:bg-surface-elevated"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="truncate font-medium text-foreground">{site.name}</div>
                        <div className="text-[10px] font-mono text-muted-foreground">{site.code}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={createUserMutation.isPending}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSiteIds((prev) => [...prev, site.id]);
                          } else {
                            setSiteIds((prev) => prev.filter((id) => id !== site.id));
                          }
                        }}
                        className="size-4 rounded border-border text-primary focus:ring-primary"
                      />
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Bắt buộc đổi mật khẩu */}
        <div className="pt-1">
          <label
            htmlFor="must-change-password-checkbox"
            className="inline-flex cursor-pointer select-none items-center gap-2.5"
          >
            <Checkbox
              id="must-change-password-checkbox"
              size="sm"
              checked={mustChangePassword}
              onCheckedChange={(checked) => setMustChangePassword(checked)}
              disabled={createUserMutation.isPending}
            />
            <span className="text-xs font-medium text-foreground">
              {isVietnamese
                ? "Yêu cầu đổi mật khẩu ở lần đăng nhập đầu tiên"
                : "Force password change on first login"}
            </span>
          </label>
        </div>
      </form>
    </SculptedModal>
  );
}
