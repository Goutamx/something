# StudyLeague handoff — 2026-11-09 — build 8.1

Read before changing the app. This is the Git checkout, not the old /home/user
prototype workspace.

## Current artifact / working branch

- Repository `Goutamx/something`, checkout `/home/user/something`.
- Current Arena branch **`arena/4fa95bc6-something`**, active. The old
  `arena/344d92ee-something` was merged; it is not the current working branch.
  Keep all work/commits/pushes on the current fixed branch; never switch branches.
- **Root `index.html` is the authoritative built app. No build step.**
- Current **8.1**, **656,646 bytes**, MD5 `cc8bf59054bf6d1b4d0e48fbda08033a`.
- HTML `data-sl-build`, Settings build footer and root SW agree on **8.1 / v22**.
- This turn patches the Notes alignment bug. It does NOT claim a public deploy.
- 8.0 baseline was 655,659 bytes, MD5 `58be2789e38ec23e1c173e7259612955`,
  cache v21, imported byte-for-byte from the user's earlier attachments.
- Existing manifest is Class 12. The three original icons and `.nojekyll` remain.
- There is no build script/source-partial tree. **Patch the built HTML directly.**
- Old paths `index-v6-clean-messages.html`, `/home/user/studyleague-deploy/`,
  `/home/user/tools/`, old zip, rules files and old probes were not present here.
  Do not assume they exist or try to regenerate the app.
- `tools/` is a separate development-only rig. No application runtime npm deps.
- `WHAT-WE-BUILT.md` contains the current checks and accurate release identity.

## User's standing rules

1. Verify every fix with Playwright before claiming completion. Give real numbers,
   never “should work.” Do not hide a failure by weakening a test.
2. Screenshots must be interpreted with OCR or pixel/DOM measurement, or plainly
   admit they cannot be interpreted. Do not invent a visual diagnosis. The latest
   Notes screenshots were diagnosed/reproduced through DOM measurement.
3. No speculation: distinguish measured facts, judgment calls and untested areas.
4. Keep user console snippets short, global-safe and mock-validated. `db`, `me`,
   `auth` are closure-private, not console globals; `firebase` is global.
5. User is in Jaipur, Class 12 Humanities, registered English + History.
6. Use GitHub delivery when connected; do not ask for hosting uploads or tokens.
7. Update this file and `WHAT-WE-BUILT.md` with shipped/verified changes.

## 8.1 — Notes avatar/name alignment fixed

Scope: Browse Notes cards, note-modal byline, comment author headers only.

Baseline Playwright DOM measurements using exact 8.0 HTML at 1366×687 dark:
card/modal avatar centre **5.797 px below** the name's text bounds; comment avatar
centre **2.500 px above**. The old small chip used `vertical-align:-4px` inline,
while the comment's avatar was a sibling of the entire two-line name/body block
in a top-aligned flex row.

Implementation:
- Notes-IIFE-local `noteAuthor(name, uid, colour, bold)` renders an escaped name
  and existing monogram inside `.sl-note-author`, an inline-flex centered pair.
- `.sl-note-author .sl-mono-chip.sm` clears the baseline hack/margin only there.
  Other avatars and `--c-active` are untouched; size stays 18×18 px / 11 px glyph.
- `.sl-note-byline` centers the pair and metadata. Modal context/byline split into
  separate rows. Context and long names wrap within available width.
- Comment pair lives in `.sl-note-comment-body`; `.sl-note-comment-text` is
  indented 24 px (18 px avatar + 6 px gap), under the name rather than the avatar.
  Delete button, voting, posting and Firestore schema remain intact.
- Re-grep these class/helper names rather than trusting old line numbers.

New regression: `npm run test:notes --prefix tools`:
- Exact 8.0 baseline from commit `b9a032bb188fbcba204312fda7b3c3cc61f192e7` is
  loaded in memory with `git show`; original MD5 asserted; bad offsets reproduced.
- **24 alignment checks / 8 variants pass**: dark/light × desktop 1366×687/phone
  390×844 × short/long names. Long variants include multi-line comments.
- Avatar/name layout-box centre difference at most **0.008 px**.
- Maximum text Range centre difference **0.875 px** (cards/modal). Comments are
  0.266–0.273 px; monogram text centres are 0 px from avatar centres in this probe.
- Avatar size, containment, spacing, comment indent, escaped text-only name DOM,
  voting, comment deletion and posting verified. **0 browser errors**.
- External CDN/fonts are isolated, so exact text measurements use browser fallback
  fonts, not a screenshot pixel reading or production font/OAuth verification.
- If the baseline commit is absent from a later shallow checkout, fetch that exact
  commit before running this before/after probe. Do not replace it with 8.1.

## App / syllabus

Vanilla JS offline PWA; Firebase Google Auth/Firestore; league STUDY1. Nav tabs:
Home, Subjects, Focus, Exams, Leaderboard, Activity, Messages, Notes. Profile is
behind the top-right avatar.

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

