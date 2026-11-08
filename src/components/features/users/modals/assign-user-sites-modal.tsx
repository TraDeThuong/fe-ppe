"use client";

import { useState, useEffect, useMemo } from "react";
import { Building2, Search, Check, AlertCircle, Loader2 } from "lucide-react";
import { SculptedModal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useSitesCatalog } from "@/hooks/sites";
import { useAssignUserSites } from "@/hooks/users";
import { useLocale } from "@/providers/locale-provider";
import { toast } from "@/lib/toast";
import type { UserResponseDto } from "@/types";

export interface AssignUserSitesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserResponseDto | null;
}

export function AssignUserSitesModal({
  open,
  onOpenChange,
  user,
}: AssignUserSitesModalProps) {
  const { locale } = useLocale();
  const isVietnamese = locale === "vi-VN";

  const { data: allSites = [], isLoading: isLoadingSites } = useSitesCatalog();
  const assignSitesMutation = useAssignUserSites();

  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (user && open) {
      setSelectedSiteIds(user.siteIds || []);
      setSearchTerm("");
    }
  }, [user, open]);

  const filteredSites = useMemo(() => {
    if (!searchTerm.trim()) return allSites;
    const term = searchTerm.toLowerCase();
    return allSites.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.code.toLowerCase().includes(term) ||
        (s.address && s.address.toLowerCase().includes(term)),
    );
  }, [allSites, searchTerm]);

  const toggleSite = (siteId: string) => {
    setSelectedSiteIds((prev) =>
      prev.includes(siteId) ? prev.filter((id) => id !== siteId) : [...prev, siteId],
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredSites.map((s) => s.id);
    const allSelected = filteredIds.every((id) => selectedSiteIds.includes(id));
    if (allSelected) {
      setSelectedSiteIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedSiteIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await assignSitesMutation.mutateAsync({
        id: user.id,
        siteIds: selectedSiteIds,
      });
      onOpenChange(false);
    } catch {
      // Handled by mutation toast
    }
  };

  if (!user) return null;

  return (
    <SculptedModal
      open={open}
      onOpenChange={onOpenChange}
      title={isVietnamese ? "Phân công công trường trực thuộc" : "Assign Construction Sites"}
      description={
        isVietnamese
          ? `Chỉ định danh sách các công trường mà ${user.fullName || user.email} có thẩm quyền giám sát và xử lý vi phạm.`
          : `Designate construction sites supervised and handled by ${user.fullName || user.email}.`
      }
      icon={<Building2 className="h-5 w-5 text-primary" />}
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-muted-foreground font-mono">
            {isVietnamese
              ? `Đã chọn: ${selectedSiteIds.length} / ${allSites.length} công trường`
              : `Selected: ${selectedSiteIds.length} / ${allSites.length} sites`}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={assignSitesMutation.isPending}
            >
              {isVietnamese ? "Hủy" : "Cancel"}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              disabled={assignSitesMutation.isPending}
              className="gap-2"
            >
              {assignSitesMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{isVietnamese ? "Đang lưu..." : "Saving..."}</span>
                </>
              ) : (
                <span>{isVietnamese ? "Cập nhật phân công" : "Save Assignments"}</span>
              )}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Search input and select all */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={
                isVietnamese
                  ? "Tìm kiếm theo tên, mã hoặc địa chỉ công trường..."
                  : "Search by site name, code, or address..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 rounded-xl pl-9 pr-3 text-xs bg-background border border-border/50 text-foreground placeholder:text-muted-foreground shadow-[inset_1.5px_1.5px_3px_var(--shadow-dark),inset_-1.5px_-1.5px_3px_var(--shadow-light)] focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          {filteredSites.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAllFiltered}
              className="text-xs shrink-0"
            >
              {filteredSites.every((s) => selectedSiteIds.includes(s.id))
                ? isVietnamese
                  ? "Bỏ chọn tất cả"
                  : "Deselect All"
                : isVietnamese
                  ? "Chọn tất cả"
                  : "Select All"}
            </Button>
          )}
        </div>

        {/* Sites list */}
        {isLoadingSites ? (
          <div className="flex min-h-[220px] items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-xs">{isVietnamese ? "Đang tải danh mục công trường..." : "Loading sites catalog..."}</span>
          </div>
        ) : filteredSites.length === 0 ? (
          <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 p-6 text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 text-muted-foreground/60" />
            <p className="text-xs font-medium">
              {isVietnamese ? "Không tìm thấy công trường phù hợp" : "No matching sites found"}
            </p>
          </div>
        ) : (
          <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
            {filteredSites.map((site) => {
              const isSelected = selectedSiteIds.includes(site.id);
              return (
                <div
                  key={site.id}
                  onClick={() => toggleSite(site.id)}
                  className={[
                    "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none",
                    isSelected
                      ? "border-primary/50 bg-primary/[0.06] shadow-[inset_1px_1px_2px_var(--shadow-dark)]"
                      : "border-border/50 bg-background hover:bg-muted/40 shadow-[2px_2px_4px_var(--shadow-dark),-2px_-2px_4px_var(--shadow-light)]",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "flex size-5 shrink-0 mt-0.5 items-center justify-center rounded-md border transition-colors",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/70 bg-background",
                    ].join(" ")}
                  >
                    {isSelected && <Check className="size-3.5 stroke-[3]" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground truncate">
                        {site.name}
                      </span>
                      <span className="px-1.5 py-0.2 rounded border border-border/60 bg-muted/30 font-mono text-[10px] text-muted-foreground uppercase">
                        {site.code}
                      </span>
                      {site.status === "ACTIVE" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-primary font-medium">
                          <span className="size-1.5 rounded-full bg-primary" />
                          {isVietnamese ? "Đang hoạt động" : "Active"}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">
                          {site.status}
                        </span>
                      )}
                    </div>
                    {site.address && (
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {site.address}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SculptedModal>
  );
}
