(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const books = (Array.isArray(window.NOVELHUB_BOOKS) ? window.NOVELHUB_BOOKS : [])
    .filter(book => book && typeof book.id === "string" && typeof book.title === "string");
  const page = document.body.dataset.page || "home";
  const rankingData = window.NOVELHUB_RANKINGS || {};
  const rankingsReady = rankingData.status === "ready" && Array.isArray(rankingData.entries);
  const rankById = new Map(rankingsReady
    ? rankingData.entries.filter(entry => entry && typeof entry.id === "string" &&
      Number.isInteger(entry.rank) && entry.rank >= 1 && entry.rank <= 10)
      .map(entry => [entry.id, entry]) : []);
  const savedKey = "novelhub:saved:v1";
  const progressKey = "novelhub:progress:v1";
  const fromStorage = (key, fallback) => {
    try { const v = JSON.parse(localStorage.getItem(key) || "null");
      return v && typeof v === "object" ? v : fallback;
    } catch (_) { return fallback; }
  };
  const saveStorage = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} };
  let saved = fromStorage(savedKey, []);
  if (!Array.isArray(saved)) saved = [];
  saved = saved.filter(v => typeof v === "string");
  const readProgress = () => {
    const p = fromStorage(progressKey, {});
    return Array.isArray(p) ? {} : p;
  };
  const chapterEntries = book => Array.isArray(book.chapters)
    ? book.chapters.filter(ch => ch && typeof ch.href === "string" && ch.href) : [];
  const bookURL = book => "book.html?id=" + encodeURIComponent(book.id);
  const isPublished = book => chapterEntries(book).length > 0;
  const statusOf = book => isPublished(book) ? (book.status || "Available") : "Unpublished";
  const totalChapters = books.reduce((n, b) => n + chapterEntries(b).length, 0);
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  };
  const a = (href, className, text) => {
    const node = el("a", className, text);
    node.href = href;
    return node;
  };
  const parseDate = value => {
    if (typeof value !== "string" || !value) return null;
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
  };
  const displayDate = value => {
    const ts = parseDate(value);
    return ts === null ? "" : new Date(ts).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  };
  const mostRecent = book => chapterEntries(book)
    .reduce((latest, ch) => Math.max(latest, parseDate(ch.updatedAt) || 0), 0);
  const allUpdates = books.flatMap(book => chapterEntries(book).map((chapter, index) => ({
    book, chapter, index, timestamp: parseDate(chapter.updatedAt)
  })));
  // Recorded Git dates take priority. When a legacy novel has no dates, show
  // its chapters after dated updates rather than inventing timestamps.
  const updates = allUpdates.sort((x, y) =>
    (y.timestamp || 0) - (x.timestamp || 0) ||
    (x.book.id === y.book.id ? y.index - x.index : x.book.title.localeCompare(y.book.title))
  );
  // Before an initial catalog sync, do not let the first undated book dominate
  // the homepage; distribute its last chapters fairly across different books.
  if (updates.length && !updates.some(item => item.timestamp)) {
    const buckets = books.map(book => updates.filter(item => item.book.id === book.id));
    const interleaved = [];
    for (let i = 0; buckets.some(bucket => bucket.length); i++) {
      for (const bucket of buckets) if (bucket.length) interleaved.push(bucket.shift());
    }
    updates.splice(0, updates.length, ...interleaved);
  }
  const genreOptions = [...new Set(books.flatMap(book => Array.isArray(book.genres) ? book.genres : []))].sort((a, b) => a.localeCompare(b));
  const chapterLabel = item => item.chapter.label || "Chapter " + (item.index + 1);

  const createCover = (book, i) => {
    const cover = a(bookURL(book), "book-cover cover-generated");
    cover.style.setProperty("--cover-start", book.cover?.start || "#455744");
    cover.style.setProperty("--cover-end", book.cover?.end || "#15241f");
    cover.style.setProperty("--cover-ink", book.cover?.ink || "#e5cc9f");
    cover.setAttribute("aria-label", "View " + book.title);
    cover.append(el("span", "cover-label", "NovelHub"), el("span", "cover-title", book.title));
    const rank = rankById.get(book.id)?.rank;
    // Cover numerals are earned through the weekly readership leaderboard.
    if (Number.isInteger(rank) && rank >= 1 && rank <= 10) {
      cover.append(el("span", "cover-mark", String(rank) + "."));
      cover.setAttribute("aria-label", "Rank " + rank + ": " + book.title);
    }
    if (book.cover?.image && !/^(?:[a-z][\w+.-]*:|\/)/i.test(book.cover.image)) {
      cover.style.backgroundImage = 'url("' + encodeURI(book.cover.image).replaceAll('"', "%22") + '")';
      cover.classList.add("cover-image");
    }
    return cover;
  };
  const createCard = (book, index) => {
    const card = el("article", "novel-card");
    card.dataset.id = book.id;
    card.dataset.title = book.title;
    card.append(createCover(book, index));
    const body = el("div", "card-body");
    const top = el("div", "card-top");
    const h3 = el("h3", "card-title");
    h3.append(a(bookURL(book), "", book.title));
    const star = el("button", "save-button", "☆");
    star.type = "button";
    star.title = "Save novel";
    const syncStar = () => {
      const active = saved.includes(book.id);
      star.textContent = active ? "★" : "☆";
      star.setAttribute("aria-pressed", String(active));
      star.setAttribute("aria-label", (active ? "Remove " : "Save ") + book.title);
      star.title = active ? "Remove saved novel" : "Save novel";
    };
    star.addEventListener("click", () => {
      saved = saved.includes(book.id) ? saved.filter(id => id !== book.id) : [...saved, book.id];
      saveStorage(savedKey, saved);
      syncStar();
      syncSavedCount();
      renderBooks();
    });
    syncStar();
    top.append(h3, star);
    const meta = el("div", "meta");
    meta.append(el("span", "status", statusOf(book)));
    const chapters = chapterEntries(book);
    meta.append(el("span", "", chapters.length + (chapters.length === 1 ? " chapter" : " chapters")));
    if (Array.isArray(book.volumes) && book.volumes.length > 1) {
      meta.append(el("span", "", book.volumes.length + " books"));
    }
    const tags = el("div", "tags");
    (book.genres || []).forEach(genre => {
      // Every novel tag is a shareable link to the already-filtered search page.
      tags.append(a("search.html?genre=" + encodeURIComponent(genre), "tag", genre));
    });
    const actions = el("div", "card-actions");
    if (chapters.length) {
      const progress = readProgress()[book.id];
      const resume = progress?.key ? chapters.find(ch => ch.key === progress.key)
        : (Number.isInteger(progress?.chapter) ? chapters[progress.chapter - 1] : null);
      if (resume) {
        actions.append(a(resume.href, "", "Continue reading ↗"));
      } else {
        actions.append(a(chapters[0].href, "", "Start reading ↗"));
      }
      actions.append(a(bookURL(book), "", "Chapters"));
    } else {
      actions.append(a(bookURL(book), "", "Details"));
      actions.append(el("span", "unavailable", "Not published"));
    }
    body.append(top, meta, tags);
    if (book.description) {
      const excerpt = el("p", "chapter-detail", book.description);
      excerpt.title = book.description;
      excerpt.style.display = "-webkit-box";
      excerpt.style.webkitLineClamp = "2";
      excerpt.style.webkitBoxOrient = "vertical";
      excerpt.style.overflow = "hidden";
      body.append(excerpt);
    }
    body.append(actions);
    card.append(body);
    return card;
  };
  const syncSavedCount = () => {
    if ($("saved-count")) $("saved-count").textContent = saved.length;
  };
  let savedOnly = false;
  const filters = () => ({
    query: ($("search")?.value || "").trim().toLocaleLowerCase(),
    genre: $("genre")?.value || "all",
    status: $("status")?.value || "all",
    sort: $("sort")?.value || "az"
  });
  const sortBooks = (arr, how) => {
    const copy = [...arr];
    if (how === "readers") {
      // Private analytics calculates the rankings; only the positions are public.
      copy.sort((x, y) => {
        const a = rankById.get(x.id)?.rank ?? Infinity;
        const b = rankById.get(y.id)?.rank ?? Infinity;
        return a - b || x.title.localeCompare(y.title);
      });
    } else if (how === "za") copy.sort((x, y) => y.title.localeCompare(x.title));
    else if (how === "chapters") copy.sort((x, y) => chapterEntries(y).length - chapterEntries(x).length || x.title.localeCompare(y.title));
    else if (how === "recent") copy.sort((x, y) => mostRecent(y) - mostRecent(x) || x.title.localeCompare(y.title));
    else copy.sort((x, y) => x.title.localeCompare(y.title));
    return copy;
  };
  const renderBooks = () => {
    if (!$("novel-list")) return;
    const { query, genre, status, sort } = filters();
    const matching = sortBooks(books.filter(book => {
      const searchable = [book.title, book.author || "", book.description || "", ...(book.genres || [])].join(" ").toLocaleLowerCase();
      return (!query || searchable.includes(query)) &&
        (genre === "all" || (book.genres || []).includes(genre)) &&
        (status === "all" || (status === "available" ? isPublished(book) : !isPublished(book))) &&
        (!savedOnly || saved.includes(book.id));
    }), sort);
    const container = $("novel-list");
    container.replaceChildren(...matching.map(book => createCard(book, books.indexOf(book))));
    $("empty").hidden = matching.length > 0;
    $("results").textContent = "Showing " + matching.length + " of " + books.length + " novels";
    syncSavedCount();
  };
  const buildUpdate = (entry, sidebar) => {
    const { book, chapter } = entry;
    const href = chapter.href;
    if (sidebar) {
      const node = a(href, "chapter-item");
      node.append(el("span", "chapter-book", book.title), el("span", "chapter-name", chapter.title || chapterLabel(entry)));
      node.append(el("span", "chapter-number", chapterLabel(entry)));
      if (entry.timestamp) node.append(el("span", "chapter-date", displayDate(chapter.updatedAt)));
      return node;
    }
    const node = a(href, "update-row");
    const labels = el("div", "update-details");
    labels.append(el("span", "update-book", book.title), el("span", "update-title", chapter.title || chapterLabel(entry)));
    labels.append(el("span", "update-label", chapterLabel(entry)));
    node.append(labels);
    if (entry.timestamp) { const when = el("time", "update-time", displayDate(chapter.updatedAt)); when.dateTime = chapter.updatedAt; node.append(when); }
    return node;
  };
  const renderRecent = () => {
    if (!$("latest-list")) return;
    $("latest-list").replaceChildren(...updates.slice(0, 10).map(entry => buildUpdate(entry, true)));
    if ($("latest-empty")) $("latest-empty").hidden = updates.length > 0;
  };
  const renderUpdatesPage = (() => {
    let shown = 30;
    return (action = "reset") => {
      if (!$("updates-list")) return;
      if (action === "reset") shown = 30;
      if (action === "more") shown += 30;
      const query = ($("update-search")?.value || "").trim().toLocaleLowerCase();
      const selected = $("update-book")?.value || "all";
      const found = updates.filter(item =>
        (selected === "all" || item.book.id === selected) &&
        (!query || [item.book.title, item.chapter.title, chapterLabel(item)].join(" ").toLocaleLowerCase().includes(query))
      );
      $("updates-list").replaceChildren(...found.slice(0, shown).map(entry => buildUpdate(entry, false)));
      $("update-results").textContent = "Showing " + Math.min(shown, found.length) + " of " + found.length + " chapters";
      $("update-empty").hidden = found.length > 0;
      $("more-updates").hidden = found.length <= shown;
    };
  })();

  if ($("novel-list")) {
    const search = $("search");
    const genre = $("genre");
    for (const value of genreOptions) {
      const opt = el("option", "", value);
      opt.value = value;
      genre.append(opt);
    }
    const url = new URL(location.href);
    if (url.searchParams.get("q")) search.value = url.searchParams.get("q");
    if (url.searchParams.get("genre") && genreOptions.includes(url.searchParams.get("genre"))) genre.value = url.searchParams.get("genre");
    if (url.searchParams.get("sort") && ["az","za","recent","chapters","readers"].includes(url.searchParams.get("sort"))) $("sort").value = url.searchParams.get("sort");
    if (page === "ranking" && !url.searchParams.has("sort")) $("sort").value = "readers";
    const reset = () => {
      search.value = "";
      genre.value = "all";
      $("status").value = "all";
      $("sort").value = page === "ranking" ? "readers" : "az";
      savedOnly = false;
      $("saved-only").setAttribute("aria-pressed", "false");
      renderBooks();
    };
    [$("search"), genre, $("status"), $("sort")].forEach(input => {
      input.addEventListener(input === search ? "input" : "change", renderBooks);
    });
    $("saved-only").addEventListener("click", () => {
      savedOnly = !savedOnly;
      $("saved-only").setAttribute("aria-pressed", String(savedOnly));
      renderBooks();
    });
    $("reset").addEventListener("click", reset);
    $("empty-reset").addEventListener("click", reset);
    if ($("total-count")) $("total-count").textContent = books.length + (books.length === 1 ? " title" : " titles");
    renderBooks();
    if (page === "ranking" && $("ranking-summary")) {
      if (!rankingsReady) {
        $("ranking-summary").textContent = "Rankings are being prepared.";
      } else {
        const from = rankingData.periodStart ? new Date(rankingData.periodStart).toLocaleString(undefined, {dateStyle:"medium"}) : "";
        const until = rankingData.periodEnd ? new Date(rankingData.periodEnd).toLocaleString(undefined, {dateStyle:"medium"}) : "";
        $("ranking-summary").textContent = "Weekly rankings · " + from + " – " + until +
          " · updated Mondays at 1:00 a.m. Central";
      }
    }
    if (page === "search") $("search").focus();
  }
  if ($("latest-list")) renderRecent();
  if ($("updates-list")) {
    const selector = $("update-book");
    for (const book of books) {
      const opt = el("option", "", book.title);
      opt.value = book.id;
      selector.append(opt);
    }
    $("update-search").addEventListener("input", () => renderUpdatesPage("reset"));
    selector.addEventListener("change", () => renderUpdatesPage("reset"));
    $("more-updates").addEventListener("click", () => renderUpdatesPage("more"));
    renderUpdatesPage("reset");
  }
  if ($("catalog-total")) $("catalog-total").textContent = books.length + " novels · " + totalChapters + " chapters";
})();