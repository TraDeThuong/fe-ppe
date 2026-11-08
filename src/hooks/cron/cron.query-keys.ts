export const cronQueryKeys = {
  all: ["cron-jobs"] as const,
  list: () => ["cron-jobs", "list"] as const,
};
