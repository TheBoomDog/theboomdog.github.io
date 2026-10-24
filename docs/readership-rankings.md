# Reader tracking and weekly top-ten rankings

NovelHub is a static GitHub Pages website. GitHub cannot count actual readers
per novel without an analytics provider, and rankings remain **unassigned** until authenticated visitor statistics
have been retrieved. Tracking is active for GoatCounter site `theboomdog`.

## Metric

- Visits to the actual **reader** page, `reader.html?id=novel-id&chapter=...`,
  are recorded under one canonical path per novel: `/novel/novel-id`.
  Opening a book’s detail page does not count as a reader visit.
- GoatCounter deduplicates repeat visits to the same path within a session.
  This is **reader visits**, not a census of distinct people: a person returning
  in a later session may count again, and blocked analytics may go uncounted.
- The public ranking uses data from the last **completed** Monday at 1:00 AM
  through the following Monday at 1:00 AM in `America/Chicago`. GitHub Actions
  schedules are timezone aware and move between CST and CDT automatically.
  Scheduled GitHub runs may be delayed.
- Sort by the number of recorded reader visits. Tied values are ordered by
  novel ID for reproducibility. Only novels in positions 1–10 with positive
  observed visits get numbered cover marks.
- Other novels receive no number. Until data exists, no novel gets a ranking
  number. No fabricated view totals or chapter-count-based ranks are used.
- The reader rankings snapshot is generated under `data/rankings.js` each week;
  manual runs publish the latest **completed** Monday-to-Monday week.

## One-time analytics setup

The public tracking code for `https://theboomdog.goatcounter.com/count` is
already connected via `data/analytics-config.js` and `js/analytics.js`.

### Minimal-data collection

NovelHub deliberately **does not load** GoatCounter's full `count.js` analytics
script. Instead, when a visitor opens a novel's chapter, the site's own tiny
script loads GoatCounter's official 1×1 tracking image using exactly one query
parameter:

`https://theboomdog.goatcounter.com/count?p=/novel/<novel-id>`

The only application-specific data sent is the novel ID. No chapter number,
chapter title, search query, referrer, screen dimensions, language, or campaign
parameters are sent. The image uses `referrerPolicy="no-referrer"` to suppress
the HTTP Referer header. The browser still makes an HTTPS request, which
necessarily exposes network metadata such as IP address and User-Agent to the
receiving server; GoatCounter states that it does not write these values to
its database or disk.

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

## Security and privacy

The analytics API token remains only in an encrypted Actions secret; only
weekly aggregate counts are committed to the public repository.

GoatCounter counts first visits to canonical paths per approximately eight-hour
session, rather than logging per-chapter reading events for rankings. This
avoids inflating popularity when a reader opens many chapters.

GoatCounter can be blocked by browser tracking protection or ad blockers;
counts are estimates, not exact unique-reader statistics.

To disable new tracking, remove the public `goatcounterCode` from
`data/analytics-config.js`, then remove the repository variable
`GOATCOUNTER_CODE`. The next workflow run will not reactivate tracking without
the variable. To stop the workflow, disable it in GitHub Actions.
