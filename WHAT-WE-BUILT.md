# StudyLeague — build 8.1

Updated 2026-11-09. Root `index.html` is the authoritative built app.
It is patched directly: **no build step**.

## Current release identity

| Field | Value |
|---|---|
| HTML size | 656,646 bytes |
| HTML MD5 | `cc8bf59054bf6d1b4d0e48fbda08033a` |
| `data-sl-build` | `8.1` |
| Settings build label | App build **8.1** · offline cache **studyleague-v22** |
| Service worker | `sw.js`, cache `studyleague-v22` |
| App files | `index.html`, `sw.js`, `manifest.webmanifest`, three PNGs, `.nojekyll` |
| Working branch | `arena/4fa95bc6-something` |
| Delivery | 8.1 fix prepared on the working branch; not claimed merged or publicly deployed |
| Pages state checked this turn | Repository still reports `has_pages: false` |

## 8.1 — Notes avatar alignment

The screenshot bug was reproduced in the 8.0 HTML using a dark-theme Playwright
DOM probe at 1366×687, with the reported Goutam author/comment layout:

| Location | 8.0 avatar centre relative to author text centre | 8.1 |
|---|---:|---:|
| Browse Notes card | 5.797 px below | 0.875 px below |
| Note modal byline | 5.797 px below | 0.875 px below |
| Comment author | 2.500 px above | 0.266 px below (0.273 px with the tested wrapped name) |

The actual avatar/name **layout-box centres** now differ by at most **0.008 px**.
Text Range bounds retain subpixel font-metric differences; the largest measured
text-centre difference is **0.875 px**, not a claimed exact zero.

### What changed

- A Notes-local `noteAuthor()` helper gives cards, modal bylines and comment
  headers the same `inline-flex; align-items:center` avatar/name pair.
- Removed the chip's baseline offset/margin only inside that pair. Other chat,
  leaderboard and profile avatars retain their existing CSS and colours.
- Comments group the avatar with the author name, not the full multi-line comment.
  Comment text is indented beneath the name; the Delete control remains available.
- Note context and modal byline are separate rows; long names/context wrap within
  the available space. Avatar size remains 18×18 px with an 11 px monogram.
- HTML build marker, visible Settings label and service-worker cache bumped
  together to **8.1 / v22**. No Firestore paths, schema or study-data migration.

### Verified fix

`npm run test:notes --prefix tools` passes **24 alignment checks across 8 variants**:
dark/light × 1366×687/390×844 × short/long author names. Long cases also have
multi-line comments. The probe checks box/text/glyph centres, containment and
spacing, comment indentation, own-comment Delete, vote updates, comment deletion
and posting. **0 browser console errors or uncaught exceptions.**

The probe loads the exact 8.0 baseline from commit
`b9a032bb188fbcba204312fda7b3c3cc61f192e7`, asserts its original MD5, reproduces the
bad offsets, then tests the current app. Firebase is mocked and external fonts
are isolated, so pixel measurements describe the local browser's fallback fonts,
not a visual inspection of the supplied PNGs or production Google/Firebase.

## Full regression — known unrelated failure retained

Current 8.1 run: **11/12 suites pass; 0 browser errors**. All 14 inline script
blocks and `sw.js` pass Node syntax checks.

The unrelated Activity navigation suite remains failing: this run passed 14/16
rapid tab transitions, with both Activity entries observing the temporary
Leaderboard heading; Profile passed. The earlier 8.0 run passed 15/16. The routing
code was not changed in 8.1, and no clean-regression claim is made or timing delay
added to hide this existing race. See `HANDOFF.md` and `tools/README.md`.

| Feature | Current evidence |
|---|---|
| CBSE Class 12 syllabus | 17 subjects; 22 sections; all 187 chapter titles rendered; 748 checkboxes |
| Registration-scoped progress | English + History only on Home/Subjects; 31 chapters / 124 tasks |
| Checklist / XP / persistence | One full registered chapter: 4 tasks, 3% overall, 60 XP; ticks survive reload; unregistered Physics excluded |
| Back button | Returns from chapter view to the 2 registered subjects; saved view survives reload |
| Honest zeros | Mock XP 0 → 10 → 0 and weekly score 0 → 10 → 0; stale event alone scores 0 |
| DM list | Class 12 — League, Priya, Kabir, Madhaw; 3 direct rows, no nameless/anonymous rows; fresh UID retained |
| Messages | Mock group/DM paths, rendered messages and one DM notification pass |
| Shared Notes | Publish/vote pass; new card/modal/comment alignment probe passes |
| Focus / Profile | Start, pause and 25:00 reset pass; real visible Profile editor/stats render |
| PWA | Real SW offline reload at `/something/` gives HTTP 200/build 8.1 with saved tick; v22 removes a seeded v21 cache |
| Dark phone chapter smoke check | Document/main width 390 px, no document overflow; Back works |

Real Google sign-in, authorized domains, Firestore security rules, production
two-person sync and the public Pages endpoint remain unverified from this
restricted-network workspace. Phone checks are measured smoke checks, not a full
visual review.

## Deployment history / limitation

Build 8.0 was uploaded to `main` through
[PR #1](https://github.com/Goutamx/something/pull/1). Its 655,659-byte HTML and MD5
`58be2789e38ec23e1c173e7259612955` were verified using the GitHub Contents API.
The supplied SW/icons were copied unchanged; the stale Class 11 manifest name was
corrected to Class 12 and `.nojekyll` added.

Enabling Pages then failed with **HTTP 403: Resource not accessible by
integration**. The current turn's repository metadata still says `has_pages:false`.
No unchanged enable request was retried. Pages permission/settings must change
before public publishing can be claimed. No manual file upload is required.

## History

| Build | Change |
|---|---|
| 7.11 | Monogram avatars |
| 7.12 | Earlier nav highlight corrections |
| 7.13 | Ghost-tick gating and deliberate zero publishing |
| 7.14 | Registration-filtered Home and Notes avatar sizing |
| 8.0 | Full syllabus, scoped progress, Back button, duplicate/nameless DM filtering |
| 8.0 import | Exact uploaded artifact copied to this repository; manifest, `.nojekyll`, recreated probes and handoff |
| **8.1** | **Centre Notes avatars with author names in cards, modal and comments; cache v22; before/after Playwright probe** |
