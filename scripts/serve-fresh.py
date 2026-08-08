#!/usr/bin/env python3
"""Serve Foko Lab on a newly allocated localhost port."""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


def main() -> None:
    server = ThreadingHTTPServer(("127.0.0.1", 0), SimpleHTTPRequestHandler)
    port = server.server_address[1]
    print(f"Foko Lab is available at http://127.0.0.1:{port}/", flush=True)
    print("Press Ctrl+C to stop the server.", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
