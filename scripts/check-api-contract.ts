/**
 * Đối chiếu các lời gọi API trong FE với OpenAPI của BE đang chạy.
 *
 * Chạy sau mỗi lần kéo BE mới / build lại container:
 *   npx tsx scripts/check-api-contract.ts            # báo cáo, luôn thoát 0
 *   npx tsx scripts/check-api-contract.ts --strict   # thoát 1 nếu có endpoint không tìm thấy
 *
 * Cách làm: quét `apiClient.<method>("<path>")` trong src/, chuẩn hoá tham số đường dẫn rồi so với
 * `paths` của các tệp openapi.json. Endpoint BE không khai báo trong OpenAPI cũng sẽ bị báo — khi đó
 * kiểm tra tay trong route của BE trước khi kết luận là đã bị xoá.
 * Chỉ đối chiếu method + đường dẫn; tham số query vẫn cần xem schema zod bên BE.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..");
const GATEWAY = process.env.CONTRACT_GATEWAY ?? "http://localhost:80/api/v1";

const SPECS: Array<{ name: string; url: string }> = [
  { name: "identity", url: process.env.CONTRACT_IDENTITY_SPEC ?? "http://localhost:9999/openapi.json" },
  { name: "media", url: process.env.CONTRACT_MEDIA_SPEC ?? "http://localhost:8890/openapi.json" },
  { name: "incident", url: `${GATEWAY}/incidents/openapi.json` },
  { name: "reporting", url: `${GATEWAY}/reports/openapi.json` },
  { name: "notification", url: `${GATEWAY}/notifications/openapi.json` },
  { name: "site", url: `${GATEWAY}/sites/openapi.json` },
  { name: "camera", url: `${GATEWAY}/cameras/openapi.json` },
];

const CALL_RE =
  /apiClient\.(get|post|put|patch|delete)\s*(?:<[^()]*?>)?\(\s*([`"'])((?:(?!\2).)+)\2/g;

interface FeCall {
  method: string;
  path: string;
  raw: string;
  file: string;
  line: number;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "__tests__") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

/** `/incidents/${id}/review?x=1` → `/incidents/{}/review` */
function normalizePath(path: string): string {
  return (
    path
      .split("?")[0]
      .replace(/\$\{[^}]*\}/g, "{}")
      .replace(/\{[^}]*\}/g, "{}")
      .replace(/:[A-Za-z_][A-Za-z0-9_]*/g, "{}")
      .replace(/^\/api\/v1(?=\/)/, "")
      .replace(/\/+$/, "") || "/"
  );
}

function collectFeCalls(): FeCall[] {
  const calls: FeCall[] = [];
  for (const file of walk(join(ROOT, "src"))) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(CALL_RE)) {
      const raw = match[3];
      // Bỏ qua URL tuyệt đối và đường dẫn ghép động hoàn toàn (vd `${base}/x`).
      if (/^https?:/i.test(raw) || raw.startsWith("${")) continue;
      calls.push({
        method: match[1].toUpperCase(),
        path: normalizePath(raw),
        raw,
        file: relative(ROOT, file),
        line: text.slice(0, match.index).split("\n").length,
      });
    }
  }
  return calls;
}

async function collectSpecRoutes(): Promise<{ routes: Set<string>; failed: string[] }> {
  const routes = new Set<string>();
  const failed: string[] = [];
  await Promise.all(
    SPECS.map(async ({ name, url }) => {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const spec = (await res.json()) as { paths?: Record<string, Record<string, unknown>> };
        for (const [path, ops] of Object.entries(spec.paths ?? {})) {
          for (const method of Object.keys(ops)) {
            routes.add(`${method.toUpperCase()} ${normalizePath(path)}`);
          }
        }
      } catch (error) {
        failed.push(`${name} (${url}): ${(error as Error).message}`);
      }
    }),
  );
  return { routes, failed };
}

async function main() {
  const strict = process.argv.includes("--strict");
  const calls = collectFeCalls();
  const { routes, failed } = await collectSpecRoutes();

  if (failed.length > 0) {
    console.log("Không tải được OpenAPI của:");
    for (const line of failed) console.log(`  - ${line}`);
    console.log("");
  }

  const missing = new Map<string, FeCall[]>();
  for (const call of calls) {
    const key = `${call.method} ${call.path}`;
    if (routes.has(key)) continue;
    const list = missing.get(key) ?? [];
    list.push(call);
    missing.set(key, list);
  }

  console.log(`Đã quét ${calls.length} lời gọi API trong FE, ${routes.size} route trong OpenAPI.`);
  if (missing.size === 0) {
    console.log("Không có endpoint nào của FE vắng mặt trong OpenAPI.");
    return;
  }
  console.log(`\n${missing.size} endpoint FE gọi nhưng không thấy trong OpenAPI:`);
  for (const [key, list] of [...missing].sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`  ${key}`);
    for (const call of list.slice(0, 3)) console.log(`      ${call.file}:${call.line}`);
  }
  if (strict) process.exitCode = 1;
}

void main();
