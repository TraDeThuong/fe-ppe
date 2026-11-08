"""Read-only dashboard browser fixture; all API responses are synthetic.
Run: python3 scripts/serve-dashboard-fixture.py --port 3017
Open the printed local URL. No real backend is contacted or changed.
"""
import argparse
import json
from pathlib import Path
import subprocess
import tempfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs
from datetime import datetime, timedelta, timezone
import time

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--port", type=int, default=3017)
args = parser.parse_args()
requests = []
with tempfile.TemporaryDirectory(prefix="ppe-dashboard-") as temp:
    out = Path(temp)
    (out / "empty.js").write_text("")
    build = {
        "entryPoints": [str(ROOT / "scripts/dashboard-fixture.tsx")], "bundle": True, "outfile": str(out / "app.js"),
        "banner": {"js": "globalThis.process = { env: { NODE_ENV: 'test' }, argv: [] };"},
        "logOverride": {"assign-to-define": "silent"}, "platform": "browser", "jsx": "automatic", "tsconfig": str(ROOT / "tsconfig.json"),
        "alias": {"client-only": str(out / "empty.js")},
        "define": {"process.env.NODE_ENV": '"test"', "process.env.NEXT_PUBLIC_API_BASE_URL": '"/api/v1"', "process.env.NEXT_PUBLIC_APP_URL": '"http://localhost"', "process.env.NEXT_PUBLIC_IDENTITY_URL": '"/api/v1"', "process.argv": "[]"},
    }
    subprocess.run(["node", "-e", "require('esbuild').buildSync(" + json.dumps(build) + ")"], cwd=ROOT, check=True)
    css_files = list((ROOT / ".next").glob("**/static/**/*.css"))
    (out / "style.css").write_text("\n".join(path.read_text() for path in css_files[:3]))
    (out / "index.html").write_text('<html lang="vi" data-theme="light"><head><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>')

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *pos, **kw): super().__init__(*pos, directory=temp, **kw)
        def log_message(self, *_): pass
        def send_json(self, data, status=200):
            encoded = json.dumps(data).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(encoded)))
            self.end_headers()
            try: self.wfile.write(encoded)
            except (BrokenPipeError, ConnectionResetError): pass
        def do_GET(self):
            url = urlparse(self.path)
            if url.path == "/fixture-requests": return self.send_json(requests)
            if not url.path.startswith("/api/v1/"): return super().do_GET()
            query = parse_qs(url.query)
            requests.append({"path": url.path, "query": query})
            if url.path == "/api/v1/system/public": return self.send_json({"success": True, "data": {}})
            page = int(query.get("page", [1])[0]); limit = int(query.get("limit", [100])[0])
            mode = query.get("siteId", ["normal"])[0]
            if mode == "slow": time.sleep(1)
            period = "fromDate" in query
            total = 0 if mode == "empty" else 5001 if mode == "limit" and period else 250 if period else 19
            if url.path.endswith("/cameras"): total = 63 if query.get("status") == ["ONLINE"] else 125
            if mode == "page-error" and period and page == 2:
                return self.send_json({"success": False, "message": "Synthetic page failure", "code": "INTERNAL_SERVER_ERROR"}, 503)
            start = datetime.fromisoformat(query.get("fromDate", [datetime.now(timezone.utc).isoformat()])[0].replace("Z", "+00:00"))
            items = []
            for i in range((page-1)*limit, min(page*limit, total)):
                detected = start + timedelta(minutes=i % 1000)
                if url.path.endswith("/cameras"):
                    items.append({"id": f"camera-{i}", "name": f"Camera {i}", "code": f"CAM-{i}", "siteId": mode, "status": "ONLINE" if i % 2 == 0 else "OFFLINE"})
                else:
                    items.append({"id": f"incident-{i}", "siteId": mode, "cameraId": f"camera-{i%125}", "violationType": ["NO_HELMET", "NO_VEST", "RESTRICTED_AREA", "MULTI_VIOLATION", "UNKNOWN"][i%5], "severity": ["HIGH", "LOW", "MEDIUM", "CRITICAL"][i%4], "status": "PENDING_REVIEW" if not period else ["PENDING_REVIEW", "CONFIRMED", "DISMISSED", "RESOLVED", "CLOSED"][i%5], "detectedAt": detected.isoformat(), "resolvedAt": (detected+timedelta(minutes=30)).isoformat()})
            result = {"success": True, "data": items}
            if not (mode == "metadata" and period): result["meta"] = {"total": total, "totalPages": (total+limit-1)//limit, "page": page, "limit": limit}
            return self.send_json(result)

    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"Dashboard fixture: http://localhost:{args.port}", flush=True)
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()
