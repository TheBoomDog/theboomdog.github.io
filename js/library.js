(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const books = (Array.isArray(window.NOVELHUB_BOOKS) ? window.NOVELHUB_BOOKS : [])
    .filter(book => book && typeof book.id === "string" && typeof book.title === "string");
  const page = document.body.dataset.page || "home";
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
  const updates = books.flatMap(book => chapterEntries(book).map((chapter, index) => ({
    book, chapter, index, timestamp: parseDate(chapter.updatedAt)
  }))).sort((x, y) =>
    (y.timestamp || 0) - (x.timestamp || 0) ||
    (x.book.id === y.book.id ? y.index - x.index : x.book.title.localeCompare(y.book.title))
  );
  const genreOptions = [...new Set(books.flatMap(book => Array.isArray(book.genres) ? book.genres : []))].sort((a, b) => a.localeCompare(b));
  const chapterLabel = item => item.chapter.label || "Chapter " + (item.index + 1);

  const createCover = (book, i) => {
    const cover = a(bookURL(book), "book-cover cover-generated");
    cover.style.setProperty("--cover-start", book.cover?.start || "#455744");
    cover.style.setProperty("--cover-end", book.cover?.end || "#15241f");
    cover.style.setProperty("--cover-ink", book.cover?.ink || "#e5cc9f");
    cover.setAttribute("aria-label", "View " + book.title);
    cover.append(el("span", "cover-label", "NovelHub"), el("span", "cover-title", book.title));
    const marks = ["I.","II.","III.","IV.","V.","VI.","VII.","VIII.","IX.","X."];
    cover.append(el("span", "cover-mark", marks[i] || String(i + 1) + "."));
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
      const tag = el("button", "tag", genre);
      tag.type = "button";
      tag.addEventListener("click", () => {
        const selector = $("genre");
        if (selector) { selector.value = genre; renderBooks(); }
      });
      tags.append(tag);
    });
    const actions = el("div", "card-actions");
    if (chapters.length) {
      const progress = readProgress()[book.id];
      if (progress && Number.isInteger(progress.chapter) && chapters[progress.chapter - 1]) {
        actions.append(a(chapters[progress.chapter - 1].href, "", "Continue reading ↗"));
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
    if (how === "za") copy.sort((x, y) => y.title.localeCompare(x.title));
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
    if (entry.timestamp) node.append(el("time", "update-time", displayDate(chapter.updatedAt)));
    return node;
  };
  const renderRecent = () => {
    if (!$("latest-list")) return;
    $("latest-list").replaceChildren(...updates.slice(0, 10).map(entry => buildUpdate(entry, true)));
    if ($("latest-empty")) $("latest-empty").hidden = updates.length > 0;
  };
  const renderUpdatesPage = (() => {
    let shown = 30;
    return (reset = false) => {
      if (!$("updates-list")) return;
      if (reset) shown = 30;
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
    if (url.searchParams.get("sort") && ["az","za","recent","chapters"].includes(url.searchParams.get("sort"))) $("sort").value = url.searchParams.get("sort");
    if (page === "ranking" && !url.searchParams.has("sort")) $("sort").value = "chapters";
    const reset = () => {
      search.value = "";
      genre.value = "all";
      $("status").value = "all";
      $("sort").value = page === "ranking" ? "chapters" : "az";
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
    $("update-search").addEventListener("input", () => renderUpdatesPage(true));
    selector.addEventListener("change", () => renderUpdatesPage(true));
    $("more-updates").addEventListener("click", () => renderUpdatesPage(false) || (() => {})());
    // Increment before rerendering, so each click reveals the next page.
    $("more-updates").replaceWith((() => {
      const button = el("button", "load-more", "Load more");
      button.id = "more-updates";
      button.type = "button";
      button.addEventListener("click", () => { /* Replaced with the pagination closure below. */ });
      return button;
    })());
    renderUpdatesPage(true);
  }
  if ($("catalog-total")) $("catalog-total").textContent = books.length + " novels · " + totalChapters + " chapters";
})();