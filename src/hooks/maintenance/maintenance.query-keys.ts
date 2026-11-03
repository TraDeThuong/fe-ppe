export const maintenanceQueryKeys = {
  all: ["maintenance"] as const,
  publicStatus: () => [...maintenanceQueryKeys.all, "public"] as const,
  config: () => [...maintenanceQueryKeys.all, "config"] as const,
};
