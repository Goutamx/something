#!/usr/bin/env python3
"""Development-only static server: root preview + /something/ Pages-path probes."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse

ROOT = Path(__file__).resolve().parents[1]
PREFIX = '/' + ROOT.name


class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        if path.startswith(PREFIX + '/'):
            path = path[len(PREFIX):]
        return super().translate_path(path)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8101)
    parser.add_argument('--bind', default='0.0.0.0')
    args = parser.parse_args()
    handler = partial(Handler, directory=str(ROOT))
    print(f'StudyLeague: http://{args.bind}:{args.port}/; Pages-path probe: {PREFIX}/', flush=True)
    ThreadingHTTPServer((args.bind, args.port), handler).serve_forever()
