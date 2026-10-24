(() => {
  "use strict";
  // All chapter history stays in this browser's localStorage; nothing is sent
  // to the site owner. A new device has no history, so chapters start "New".
  const SEEN_KEY = "novelhub:seen-chapters:v1";
  const PROGRESS_KEY = "novelhub:progress:v1";
  const RECENT_MS = 3 * 24 * 60 * 60 * 1000;
  const books = Array.isArray(window.NOVELHUB_BOOKS) ? window.NOVELHUB_BOOKS : [];
  const load = key => {
    try {
      const data = JSON.parse(localStorage.getItem(key) || "{}");
      return data && typeof data === "object" && !Array.isArray(data) ? data : {};
    } catch (_) { return {}; }
  };
  const seen = load(SEEN_KEY);
  const progress = load(PROGRESS_KEY);
  const keyOf = chapter => chapter && (chapter.key || chapter.href);
  const recent = updatedAt => {
    const timestamp = typeof updatedAt === "string" ? Date.parse(updatedAt) : NaN;
    const age = Date.now() - timestamp;
    return Number.isFinite(age) && age >= 0 && age <= RECENT_MS;
  };
  const find = (bookId, chapter) => {
    const book = books.find(item => item && item.id === bookId && Array.isArray(item.chapters));
    const key = keyOf(chapter);
    if (!book || typeof key !== "string" || !key) return null;
    const index = book.chapters.findIndex(item => keyOf(item) === key);
    return index >= 0 ? { book, key, index } : null;
  };
  const get = (bookId, chapter) => {
    const match = find(bookId, chapter);
    if (!match) return null;
    const { key, index } = match;
    const modified = typeof chapter.updatedAt === "string" ? chapter.updatedAt : "";
    const visited = seen[bookId];
    // An explicit successful chapter opening takes precedence over the
    // inferred reading position. Save the revision, not a visitor identifier.
    if (visited && Object.hasOwn(visited, key)) {
      const readVersion = visited[key];
      if (recent(modified) &&
          Date.parse(modified) > (Date.parse(readVersion) || 0)) return "updated";
      return null;
    }
    // Preserve existing reading history from before per-chapter bookmarks
    // existed. A reader at chapter N is presumed to have seen chapters 1..N.
    const prior = progress[bookId];
    if (prior && typeof prior === "object") {
      const at = prior.key
        ? match.book.chapters.findIndex(item => item?.key === prior.key)
        : (Number.isInteger(prior.chapter) ? prior.chapter - 1 : -1);
      if (at >= index && at >= 0) {
        if (recent(modified) && Number.isFinite(prior.updated) &&
            Date.parse(modified) > prior.updated) return "updated";
        return null;
      }
    }
    return "new";
  };
  const markSeen = (bookId, chapter) => {
    const match = find(bookId, chapter);
    if (!match) return;
    if (!seen[bookId] || typeof seen[bookId] !== "object" || Array.isArray(seen[bookId]))
      seen[bookId] = {};
    seen[bookId][match.key] =
      typeof chapter.updatedAt === "string" ? chapter.updatedAt : "";
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch (_) {}
  };
  window.NOVELHUB_CHAPTER_CHANGES = Object.freeze({ get, markSeen });
})();
