"""Bundle a production React fixture and serve it locally; API traffic must be mocked by tests."""
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import subprocess
import tempfile
import threading

@contextmanager
def browser_fixture(entry, *, spa=False):
    root = Path(__file__).resolve().parents[1]
    with tempfile.TemporaryDirectory(prefix='ppe-inbox-') as temp:
        out = Path(temp)
        (out / 'empty.js').write_text('')
        config = dict(entryPoints=[str(root / entry)], bundle=True, outfile=str(out / 'app.js'),
            banner={'js': "globalThis.process = { env: { NODE_ENV: 'test' }, argv: [] };"}, logOverride={'assign-to-define': 'silent'}, platform='browser', jsx='automatic', tsconfig=str(root / 'tsconfig.json'), alias={'client-only': str(out / 'empty.js')},
            define={'process.env.NODE_ENV': '"test"', 'process.env.NEXT_PUBLIC_API_BASE_URL': '"/api/v1"', 'process.env.NEXT_PUBLIC_APP_URL': '"http://localhost"', 'process.env.NEXT_PUBLIC_IDENTITY_URL': '"/api/v1"', 'process.argv': '[]'})
        subprocess.run(['node', '-e', 'require("esbuild").buildSync(' + json.dumps(config) + ')'], cwd=root, check=True)
        subprocess.run(['node', '-e', """(async()=>{const fs=require('node:fs'),{compile}=require('@tailwindcss/node'),{Scanner}=require('@tailwindcss/oxide');const root=process.cwd();const c=await compile(fs.readFileSync(root+'/app/globals.css','utf8'),{base:root+'/app',onDependency:()=>{}});fs.writeFileSync(process.argv[1],c.build(new Scanner({sources:c.sources}).scan()));})().catch(e=>{console.error(e);process.exit(1)});""", str(out / 'style.css')], cwd=root, check=True)
        (out / 'index.html').write_text('<html lang="vi" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><style>*,*::before,*::after{animation:none!important;transition:none!important}</style></head><body><div id="root"></div><script src="/app.js"></script></body></html>')
        class Handler(SimpleHTTPRequestHandler):
            def log_message(self, *_): pass
            def do_GET(self):
                if spa and not Path(self.translate_path(self.path)).is_file():
                    self.path = '/index.html'
                super().do_GET()
        server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=temp))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        try: yield f'http://127.0.0.1:{server.server_port}'
        finally: server.shutdown()
