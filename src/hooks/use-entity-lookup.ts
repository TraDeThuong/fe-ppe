"use client";

import { useMemo } from "react";
import { useSites } from "@/hooks/sites";
import { useCameras } from "@/hooks/cameras";
import type { CameraItem, SiteItem, ZoneItem } from "@/types";

/**
 * Hook tập trung giải quyết bài toán Data Hydration & Name Resolution
 * giữa 3 phân hệ microservice độc lập: Site - Camera - Incident.
 *
 * Cung cấp tra cứu O(1) tên công trường, mã camera, tên phân khu,
 * giúp các bảng dữ liệu sự cố và camera loại bỏ hoàn toàn các fallback thô
 * ("Công trường" vô danh hoặc UUID cắt ngắn).
 */
export function useEntityLookup() {
  const { data: sitesData, isLoading: sitesLoading } = useSites({ limit: 100 });
  const { data: camerasData, isLoading: camerasLoading } = useCameras({ limit: 200 });

  const sites = useMemo(() => sitesData?.items ?? [], [sitesData]);
  const cameras = useMemo(() => camerasData?.items ?? [], [camerasData]);

  // Map tra cứu nhanh Site theo ID
  const sitesMap = useMemo(() => {
    const map = new Map<string, SiteItem>();
    for (const s of sites) {
      if (s.id) map.set(s.id, s);
    }
    return map;
  }, [sites]);

  // Map tra cứu nhanh Camera theo ID
  const camerasMap = useMemo(() => {
    const map = new Map<string, CameraItem>();
    for (const c of cameras) {
      if (c.id) map.set(c.id, c);
    }
    return map;
  }, [cameras]);

  // Tra cứu thực thể Site
  const getSite = (siteId?: string | null): SiteItem | undefined => {
    if (!siteId) return undefined;
    return sitesMap.get(siteId);
  };

  // Tra cứu tên công trường kèm fallback thông minh
  const getSiteName = (siteId?: string | null, fallback = "Công trường xây dựng"): string => {
    if (!siteId) return fallback;
    const s = sitesMap.get(siteId);
    return s?.name || fallback;
  };

  // Tra cứu mã công trường
  const getSiteCode = (siteId?: string | null): string | undefined => {
    if (!siteId) return undefined;
    return sitesMap.get(siteId)?.code;
  };

  // Tra cứu thực thể Camera
  const getCamera = (cameraId?: string | null): CameraItem | undefined => {
    if (!cameraId) return undefined;
    return camerasMap.get(cameraId);
  };

  // Tra cứu mã định danh Camera
  const getCameraCode = (cameraId?: string | null, fallback?: string): string => {
    if (!cameraId) return fallback || "--";
    const c = camerasMap.get(cameraId);
    return c?.code || fallback || cameraId.slice(0, 8);
  };

  // Tra cứu tên Camera
  const getCameraName = (cameraId?: string | null, fallback = "Camera Giám Sát"): string => {
    if (!cameraId) return fallback;
    const c = camerasMap.get(cameraId);
    return c?.name || fallback;
  };

  // Tra cứu tên phân khu (Zone)
  const getZoneName = (
    siteId?: string | null,
    zoneId?: string | null,
    fallback = "Khu vực chung"
  ): string => {
    if (!siteId || !zoneId) return fallback;
    const site = sitesMap.get(siteId);
    if (!site?.zones || site.zones.length === 0) return fallback;
    const zone = site.zones.find((z) => z.id === zoneId);
    return zone?.name || fallback;
  };

  // Lấy danh sách camera thuộc một công trường
  const getCamerasForSite = (siteId?: string | null): CameraItem[] => {
    if (!siteId) return cameras;
    return cameras.filter((c) => c.siteId === siteId);
  };

  // Lấy danh sách phân khu thuộc một công trường
  const getZonesForSite = (siteId?: string | null): ZoneItem[] => {
    if (!siteId) return [];
    const site = sitesMap.get(siteId);
    return site?.zones || [];
  };

  return {
    sites,
    cameras,
    sitesMap,
    camerasMap,
    getSite,
    getSiteName,
    getSiteCode,
    getCamera,
    getCameraCode,
    getCameraName,
    getZoneName,
    getCamerasForSite,
    getZonesForSite,
    isLoading: sitesLoading || camerasLoading,
  };
}
