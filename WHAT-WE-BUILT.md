# StudyLeague — build 8.0

Updated 2026-11-09. This checkout's authoritative app is root `index.html`.
It is patched/deployed directly: **no build step**.

## Release identity

| Field | Value |
|---|---|
| HTML size | 655,659 bytes |
| HTML MD5 | `58be2789e38ec23e1c173e7259612955` |
| `data-sl-build` | `8.0` |
| Settings build label | App build **8.0** · offline cache **studyleague-v21** |
| Service worker | `sw.js`, cache `studyleague-v21` |
| App files | `index.html`, `sw.js`, `manifest.webmanifest`, three PNGs, `.nojekyll` |
| Deployment method | GitHub Pages target: `main`, repository root; changes delivered by PR from the Arena working branch |
| Publication status | **Blocked, not live**: enabling Pages returned HTTP 403, `Resource not accessible by integration` |
| Uploaded source | [PR #1](https://github.com/Goutamx/something/pull/1), merged 2026-11-09; main merge `f53f4e4d55b15155d3b4290dd85ded46f8f04606` |

After merging, the GitHub Contents API independently confirmed main's HTML is
655,659 bytes with the exact MD5 above. The Pages create request (`POST
repos/Goutamx/something/pages`, branch main, path /) was rejected by the current
integration. No successful Pages build or public site is claimed. GitHub needs
Pages-administration permission, or the owner must enable Settings → Pages →
Deploy from a branch → main → / (root) once. **No file upload is needed.**

The HTML, service worker, and three icons are byte-for-byte copies of the user's
attachments. The repository's existing manifest name was corrected from Class 11
to **Class 12** and `.nojekyll` was added. No application bug was silently patched
or version number relabelled. A push/merge is not proof of a successful Pages
publish: check the repository's Pages build status.

## What is included

| Feature | How to check | Current evidence |
|---|---|---|
| CBSE Class 12 syllabus | Register all subjects, open Subjects and each section | 17 subjects; 22 sections; all 187 chapter titles rendered; 748 activity checkboxes |
| Registration-scoped progress | Register English + History | Home and Subjects each show exactly those 2; 31 chapters / 124 tasks |
| Chapter checklists and XP | Complete one registered chapter | 4 completed tasks, 3% overall, 60 XP; ticks survive reload; unregistered Physics ticks do not count |
| Subject Back button | Open Flamingo → Back to Subjects | 1 Back button in chapter view, 0 in subject list; returns to the 2 registered subjects |
| Honest zeros | Tick then untick a task | Mock-published XP 0 → 10 → 0; weekly score 0 → 10 → 0; a stale event alone scores 0 |
| Messages member filter | Seed duplicate Madhaw and nameless/anonymous members | Rail: Class 12 — League, Priya, Kabir, Madhaw; 3 direct rows; freshest Madhaw UID retained |
| Group / private messages | Send one of each | Correct mock Firestore paths, rendered messages and 1 DM notification |
| Shared notes | Publish a note and vote | Both mock writes verified; author monogram P measures 18×18 px, font 11 px |
| Focus timer | Start, pause, reset | Controls and timer state verified; reset returns to 25:00 |
| Profile | Open top-right avatar | Visible profile editor and stats verified |
| Offline PWA | Load once, disable network, reload | HTTP 200 from the real service worker, build 8.0, saved tick preserved; v19 cache removed on v21 activation |
| Dark phone smoke check | 390×844, theme dark | Document and main width 390 px, no horizontal document overflow in the tested chapter view; Back works |

## Verification — not a clean regression

The old chat's test rig did not exist here. New Playwright probes were recreated
under `tools/`; they are **not the handoff's original 12 checks**.

**11 of 12 recreated suites pass, with 0 browser console errors or uncaught
exceptions.** Inline JavaScript syntax passes for all 14 inline script blocks,
and `sw.js` passes `node --check`.

The navigation suite fails one rapid transition: **15 of 16 tab transitions
succeed**, but a fresh quick Leaderboard → Activity switch remains on Leaderboard.
The Profile editor itself passes. The failing probe is retained, not hidden by a
sleep. `npm test --prefix tools` therefore correctly exits nonzero on this build.

A separate A/B browser probe confirmed:

- Immediate Leaderboard → Activity: still Leaderboard after about 4.5 seconds.
- Wait 2,200 ms on Leaderboard first: Activity and its feed render.
- Home → Activity directly: Activity and its feed render.

Cause read from the code: `pageGuard()` adopts the temporary League heading while
`S.engineNavAt` is less than 2,000 ms old. That changes `S.tab` to `league`, so the
Activity poll no longer restores the requested page. This existing defect was not
changed because the requested deployment is the exact build 8.0 artifact.

Firebase tests use an in-memory mock. **Real Google sign-in, authorized domains,
Firestore security rules, production two-person sync, and the public Pages HTTP
endpoint are not browser-verified in this restricted-network workspace.** The
phone measurements are a smoke check, not a full visual review.

## History supplied by the handoff

| Build | Change |
|---|---|
| 7.11 | Monogram avatars |
| 7.12 | Earlier nav highlight corrections |
| 7.13 | Gate ghost ticks on saved progress; permit deliberate zero publishing |
| 7.14 | Registration-filtered Home subjects; Notes avatar sizing |
| 8.0 | Full 17-subject syllabus; scoped progress; chapter Back button; duplicate/nameless Messages rows filtered |
| 8.0 deployment import | Exact uploaded HTML/SW/icons imported into this repository; Class 12 manifest, `.nojekyll`, persistent test source and handoff added |
