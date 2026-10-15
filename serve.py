"""Serve Youth Voice on http://localhost:8765 (localhost counts as secure, so Edge allows the microphone)."""
import http.server, socketserver, os, sys, webbrowser, threading

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
os.chdir(os.path.dirname(os.path.abspath(__file__)))

class Handler(http.server.SimpleHTTPRequestHandler):
    # Fixed types: Windows registry sometimes maps .js to text/plain, which breaks modules.
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      ".js": "text/javascript", ".mjs": "text/javascript", ".html": "text/html",
                      ".json": "application/json", ".css": "text/css", ".wasm": "application/wasm"}
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()
    def log_message(self, *a):
        pass

class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

if __name__ == "__main__":
    url = f"http://localhost:{PORT}/"
    try:
        httpd = Server(("127.0.0.1", PORT), Handler)
    except OSError:
        print(f"Port {PORT} is busy; Youth Voice is probably already running at {url}")
        webbrowser.open(url)
        sys.exit(0)
    print(f"Youth Voice is running at {url}  (close this window to stop)")
    if "--no-open" not in sys.argv:
        threading.Timer(0.8, lambda: os.system(f'start msedge "{url}"') if os.name == "nt" else webbrowser.open(url)).start()
    httpd.serve_forever()
