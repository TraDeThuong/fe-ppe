"use client";

import { useMutation } from "@tanstack/react-query";
import { auditService } from "@/services";
import type { ExportAuditParams } from "@/types";

export function useExportAuditLogs() {
  return useMutation({
    mutationFn: async (params: ExportAuditParams) => {
      const blob = await auditService.exportLogs(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = params.format === "json" ? "json" : "csv";
      a.download = `audit_logs_${new Date().toISOString().split("T")[0]}.${ext}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });
}
