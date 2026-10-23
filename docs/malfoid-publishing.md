# Malfoid → NovelHub publishing

The source manuscript stays in the private `TheBoomDog/Malfoid` repository.
The public website imports only selected manuscript chapters, not the source
repository's PDFs, outlines, research notes, or version history.

## Automatic updates

The GitHub Actions workflow at `.github/workflows/publish-malfoid.yml` checks
the private repository at 17 and 47 minutes past each hour (UTC). GitHub can
delay scheduled workflow runs during busy periods.

It can also be run any time using **Actions → Publish Malfoid chapters →
Run workflow**. When chapter files change, the workflow commits the updated
public chapter files and catalog; GitHub Pages publishes them.

The read-only access token is stored in this public repository's encrypted
Actions secret `MALFOID_READ_TOKEN`. Never put the token into repository code
or documentation. Renew that secret before the token expires.

## Approving Books 5–7

By default, only Books 1–4 are published.

When later books are ready for public release, go to this website
repository's **Settings → Secrets and variables → Actions → Variables**
and set the repository variable:

- **Name:** `MALFOID_APPROVED_BOOKS`
- **Value:** `1 2 3 4 5` (then include 6 and 7 whenever approved)

For example, `1 2 3 4 5 6 7` enables all seven volumes. The importer already
understands their original chapter indexes and names. It skips Books 5–7
chapters still containing only empty navigation placeholders (less than 1,000
characters of body text); only substantial manuscripts are imported.

Keep unapproved volumes out of this variable. Merely writing more than
1,000 characters is not editorial approval to publish.

## Reader

The shared `reader.html` page uses entries in `data/malfoid.js`, generated
by `scripts/import_malfoid.py`. Each published chapter is sourced from
`Novels/Malfoid/book-N/*.md`, converted by GitHub Pages/Jekyll.

No changes to the Mother of Learning catalog or reader styling are required.
