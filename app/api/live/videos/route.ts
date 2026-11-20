import { NextRequest } from "next/server";
import { proxyAiGet } from "@/lib/ai-proxy";

export async function GET(req: NextRequest) {
  return proxyAiGet(req, "/api/live/videos");
}