22 sections / 748 default activities total. English + History = **31 chapters,
124 tasks**, not 748. `slChosenSubjects()` scopes progress/chapter counts. Home and
Subjects both filter registration. One fully completed registered chapter gives
4 tasks / 3% overall / 60 XP in the verified no-focus case.

Earlier deliberate syllabus judgments remain: Economics uses the 8 listed units
rather than the inconsistent brief's 10; Sociology uses 9 evaluated chapters
rather than 11. Deleted chapters are omitted, not faded. Ask before changing.

## Test setup / current full result

`tools/README.md` documents commands. Reinstall dev dependencies with
`npm ci --prefix tools --ignore-scripts --no-audit --no-fund`; they/browsers do not
survive snapshots. Never commit node_modules, browser binaries or large artifacts.
Playwright 1.65.0 and npm-packaged Chromium 153.0.8010.0 include NSS/NSPR libs
extracted to /tmp; only registry.npmjs.org is required, not apt or a browser CDN.

Start `python3 tools/serve.py --bind 0.0.0.0 --port 8101`. `/` is a preview;
`/something/` mimics Pages. Probes use `http://localhost:8101/something/`: hostname
localhost is required for the app's HTTP SW registration guard (not 127.0.0.1).

8.1 full run: **11/12 recreated suites pass, 0 browser console errors or uncaught
exceptions**. These are not the old handoff's original 12 checks. All 14 inline
scripts and the SW pass Node syntax checks. The full suite pins 8.1's new MD5,
size, footer and v22 cache, and confirms real SW offline reload/study persistence
plus eviction of an old v21 cache at the /something/ subpath.

### Known unrelated Activity routing failure retained

The rapid-navigation suite remains failing and intentionally exits nonzero:
8.1 run **14/16** tab transitions passed; both Activity heading checks observed
Leaderboard. Profile passed. The earlier 8.0 run passed 15/16. Timing affects
which entry fails; no router code was changed for this Notes fix.

The earlier A/B probe confirmed immediate Leaderboard → Activity can remain on
Leaderboard after ~4.5 s. Waiting 2,200 ms first, or going Home → Activity directly,
rendered Activity and its feed. Mechanism: `pageGuard()` adopts a temporary League
heading borrowed by `renderSocialPage()` while an engine click is <2,000 ms old,
changes `S.tab` to league, and the async Activity poll no longer restores it.
Do not mask it with a sleep or call the full suite clean. It is out of this fix's
scope unless the user requests it.

### Other evidence / parked risks

- All 17 subjects / 187 titles / 748 checkboxes rendered. Scoped progress,
  persistence, Back, honest zero publishing, messages, notes and Focus pass.
- Mock tick/untick XP 0 → 10 → 0; ghost log tick alone gives zero weekly score.
- DM rail: Class 12 — League, Priya, Kabir, Madhaw; fresh Madhaw UID retained,
  no nameless/anonymous rows. Same-name merging can still collapse real classmates.
- Real production OAuth, authorized domains, Firestore rules and two-person sync
  are unverified. Do not call mock tests a production regression.
- Dark phone chapter view width 390 px with no document overflow is a smoke check,
  not a full phone/dark visual review.
- Weekly bye auto-win, live-status expiry and avatar/XP cosmetics remain parked.

## Deployment / delivery status

8.0 source reached main via PR #1; blocker documentation via PR #2. Current branch
starts from main merge `b9a032bb188fbcba204312fda7b3c3cc61f192e7`.
8.1 is a new branch change; do not claim it is already merged or live.

Previous `POST repos/Goutamx/something/pages` enablement returned **HTTP 403,
Resource not accessible by integration**. Contents/PR access worked. Repository
metadata checked again this turn still reports `has_pages:false`. No unchanged
POST was retried. Pages permission or settings must change before publishing.
No manual file upload, password or token is needed from the user.

Target remains Pages from main / repository root, via PR from the current Arena
branch. Git for commits and pushes (current branch only), gh for PR/Pages. Do not
confuse push/merge with deployment success. Verify Pages build status separately.
The public github.io host is outside the allowed outbound list, so never claim a
public Playwright check from this workspace.

Future app releases bump together: HTML data-sl-build, Settings slBuildLine
build/cache text, and const CACHE in root sw.js. 8.1 advances 8.0/v21 to 8.1/v22.
After a real publication, the expected footer is App build 8.1; use Reload newest
if an old offline shell persists, without clearing local study data.

## Code gotchas

- Hidden engine .subject nodes are not visible UI; measure rect width/height >4.
- The duplicate .v2-profile-head is intentionally not appended. Assert the visible
  #socialProfileCard and stats instead.
- Saved-view restoration happens 250 ms after the initial Home paint; wait for it.
- Paused Focus button says Start, except distracted pause says Resume.
- Append-only studyEvents must be gated on saved ticks; honest zeros need
  slDidUntick in both the stale guard AND payload hash.
- Use collection.doc(d.id).delete() in user console snippets rather than assuming
  the old mock's doc.ref existed (the new mock does model ref).
- Capture Playwright console events or return evaluation results explicitly.
