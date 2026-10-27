# Reader tracking and weekly top-ten rankings

NovelHub is a static GitHub Pages website. GitHub cannot count actual readers
per novel without an analytics provider, and rankings remain **unassigned** until authenticated visitor statistics
have been retrieved. Tracking is active for GoatCounter site `theboomdog`.

## Metric

- **Sitewide visits:** opening any NovelHub HTML page (including Privacy &
  Source) sends the same canonical GoatCounter path, `/site/visit`. With
  Sessions enabled, repeat visits to that path within a session are counted
  once. This is the separate site traffic estimate, not a count of unique people.
- **Novel readership:** once a chapter has loaded successfully and its nonempty
  text has rendered, the reader sends one path per novel: `/novel/<novel-id>`.
  A novel information page, invalid chapter or failed load does **not** count
  as a novel-reading visit.
- The sitewide and novel counts **overlap**. Do not sum rows in GoatCounter to
  calculate website visitors; use the `/site/visit` row for site traffic.
  Neither path contains a chapter identifier or individual page URL.
- GoatCounter deduplicates repeat visits to a given path during a session
  (typically up to eight hours). Visits are estimates, not distinct readers.
  Browser privacy tools may block counts.
- The public ranking uses novel paths only, from the last **completed** Monday
  at 1:00 AM through the following Monday at 1:00 AM in
  `America/Chicago`. GitHub Actions schedules are timezone aware, including
  daylight saving time; scheduled jobs may run later than expected.
- Sort by recorded novel visits; ties are ordered by novel ID. Only positions
  1–10 with observed visits get numbered covers; missing ranks remain empty.
  No fabricated view totals or chapter-count-based ranks are used.
- `data/rankings.js` stores only the weekly positions, not visit totals.
  Manually running the ranking workflow also uses the most recently completed
  Monday-to-Monday interval.

## One-time analytics setup

The public tracking code for `https://theboomdog.goatcounter.com/count` is
already connected via `data/analytics-config.js` and `js/analytics.js`.

### Minimal-data collection

NovelHub deliberately **does not load** GoatCounter's full `count.js`
script. Instead, it requests GoatCounter's official 1×1 image using only
the `p` parameter:

- Every site page: `https://theboomdog.goatcounter.com/count?p=/site/visit`
- After a successfully loaded chapter: `https://theboomdog.goatcounter.com/count?p=/novel/<novel-id>`

The application sends only one of these canonical paths, never the actual
page URL, chapter number/title, search text, browsing history, reading
position, referrer, screen dimensions, language, or campaign fields.
The image uses `referrerPolicy="no-referrer"` to prevent the HTTP
Referer header. Normal HTTPS connection metadata (IP address and User-Agent)
still reaches GoatCounter; it says those full values are not persisted in
its database or on disk.

**Keep optional GoatCounter data collection categories disabled**, especially
referrers, browsers, systems, locations, languages, screen dimensions, and
individual pageviews. Keep **Sessions enabled** if you want repeat visits within
the same approximately eight-hour session to count only once per novel.
Sessions necessarily uses IP and User-Agent transiently in GoatCounter's
server memory to recognize repeat visits; disabling Sessions would count
every page load, which produces less meaningful readership counts.

Because the image pixel does not send additional analytics data, it has more
limited bot filtering than GoatCounter's normal JavaScript script and can
include some automated visits. Browser extensions may also block it.
The rankings are estimates of visits, not verified distinct people.

To publish **weekly rankings**, one private credential remains necessary:

1. In GoatCounter (`https://theboomdog.goatcounter.com/`), create an
   API token with read access to statistics.
2. In the **NovelHub public website repository**, go to Settings → Secrets
   and variables → Actions → Secrets → New repository secret.
   Name it `GOATCOUNTER_API_TOKEN` and paste the private token.
   Never put this token in Git, web-page JavaScript, or the chat.
3. Open GitHub Actions → **Update weekly reader rankings** → Run workflow
   on `main`. It reads the latest completed week and publishes a real
   snapshot if there were recorded visits. Monday at 1:00 a.m. Central
   is already scheduled automatically.

If you ever change the GoatCounter account, update the public
`goatcounterCode` value in `data/analytics-config.js`, and set
`GOATCOUNTER_CODE` in the repository Actions **Variables** to the new
subdomain code. The default remains `theboomdog`.

GitHub Actions workflow: `.github/workflows/weekly-reader-rankings.yml`.

## Per-browser opt-out

The public **Privacy & Source** page at `privacy.html` has an optional
**Opt out of anonymous visit counting** checkbox. Its state is saved only
in the current browser under `novelhub:analytics-opt-out:v1`, with value
`1` for opted out. `js/analytics.js` checks this value synchronously
before creating **either** GoatCounter request. If browser storage is blocked
and the preference cannot be read, analytics **fails closed** (no request).
The privacy page also participates in sitewide counting when not opted out.

The switch affects future sitewide page visits and reader-page openings, on this device.
Turning it off resumes counting. It does not delete counts already
received by GoatCounter, disable ordinary requests to GitHub Pages,
or synchronize the preference to another browser or device.

## Security and privacy

The analytics API token remains only in an encrypted Actions secret.
Raw visit totals remain in the private GoatCounter dashboard and are not
published in NovelHub's data files or public pages. Only rank positions
for the top ten novels appear in data/rankings.js.

GoatCounter counts first visits to each canonical path per approximately eight-hour
session. The separate `/site/visit` path measures site traffic; the `/novel/*`
paths measure readership without recording per-chapter activity. The weekly
rankings only include novel paths.

GoatCounter can be blocked by browser tracking protection or ad blockers;
counts are estimates, not exact unique-reader statistics.

To disable new tracking, remove the public `goatcounterCode` from
`data/analytics-config.js`, then remove the repository variable
`GOATCOUNTER_CODE`. The next workflow run will not reactivate tracking without
the variable. To stop the workflow, disable it in GitHub Actions.
