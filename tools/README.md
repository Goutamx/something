# StudyLeague browser probes (development only)

The app is the built root `index.html`. **No application build step, framework,
or npm runtime dependency has been added.** `tools/` is a separate test rig.
The prior chat's `/home/user/tools/` and probes were not present in this checkout;
these are newly recreated probes, not the handoff's original 12 tests.

## Run

Requires Python 3 and Node 22.17+ (or Node 24+).

```sh
npm ci --prefix tools --ignore-scripts --no-audit --no-fund
python3 tools/serve.py --bind 0.0.0.0 --port 8101
# In another terminal:
npm test --prefix tools
```

The server serves the app at `/` for preview and `/something/` to exercise
GitHub Pages' project subpath. The probe default is
`http://localhost:8101/something/`. Use `STUDYLEAGUE_URL` to change it.
`localhost` (rather than `127.0.0.1`) is intentional: the supplied HTML only
registers its service worker on HTTPS or hostname `localhost`.

The npm browser package includes Chromium and NSS/NSPR libraries, avoiding a
Playwright-CDN download or apt in an environment with restricted internet access.
It extracts binaries into `/tmp`. Both `node_modules/` and results are ignored;
**never commit the browser binary**. Alternatively, set `CHROMIUM_PATH` to a
suitable installed Chromium executable.

## Scope and interpretation

- Auth and Firestore are in-memory test doubles (`mockfb.js`). External font and
  SDK requests are fulfilled without network. Tests never write production data.
- The offline test omits Firebase entirely and uses the real browser service
  worker and Cache Storage, at `/something/`, with a 390×844 dark viewport.
- Query snapshots, message writes, notifications, merged/dotted updates, batches,
  votes, and provider markers are exercised, but **security rules, real Google
  OAuth, and two-person production sync are not verified**.
- DOM assertions filter out elements without dimensions. They are not visual
  review or evidence that every phone layout is correct.
- Browser console errors and uncaught exceptions are captured and fail the run.
- Build 8.0's HTML checksum is pinned. Do not silently change the assertion to
  accommodate an accidental modification.

Reports are written to `tools/results/regression.json`. A focused run is possible:

```sh
PROBE_FILTER=06 npm test --prefix tools
```

## Known failure in the supplied, unchanged 8.0

Probe 06 deliberately keeps the rapid navigation case. On a fresh load, a quick
Leaderboard → Activity switch can land on Leaderboard rather than Activity.
`pageGuard()` adopts the temporary League heading while the last engine click is
less than 2,000 ms old. `renderSocialPage()` then sees the wrong `S.tab` and does
not restore Activity after the feed arrives. The HTML is preserved byte-for-byte
for the user's requested deployment; this is **not** a clean 12/12 result.

A separate Playwright A/B check measured:

| Entry to Activity | Heading after ~4.5 s | Active tab | Feed visible |
|---|---|---|---|
| Immediately after Leaderboard | Leaderboard | league | No |
| 2,200 ms after Leaderboard | Activity | activity | Yes |
| Directly from Home | Activity | activity | Yes |

No application fix was attempted. Do not mark this test passing by introducing a
sleep that hides the race. A future fix needs a new build identity/cache name,
re-probing, and an updated checksum/handoff.
