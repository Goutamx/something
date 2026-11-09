# StudyLeague handoff — 2026-11-09

Read this before changing the app. This is the Git checkout continuation of the
user's earlier handoff, not the old `/home/user` workspace.

## Current artifact and workspace

- Repository: `Goutamx/something`, checkout `/home/user/something`.
- Arena working branch: `arena/344d92ee-something`. Keep all commits/pushes on this
  branch; do not switch branches. Publish `main` changes through a numbered PR.
- **Root `index.html` is the authoritative built app in this workspace.**
- Build `8.0`, 655,659 bytes, MD5 `58be2789e38ec23e1c173e7259612955`.
- HTML and SW imported from the user's attachments without changing their bytes.
  SW cache is `studyleague-v21`; the Settings footer agrees.
- The three supplied PNGs were copied unchanged. Manifest's stale Class 11 name
  corrected to Class 12; `.nojekyll` added for Pages.
- There is no build script or source-partial tree. **Patch the HTML directly.**
- Earlier paths `index-v6-clean-messages.html`, `/home/user/studyleague-deploy/`,
  `studyleague-github.zip`, `/home/user/tools/`, old docs/rules and old probes were
  **not present** in this checkout. Do not assume they exist or regenerate the app.
- Root app files are the deploy files; no second HTML/SW copy needs syncing here.
- `tools/` now contains recreated Playwright probe source, a Firebase mock, a
  development static server and pinned test-only dependencies. There are still
  **no npm runtime dependencies or application build step**.
- `WHAT-WE-BUILT.md` records actual counts, checks and limitations.

## User's standing rules

1. Verify every fix with a Playwright probe before claiming completion. State
   actual counts/results, never “should work.” Do not alter tests just to pass.
2. Bug screenshots must be interpreted through OCR, pixel/DOM measurement or an
   explicit admission that they could not be interpreted. Do not invent a visual
   diagnosis. The uploaded images this turn were app icons, not bug screenshots;
   their natural dimensions, not appearance, were checked in Chromium.
3. No speculation; separate measured facts, judgment calls and untested areas.
4. Keep console snippets short, global-safe and mock-validated. `db`, `me`, and
   `auth` are private closure variables, not console globals. `firebase` is global.
5. User is in Jaipur, CBSE Class 12 Humanities, registered English + History.
6. Deploy through GitHub when connected; do not ask the user to upload to hosting.
   Git/gh authentication is configured in the sandbox; never ask for tokens.
7. Update this file and `WHAT-WE-BUILT.md` when shipping.

## App and syllabus

Vanilla JS offline PWA with Google Firebase Auth / Firestore, league `STUDY1`.
Eight nav tabs (first labelled Home): Home, Subjects, Focus, Exams, Leaderboard,
Activity, Messages, Notes; Profile opens from the avatar.

| Subject | Chapters |
|---|---:|
| English | 19 |
| Mathematics | 13 |
| History | 12 |
| Geography | 17 |
| Political Science | 15 |
| Physics | 14 |
| Chemistry | 10 |
| Biology | 13 |
| Agriculture | 5 |
| Accountancy | 10 |
| Business Studies | 12 |
| Economics | 8 |
| Computer Science | 7 |
| Sociology | 9 |
| Psychology | 7 |
| Physical Education | 10 |
| Entrepreneurship | 6 |
| **Total** | **187** |

There are 22 sections and 748 tasks with the default 4 activities. English +
History is 31 chapters / **124 tasks**, not 748. `slChosenSubjects()` scopes overall
progress and chapter counters. Both Home and Subjects are registration-filtered.

The earlier handoff's deliberate judgments remain: Economics uses the 8 listed
units, not the brief's inconsistent 10; Sociology uses 9 evaluated chapters, not
11. Deleted chapters are omitted, not faded. Do not change this without asking.

## Tests and honest current result

See `tools/README.md` for commands. Run the development server bound to 0.0.0.0;
the tests default to `http://localhost:8101/something/` to exercise Pages-relative
paths. The HTML registers SWs only on HTTPS or hostname `localhost`, not 127.0.0.1.

