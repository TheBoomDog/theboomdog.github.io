# NovelHub: a data-driven catalog

**Never add a novel's title, slug, chapters, genres, rank or analytics ID to a
page template.** Every section (home, browse, search, book detail, chapter
reader, latest updates and weekly rankings) reads the **same catalog**.

## Adding a novel

1. Add the novel as an entry in `data/books.js`, or create a separate
   `data/<unique-slug>.js` for a generated or independently maintained book.
2. Commit the data file and the published chapter content to `main`.

That's all. The `Rebuild shared novel catalog` GitHub Actions workflow discovers
all new `data/*.js` novel sources, combines them into `data/catalog.js`, and
commits the bundle. Every page loads **only** `data/catalog.js` for novel
metadata; no HTML, browser scripts or ranking code must be edited.

Reserved `data/` filenames: `books.js` (base catalog),
`catalog.js` (generated result), `rankings.js` (weekly aggregated reader
visits), and `analytics-config.js` (public tracking configuration).
All other `data/*.js` files are registered novel sources, sorted by filename.
For a generated novel file, follow this overlay format:

```js
(() => {
  const novel = {
    id: "my-new-novel",
    title: "My New Novel",
    author: "Author",
    status: "In progress",
    genres: ["Fantasy", "Magic"],
    description: "A short description.",
    cover: { start: "#455744", end: "#15241f", ink: "#e5cc9f" },
    chapters: [{
      key: "first-chapter",
      label: "Chapter 1",
      title: "The Beginning",
      source: "Novels/My_New_Novel/chapter_1.html",
      href: "reader.html?id=my-new-novel&chapter=first-chapter",
      updatedAt: "2026-10-24T10:45:00Z"
    }]
  };
  const books = window.NOVELHUB_BOOKS;
  const i = books.findIndex(book => book.id === novel.id);
  if (i < 0) books.push(novel);
  else books[i] = novel;
})();
```

The `id` is the unique public book key used by the reader, ranking system and
GoatCounter anonymous visit counter. It's generated from **whatever novel
records currently exist**, not from an allowlist of known titles. Use lowercase
ASCII letters, digits and hyphens in the ID for analytics compatibility.
A chapter source must be public on GitHub Pages. `format: "jekyll"` can read
rendered Markdown documents; otherwise provide a `.chapter-content` HTML
container. The `updatedAt` field is optional; never invent modification dates.

## How the system works

- `scripts/build_catalog.py`: finds all novel data scripts automatically and
  creates `data/catalog.js`. Run locally with
  `python3 scripts/build_catalog.py`.
- `.github/workflows/rebuild-catalog.yml`: rebuilds automatically when data
  changes (or manually through GitHub Actions).
- `js/library.js`: derives cards, genres, search, sorts, update feeds and
  links from the shared catalog.
- `js/book.js` and `js/reader.js`: use any `id` and chapter `href` from
  the same data, preserving progress through stable chapter keys.
- `js/analytics.js`: tracks any published book's chapter reader under
  `/novel/<id>`, with no individual-chapter analytics.
- `scripts/update_reader_rankings.py`: discovers all published book IDs by
  evaluating `data/catalog.js` and builds the Monday leaderboard for them.
  Only measured top-ten books display numbered cover marks.

## Existing Malfoid automation

The private-to-public Malfoid importer updates `data/malfoid.js`, then also
runs `scripts/build_catalog.py`. The published Malfoid chapter files are staged
along with the compiled catalog in the same commit. That importer is
Malfoid-specific by design; the rest of NovelHub isn't.

Additional novel importers may write their own `data/<slug>.js` alongside
published chapter files and invoke the same catalog builder.

The reader's saved-book and reading-progress storage keys remain unchanged.
