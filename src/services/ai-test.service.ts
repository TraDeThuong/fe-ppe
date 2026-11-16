import { ensureFreshAccessToken } from "@/lib/axios";
import { tokenStore } from "@/lib/token";
import type {
  JobMeta,
  JobSummary,
  LiveConfigPayload,
  LiveRuntimeConfigPatchPayload,
  LiveRuntimeConfigResponse,
  LiveSessionInfo,
  LiveStartPayload,
  LiveStatsResponse,
  LiveSyncTriggerResponse,
  LiveVideoItem,
  ModelInfo,
  UploadJobResponse,
} from "@/types/ai-test.types";

export class AiServiceHttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AiServiceHttpError";
    this.status = status;
  }
}

export function isAiEndpointNotFoundError(error: unknown): boolean {
  return error instanceof AiServiceHttpError && error.status === 404;
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const text = await response.text();
    if (!text) return `HTTP ${response.status} ${response.statusText}`;
    const parsed = JSON.parse(text) as { detail?: unknown; message?: unknown; error?: unknown };
    if (typeof parsed.detail === "string") return parsed.detail;
    if (Array.isArray(parsed.detail)) {
      return parsed.detail
        .map((item) =>
          typeof item === "object" && item && "msg" in item
            ? String((item as { msg?: unknown }).msg ?? "")
            : JSON.stringify(item),
        )
        .filter(Boolean)
        .join("; ");
    }
    if (typeof parsed.message === "string") return parsed.message;
    if (typeof parsed.error === "string") return parsed.error;
    return text;
  } catch {
    return `HTTP ${response.status} ${response.statusText}`;
  }
}

function buildAuthorizedHeaders(initHeaders?: HeadersInit): Headers {
  const headers = new Headers(initHeaders);
  if (!headers.has("Authorization")) {
    const token = tokenStore.getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }
  return headers;
}

async function authorizedFetch(url: string, init?: RequestInit): Promise<Response> {
  const doFetch = () =>
    fetch(url, {
      cache: "no-store",
      credentials: "include",
      ...init,
      headers: buildAuthorizedHeaders(init?.headers),
    });

  let response = await doFetch();
  // Đồng bộ cơ chế single-flight refresh khi JWT trên Cookie/Memory vừa hết hạn
  if (response.status === 401) {
    const refreshed = await ensureFreshAccessToken().catch(() => false);
    if (refreshed) {
      response = await doFetch();
    }
  }

  if (!response.ok) {
    throw new AiServiceHttpError(response.status, await parseErrorMessage(response));
  }
  return response;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await authorizedFetch(url, init);
  return (await response.json()) as T;
}

