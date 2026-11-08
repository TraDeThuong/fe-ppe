"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  Search,
  ExternalLink,
  ShieldCheck,
  Phone,
  Calendar,
  MapPin,
  Plus,
  Trash2,
  Users,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";
import { useAssignUserSites } from "@/hooks/users";
import { toast } from "@/lib/toast";
import type { UserResponseDto, SiteItem } from "@/types";

export interface UserSitesTabProps {
  user: UserResponseDto;
  userSites: SiteItem[];
  allSites: SiteItem[];
  onOpenAssignSites: () => void;
}

export function UserSitesTab({
  user,
  userSites,
  allSites,
  onOpenAssignSites,
}: UserSitesTabProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";
  const [search, setSearch] = useState("");
  const assignSitesMutation = useAssignUserSites();

  const roleName = user.role?.name || "USER";

  // Resolve on-site role title helper
  const getSiteRoleDetails = (site: SiteItem) => {
    let roleTitle = "";
    let isSpecific = false;
    let contactPhones: string[] = [];

    if (site.contactOfficers) {
      const officers = Array.isArray(site.contactOfficers)
        ? site.contactOfficers
        : typeof site.contactOfficers === "string"
          ? JSON.parse(site.contactOfficers || "[]")
          : [];

      const matched = officers.find(
        (o: any) =>
          (user.fullName && o.name && o.name.toLowerCase().includes(user.fullName.toLowerCase())) ||
          (user.phoneNumber && Array.isArray(o.phones) && o.phones.includes(user.phoneNumber)),
      );

      if (matched) {
        roleTitle = matched.roleTitle || "";
        isSpecific = Boolean(matched.roleTitle);
        contactPhones = matched.phones || [];
      }
    }

    if (!roleTitle) {
      if (roleName === "ADMIN" || roleName === "SUPER_ADMIN") {
        roleTitle = isVietnamese ? "Quản trị viên toàn quyền hệ thống" : "Full System Administrator";
      } else if (roleName === "SAFETY_MANAGER") {
        roleTitle = isVietnamese ? "Chỉ huy trưởng an toàn công trường" : "Site Safety Manager";
      } else if (roleName === "SAFETY_OFFICER") {
        roleTitle = isVietnamese ? "Cán bộ giám sát an toàn PPE" : "Safety Officer";
      } else if (roleName === "SUPERVISOR") {
        roleTitle = isVietnamese ? "Giám sát viên hiện trường" : "Field Supervisor";
      } else {
        roleTitle = isVietnamese ? "Nhân sự an toàn công trường" : "Site Safety Personnel";
      }
    }

    return { roleTitle, isSpecific, contactPhones };
  };

  const filteredSites = useMemo(() => {
    if (!search.trim()) return userSites;
    const term = search.toLowerCase();
    return userSites.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.code.toLowerCase().includes(term) ||
        (s.address && s.address.toLowerCase().includes(term)),
    );
  }, [userSites, search]);

  const handleRemoveSite = async (siteId: string, siteName: string) => {
    const newSiteIds = (user.siteIds || []).filter((id) => id !== siteId);
    try {
      await assignSitesMutation.mutateAsync({
        id: user.id,
        siteIds: newSiteIds,
      });
      toast.success(
        isVietnamese
          ? `Đã rút quyền quản lý tại công trường "${siteName}"`
          : `Removed management assignment for "${siteName}"`,
      );
    } catch {
      // Handled by toast
    }
  };

  return (
    <div className="space-y-5">
      {/* Header with Search and Assign Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl border border-white/80 dark:border-white/5 bg-background dark:bg-card shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_rgba(255,255,255,0.9)] dark:shadow-[4px_4px_10px_rgba(0,0,0,0.35),-2px_-2px_6px_rgba(255,255,255,0.02)]">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={
              isVietnamese
                ? "Tìm công trường phụ trách theo tên, mã hoặc địa chỉ..."
                : "Search assigned sites by name, code, address..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 rounded-xl pl-9 pr-3 text-xs bg-background border border-border/50 text-foreground placeholder:text-muted-foreground shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)] focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={onOpenAssignSites}
          className="gap-2 shadow-[2px_2px_5px_var(--shadow-dark)]"
        >
          <Plus size={15} />
          <span>{isVietnamese ? "Phân công công trường mới" : "Assign New Sites"}</span>
        </Button>
      </div>

      {/* Sites Grid */}
      {filteredSites.length === 0 ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 p-8 text-center bg-background/50">
          <Building2 className="size-10 text-muted-foreground/60" />
          <div className="max-w-sm">
            <h4 className="text-sm font-bold text-foreground">
              {search.trim()
                ? isVietnamese
                  ? "Không tìm thấy công trường phù hợp"
                  : "No matching sites"
                : isVietnamese
                  ? "Chưa được phân công công trường nào"
                  : "No sites assigned yet"}
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              {search.trim()
                ? isVietnamese
                  ? "Hãy thử tìm kiếm với từ khóa khác."
                  : "Try searching with a different keyword."
                : isVietnamese
                  ? `Nhấn nút phân công để chỉ định các công trường mà ${user.fullName || user.email} có trách nhiệm giám sát an toàn.`
                  : "Click assign to designate sites supervised by this user."}
            </p>
          </div>
          {!search.trim() && (
            <Button variant="outline" size="sm" onClick={onOpenAssignSites} className="gap-1.5 mt-2">
              <Plus size={14} />
              <span>{isVietnamese ? "Phân công ngay" : "Assign Now"}</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSites.map((site) => {
            const { roleTitle, isSpecific, contactPhones } = getSiteRoleDetails(site);
            const isSiteActive = site.status === "ACTIVE";

            return (
              <div
                key={site.id}
                className="relative rounded-2xl border border-white/80 dark:border-white/5 bg-background dark:bg-card p-5 shadow-[6px_6px_14px_var(--shadow-dark),-5px_-5px_14px_rgba(255,255,255,0.9)] dark:shadow-[6px_6px_14px_rgba(0,0,0,0.4),-2px_-2px_6px_rgba(255,255,255,0.02)] flex flex-col justify-between space-y-4 hover:border-primary/30 transition-colors"
              >
                <div>
                  {/* Top: Site Code & Status */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-lg border border-border/60 bg-muted/40 font-mono text-[11px] font-bold text-muted-foreground uppercase">
                      {site.code}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-lg border ${
                        isSiteActive
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border/60 bg-muted/30 text-muted-foreground"
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          isSiteActive ? "bg-primary shadow-[0_0_6px_var(--primary)]" : "bg-muted-foreground"
                        }`}
                      />
                      {isSiteActive
                        ? isVietnamese
                          ? "Hoạt động"
                          : "Active"
                        : site.status}
                    </span>
                  </div>

                  {/* Site Name */}
                  <h4 className="text-base font-bold text-foreground leading-snug">
                    {site.name}
                  </h4>

                  {/* Site Address */}
                  {site.address && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                      <MapPin size={13} className="shrink-0 text-muted-foreground/80" />
                      <span className="truncate">{site.address}</span>
                    </p>
                  )}

                  {/* Role at this Site */}
                  <div className="mt-4 p-3 rounded-xl border border-primary/20 bg-primary/[0.04] shadow-[inset_1px_1px_2px_var(--shadow-dark)] space-y-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      {isVietnamese ? "Chức vụ tại công trường này" : "Position at this site"}
                    </span>
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className="text-primary shrink-0" />
                      <span className="text-xs font-bold text-foreground">
                        {roleTitle}
                      </span>
                      {isSpecific && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/20 text-primary font-mono font-semibold">
                          {isVietnamese ? "Đầu mối thực địa" : "On-site Lead"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Contact phone if available */}
                  {(contactPhones.length > 0 || site.contactPhone) && (
                    <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
                      <Phone size={12} className="text-primary" />
                      <span className="font-mono text-[11px]">
                        Hotline: {contactPhones[0] || site.contactPhone}
                      </span>
                    </div>
                  )}
                </div>

                {/* Bottom Card Actions */}
                <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-2">
                  <a
                    href={`/sites/${site.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                  >
                    <span>{isVietnamese ? "Xem chi tiết công trường" : "View Site Profile"}</span>
                    <ExternalLink size={12} />
                  </a>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveSite(site.id, site.name)}
                    disabled={assignSitesMutation.isPending}
                    className="text-xs h-7 px-2 text-danger hover:text-danger hover:bg-danger/10 gap-1"
                    title={isVietnamese ? "Rút quyền khỏi công trường này" : "Remove assignment"}
                  >
                    <Trash2 size={12} />
                    <span>{isVietnamese ? "Rút quyền" : "Unassign"}</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