The previous rig/browser did not survive. Recreated probes use Playwright 1.65.0
and npm-packaged Chromium 153.0.8010.0, including NSS/NSPR libs extracted into /tmp.
This needs registry.npmjs.org, not apt or the Playwright CDN. Dependencies and
results are ignored; never commit large binaries. `npm ci --prefix tools
--ignore-scripts` restores them. Python serves the static HTML; npm is testing only.

- **11 of 12 recreated suites pass**, not the old handoff's claimed clean 12/12.
- **0 browser console errors / uncaught exceptions** in the probes.
- All 14 inline JS blocks and the SW pass Node syntax checks.
- All 17 subjects' 187 chapter titles rendered, with 748 checkboxes.
- Scoped progress, XP, persistence, Back, zero publishing, DM filtering, mocked
  message/notification/note/vote writes and Focus controls pass.
- Real SW offline reload at `/something/` returns 200, build 8.0 and a saved tick.
  v21 activation removes a seeded v19 cache.
- Dark 390×844 phone chapter view: document/main width 390 px, no document overflow.
- Firebase is mocked, external fonts/CDN isolated; production OAuth/rules/sync and
  the public Pages endpoint are not browser-verified. Do not call this a live
  Firebase regression or full phone/dark visual review.

### Newly reproduced existing navigation race (not patched)

Probe 06 attempts 16 rapid tab transitions: **15 succeed, 1 fails**, then the real
Profile editor and stats render successfully. The failure is immediate
Leaderboard → Activity on a fresh load: it remains Leaderboard even after 4.5 s.
A/B: wait 2,200 ms on Leaderboard first, or go directly Home → Activity, and the
Activity feed renders correctly.

Mechanism read from `pageGuard()`: a recent engine navigation (<2,000 ms) makes the
guard adopt the temporary Leaderboard heading borrowed by `renderSocialPage()`.
That changes `S.tab` to `league`, so the asynchronous Activity poll does not
restore Activity. No HTML fix was made, to preserve the exact requested 8.0 hash.
Do not mask the failure with a delay; ship a separately identified future build
if the user asks for the fix.

### Earlier parked risks (from the supplied handoff)

- DM same-name merging may collapse genuinely different students. Freshness uses
  max(updatedAt,lastSeen), then XP. Current duplicate-DM probe confirms the fresh
  Madhaw UID wins, nameless/anonymous rows disappear.
- Weekly bye auto-win, live-status expiry and avatar/XP cosmetic work are parked.
- Production two-user sync remains unverified.
- Do not change `--c-active` for monogram cosmetic work without request.

## Deployment

Target: GitHub Pages, source `main` / repository root, via PR from the fixed Arena
branch. Use git for commits/push to the Arena branch, gh for PR/Pages operations.
A push or PR merge alone is not success; verify the Pages API/build run status.
Internet in this workspace is restricted (GitHub API is reachable; the public
`github.io` host is not on the allowed outbound list). Report API build status
and local browser verification separately, never pretend the public page was
opened with Playwright.

Future application deploys must bump together: HTML `data-sl-build`, the
`slBuildLine` label/cache text, and `const CACHE` in root `sw.js`. Preserve a source
checksum, syntax-check, run probes and document failures. The imported 8.0 already
moves this repository from 7.13/v19 to 8.0/v21, so it was not relabelled again.

After publishing, ask for Ctrl+Shift+R and Settings → App build 8.0. If an old
cache persists, Settings → Reload newest clears the offline shell without clearing
local study data. Real Google auth domain/rules configuration cannot be inferred
from a successful static Pages build.

## Code gotchas

- Re-grep function names rather than trusting old handoff line numbers.
- Hidden engine `.subject` nodes are not visible UI. Filter DOM measurements by
  bounding-rect width/height >4.
- The constructed `.v2-profile-head` is intentionally not appended (duplicate
  profile header removed). Assert the visible `#socialProfileCard` and stats.
- Initial Home paint precedes saved-view restoration (250 ms); wait for restore.
- Focus's paused button says Start, except distracted pause says Resume.
- Ghost studyEvents are append-only; scoring must also check current saved ticks.
  Honest zero publishing needs `slDidUntick` in both stale guard and payload hash.
- Test mocks now model document `.ref`; user snippets should still use
  `collection.doc(d.id).delete()` as documented in the old handoff.
- Capture Playwright console events or return evaluation results explicitly.
