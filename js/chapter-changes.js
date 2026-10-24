(() => {
  "use strict";
  // Browser-local, per-novel chapter changes since the visitor's previous
  // session. No account, tracking pixel, request, or shared visit data.
  const key = "novelhub:known-chapters:v1";
  const sessionGap = 30 * 60 * 1000;
  const books = Array.isArray(window.NOVELHUB_BOOKS) ? window.NOVELHUB_BOOKS : [];
  const current = {};
  for (const book of books) {
    if (!book || typeof book.id !== "string" || !Array.isArray(book.chapters)) continue;
    const entries = {};
    for (const chapter of book.chapters) {
      if (!chapter || typeof chapter.href !== "string") continue;
      const chapterKey = chapter.key || chapter.href;
      if (typeof chapterKey !== "string" || !chapterKey) continue;
      entries[chapterKey] = typeof chapter.updatedAt === "string" ? chapter.updatedAt : "";
    }
    current[book.id] = entries;
  }
  const now = Date.now();
  let previous = null;
  try {
    previous = JSON.parse(localStorage.getItem(key) || "null");
    if (!previous || typeof previous !== "object" || Array.isArray(previous)) previous = null;
  } catch (_) { previous = null; }
  const isNewSession = !previous || !Number.isFinite(previous.lastSeen) ||
    now - previous.lastSeen > sessionGap || now < previous.lastSeen;
  let changes = {};
  if (!isNewSession && previous.changes && typeof previous.changes === "object") {
    changes = previous.changes;
  } else if (previous?.chapters && typeof previous.chapters === "object") {
    for (const [bookId, chapters] of Object.entries(current)) {
      const known = previous.chapters[bookId] || {};
      for (const [chapterId, modified] of Object.entries(chapters)) {
        if (!Object.hasOwn(known, chapterId)) {
          (changes[bookId] ||= {})[chapterId] = "new";
        } else if (modified && Date.parse(modified) > (Date.parse(known[chapterId]) || 0)) {
          (changes[bookId] ||= {})[chapterId] = "updated";
        }
      }
    }
  }
  const store = {
    chapters: isNewSession ? current : (previous?.chapters || current),
    changes, lastSeen: now
  };
  try { localStorage.setItem(key, JSON.stringify(store)); } catch (_) {}
  window.NOVELHUB_CHAPTER_CHANGES = Object.freeze({
    get(bookId, chapter) {
      const chapterKey = chapter?.key || chapter?.href;
      if (typeof chapterKey !== "string") return null;
      return changes[bookId]?.[chapterKey] || null;
    }
  });
})();
