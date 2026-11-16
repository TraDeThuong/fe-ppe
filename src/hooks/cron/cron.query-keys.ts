export const cronQueryKeys = {
  all: ["cron-jobs"] as const,
  list: () => ["cron-jobs", "list"] as const,
  history: (jobName: string) => ["cron-jobs", "history", jobName] as const,
  recentAudit: () => ["cron-jobs", "recent-audit"] as const,
};
