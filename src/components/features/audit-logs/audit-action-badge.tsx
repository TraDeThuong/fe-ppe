"use client";

export function AuditActionBadge({ action }: { action: string }) {
  const getBadgeStyle = (act: string) => {
    const a = act.toUpperCase();
    if (a.includes("CREATE") || a.includes("REGISTER") || a.includes("ENABLE")) {
      return "bg-success/10 text-success border-success/30";
    }
    if (a.includes("DELETE") || a.includes("REMOVE") || a.includes("REVOKE") || a.includes("DISABLE")) {
      return "bg-danger/10 text-danger border-danger/30";
    }
    if (a.includes("UPDATE") || a.includes("TOGGLE") || a.includes("ASSIGN")) {
      return "bg-warning/10 text-warning border-warning/30";
    }
    if (a.includes("CONFIRM") || a.includes("RESOLVE") || a.includes("INCIDENT")) {
      return "bg-primary/10 text-primary border-primary/30";
    }
    if (a.includes("LOGIN") || a.includes("AUTH")) {
      return "bg-info/10 text-info border-info/30";
    }
    return "bg-muted text-muted-foreground border-border/40";
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-xs font-semibold ${getBadgeStyle(
        action,
      )}`}
    >
      {action}
    </span>
  );
}