export const aiTestService = {
  async getModels(): Promise<ModelInfo[]> {
    const raw = await requestJson<unknown>("/api/ai-test/models");
    const list = Array.isArray(raw)
      ? raw
      : typeof raw === "object" && raw !== null && Array.isArray((raw as { models?: unknown }).models)
        ? (raw as { models: unknown[] }).models
        : [];

    return list
      .map((item): ModelInfo | null => {
        if (typeof item === "string") {
          return { name: item, path: item };
        }
        if (typeof item === "object" && item !== null) {
          const obj = item as Partial<ModelInfo>;
          const name = typeof obj.name === "string" ? obj.name : typeof obj.path === "string" ? obj.path : "";
          const path = typeof obj.path === "string" ? obj.path : name;
          if (!name) return null;
          return {
            name,
            path,
            size_mb: typeof obj.size_mb === "number" ? obj.size_mb : undefined,
            is_default: Boolean(obj.is_default),
          };
        }
        return null;
      })
      .filter((m): m is ModelInfo => m !== null);
  },

  async listJobs(): Promise<JobSummary[]> {
    const raw = await requestJson<JobSummary[] | { jobs?: JobSummary[] }>("/api/ai-test/jobs");
    if (Array.isArray(raw)) return raw;
    return Array.isArray(raw?.jobs) ? raw.jobs : [];
  },

  async uploadVideo(file: File): Promise<UploadJobResponse> {
    const formData = new FormData();
    formData.append("file", file);
    return requestJson<UploadJobResponse>("/api/ai-test/upload", {
      method: "POST",
      body: formData,
    });
  },

  async startJob(jobId: string, model?: string): Promise<Record<string, unknown>> {
    const query = model ? `?model=${encodeURIComponent(model)}` : "";
    return requestJson<Record<string, unknown>>(
      `/api/jobs/${encodeURIComponent(jobId)}/start${query}`,
      { method: "POST" },
    );
  },

  async getJobStatus(jobId: string): Promise<JobSummary> {
    return requestJson<JobSummary>(`/api/jobs/${encodeURIComponent(jobId)}/status`);
  },

  async getJobMeta(jobId: string): Promise<JobMeta> {
    return requestJson<JobMeta>(`/api/jobs/${encodeURIComponent(jobId)}/meta`);
  },

  async getJobLogText(jobId: string): Promise<string> {
    const response = await authorizedFetch(`/api/jobs/${encodeURIComponent(jobId)}/log`);
    return response.text();
  },

  getJobVideoUrl(jobId: string, cacheBust?: number): string {
    const base = `/api/jobs/${encodeURIComponent(jobId)}/video`;
    return cacheBust ? `${base}?t=${cacheBust}` : base;
  },

  async listLiveVideos(): Promise<LiveVideoItem[]> {
    const raw = await requestJson<LiveVideoItem[] | { videos?: LiveVideoItem[] }>("/api/live/videos");
    if (Array.isArray(raw)) return raw;
    return Array.isArray(raw?.videos) ? raw.videos : [];
  },

  async startLiveStream(payload: LiveStartPayload): Promise<LiveSessionInfo> {
    return requestJson<LiveSessionInfo>("/api/live/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  async updateLiveConfig(
    cameraId: string,
    payload: LiveConfigPayload,
  ): Promise<Record<string, unknown>> {
    return requestJson<Record<string, unknown>>(
      `/api/live/${encodeURIComponent(cameraId)}/config`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
  },

  async getLiveStats(cameraId: string): Promise<LiveStatsResponse> {
    return requestJson<LiveStatsResponse>(
      `/api/live/${encodeURIComponent(cameraId)}/stats`,
    );
  },

  async stopLiveStream(cameraId: string): Promise<Record<string, unknown>> {
    return requestJson<Record<string, unknown>>(
      `/api/live/${encodeURIComponent(cameraId)}/stop`,
      { method: "POST" },
    );
  },

  async listLiveSessionsWithMeta(): Promise<{
    sessions: LiveSessionInfo[];
    maxSessions: number | null;
  }> {
    const response = await authorizedFetch("/api/live/sessions");
    const headerVal = response.headers.get("X-Live-Max-Sessions");
    const parsedMax = headerVal ? Number(headerVal) : NaN;
    const maxSessions =
      Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : null;
    const raw = (await response.json()) as LiveSessionInfo[] | { sessions?: LiveSessionInfo[] };
    const sessions = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.sessions)
        ? raw.sessions
        : [];
    return { sessions, maxSessions };
  },

  async listLiveSessions(): Promise<LiveSessionInfo[]> {
    const { sessions } = await this.listLiveSessionsWithMeta();
    return sessions;
  },

  async getLiveRuntimeConfig(): Promise<LiveRuntimeConfigResponse> {
    return requestJson<LiveRuntimeConfigResponse>("/api/live/config");
  },

  async updateLiveRuntimeConfig(
    payload: LiveRuntimeConfigPatchPayload,
  ): Promise<{ status: string; max_sessions: number; sync?: unknown }> {
    return requestJson("/api/live/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  async triggerLiveSync(): Promise<LiveSyncTriggerResponse> {
    return requestJson<LiveSyncTriggerResponse>("/api/live/sync", {
      method: "POST",
    });
  },

  getLiveStreamUrl(cameraId: string, cacheBust?: number): string {
    const base = `/api/live/${encodeURIComponent(cameraId)}/stream`;
    return cacheBust ? `${base}?t=${cacheBust}` : base;
  },
};
