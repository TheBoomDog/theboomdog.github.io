(() => {
  "use strict";
  // Navigation grows with the data-driven catalog. With only a handful of
  // novels, Browse duplicates the homepage; reveal it automatically when
  // there are more than ten published catalog entries.
  const books = Array.isArray(window.NOVELHUB_BOOKS) ? window.NOVELHUB_BOOKS : [];
  const ids = new Set(books.filter(book => book && typeof book.id === "string")
    .map(book => book.id));
  const showBrowse = ids.size > 10;
  document.querySelectorAll("[data-browse-link]").forEach(link => {
    link.hidden = !showBrowse;
  });
})();
