# Reader tracking and weekly top-ten rankings

NovelHub is a static GitHub Pages website. GitHub cannot count actual readers
per novel without an analytics provider, so rankings are **not activated**
until GoatCounter is connected.

## Metric

- Each visit to `book.html?id=novel-id` or
  `reader.html?id=novel-id&chapter=...` is recorded under the SAME canonical
  path `/novel/novel-id`.
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

## One-time setup

1. Create a free GoatCounter account at https://www.goatcounter.com/ and create
   a site to track `theboomdog.github.io`.
2. In the **NovelHub website repository**, open Settings → Secrets and
   variables → Actions → **Variables** → New repository variable. Set name
   `GOATCOUNTER_CODE` to just your chosen GoatCounter subdomain code, e.g.
   `myreadingstats` for `https://myreadingstats.goatcounter.com`.
   This is publicly visible configuration, not a password.
3. In your GoatCounter account, use the user menu → **API** to create an API
   key with permission to read that site's statistics. On the **NovelHub website
   repository**, open Settings → Secrets and variables → Actions → **Secrets** →
   New repository secret. Name it `GOATCOUNTER_API_TOKEN` and paste the token.
   Do not commit, paste, or share the key with readers.
4. Open NovelHub → Actions → **Update weekly reader rankings** → **Run
   workflow** (branch `main`). This generates the public tracking configuration
   and reads the most recent complete week, which will initially have no visits.
5. Once the workflow and GitHub Pages deployment complete, test reading a novel
   without an ad blocker and verify `/novel/malfoid` or `/novel/mol` appears
   in the GoatCounter dashboard. Rank positions become populated when the
   first measured weekly snapshot contains reader visits.

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
