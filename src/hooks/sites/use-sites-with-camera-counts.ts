"use client";

import { useMemo } from "react";
import { useCameraCountsBySite } from "@/hooks/cameras/use-camera-counts-by-site";
import type { SiteItem } from "@/types";

function withCameraCounts(sites: SiteItem[], counts?: ReadonlyMap<string, number>) {
  if (!counts) return sites;
  return sites.map((site) => ({ ...site, cameraCount: counts.get(site.id) ?? 0 }));
}

export function useSitesWithCameraCounts(
  rawSites: SiteItem[],
  rawSitesCatalog: SiteItem[],
  canReadCameras: boolean,
) {
  const siteIds = useMemo(() => {
    const ids = new Set<string>();
    for (const site of rawSites) if (site.id) ids.add(site.id);
    for (const site of rawSitesCatalog) if (site.id) ids.add(site.id);
    return Array.from(ids);
  }, [rawSites, rawSitesCatalog]);

  const enabled = canReadCameras && siteIds.length > 0;
  const { data, isFetching, refetch } = useCameraCountsBySite(siteIds, { enabled });
  const cameraCountMap = useMemo(() => {
    // Query data remains available after a failed background refetch.
    if (!enabled || data === undefined) return undefined;
    const counts = new Map<string, number>();
    for (const item of data) counts.set(item.siteId, item.total);
    return counts;
  }, [enabled, data]);

  const sites = useMemo(
    () => withCameraCounts(rawSites, cameraCountMap),
    [rawSites, cameraCountMap],
  );
  const sitesCatalog = useMemo(
    () => withCameraCounts(rawSitesCatalog, cameraCountMap),
    [rawSitesCatalog, cameraCountMap],
  );

  return { sites, sitesCatalog, isFetching, refetch: enabled ? refetch : undefined };
}
