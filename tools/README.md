# StudyLeague browser probes (development only)

The app is the built root `index.html`. **No application build step, framework,
or npm runtime dependency has been added.** `tools/` is a separate test rig.
The prior chat's `/home/user/tools/` and probes were absent; these are recreated
probes, not the handoff's original 12 tests.

## Run

Requires Python 3 and Node 22.17+ (or Node 24+).

```sh
npm ci --prefix tools --ignore-scripts --no-audit --no-fund
python3 tools/serve.py --bind 0.0.0.0 --port 8101
# In another terminal:
npm test --prefix tools
npm run test:notes --prefix tools
```

The server serves `/` for preview and `/something/` to exercise Pages' project
subpath. Default probe URL is `http://localhost:8101/something/` (override with
`STUDYLEAGUE_URL`). Use localhost, not 127.0.0.1: the supplied HTML only registers
its SW on HTTPS or hostname localhost.

The npm browser package includes Chromium and NSS/NSPR libraries, avoiding the
Playwright CDN and apt. Binaries extract into /tmp; node_modules and results are
ignored. **Never commit the browser binary.** `CHROMIUM_PATH` can select another
suitable installed Chromium.

## Notes alignment — build 8.1

`probe_notes_alignment.cjs` loads the exact 8.0 HTML into memory from commit
`b9a032bb188fbcba204312fda7b3c3cc61f192e7`, checks its original MD5 and reproduces
its bad card/modal/comment offsets. It then tests the current HTML across
light/dark, desktop 1366×687 / phone 390×844, and short/long names with multi-line
comments: **24 alignment measurements across 8 variants**.

Assertions cover 18px avatars, centered name layout boxes (≤0.5px), text Range
centres (≤1px), centered monograms, spacing/containment, comment-text indentation,
author text-only markup, own-comment Delete, voting, deleting and posting comments.
Report: `tools/results/notes-alignment.json`. Current maximum measured box-centre
difference is 0.008px; text-centre difference 0.875px. Exact font measurements are
for isolated-CDN/browser fallback fonts, not production font pixel inspection.

If a future shallow checkout lacks the baseline object, fetch the **exact commit**
before the A/B probe. Do not substitute the fixed HTML or change the old hash to
make the baseline pass. `NOTES_BASELINE_REF` can name that same 8.0 artifact through
another locally available ref.

## Scope / interpretation

- Auth/Firestore are in-memory doubles (`mockfb.js`). External font/SDK requests
  are isolated without network; tests never write production student data.
- Offline test omits Firebase and uses real SW/Cache Storage, at /something/ with
  a 390×844 dark viewport. Current identity is **8.1 / v22**; v21 eviction is tested.
- Queries, merged/dotted writes, messages/notifications, batches, notes/votes and
  provider markers are exercised. **Security rules, real Google OAuth and
  production two-person sync are not verified.**
- DOM assertions filter nodes without dimensions, not a full visual review.
- Browser console errors/uncaught exceptions are captured and fail the run.
- Full regression pins the current 8.1 HTML checksum/size/build/footer/cache. Update
  these together only after intentionally changing the delivered app.

Full reports: `tools/results/regression.json`. Focused suite example:

```sh
PROBE_FILTER=06 npm test --prefix tools
```

## Known unrelated failure — Activity routing

Full build 8.1 result is **11/12 suites, 0 browser errors**. Notes-specific checks
pass independently. Probe 06 deliberately retains rapid routing: on a fresh load,
a quick Leaderboard → Activity transition can show/stay on Leaderboard. Current
run passed 14/16 transitions; both Activity heading checks observed Leaderboard;
Profile passed. Earlier 8.0 run passed 15/16. Timing affects the entry/repro.

`pageGuard()` adopts the temporary League heading while the last engine click is
<2,000ms old. `renderSocialPage()` then sees the wrong `S.tab` and cannot restore
Activity when its feed arrives. No router fix was attempted for Notes alignment.
`npm test` therefore correctly exits nonzero. Do not hide it with an added sleep.

Earlier A/B measured after ~4.5 seconds:

| Entry to Activity | Heading | Active tab | Feed visible |
|---|---|---|---|
| Immediately after Leaderboard | Leaderboard | league | No |
| 2,200ms after Leaderboard | Activity | activity | Yes |
| Directly from Home | Activity | activity | Yes |
