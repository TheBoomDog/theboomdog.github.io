(() => {
  "use strict";
  const base = window.NOVELHUB_SITE?.reportIssuesUrl;
  if (typeof base !== "string" || !/^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/new\/?$/.test(base)) return;
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const book = (Array.isArray(window.NOVELHUB_BOOKS) ? window.NOVELHUB_BOOKS : [])
    .find(item => item && item.id === id);
  const chapterKey = params.get("chapter");
  const chapter = book?.chapters?.find((item, index) =>
    item?.key === chapterKey || String(index + 1) === chapterKey);
  const isReader = /\/reader\.html$/.test(location.pathname);
  const title = isReader && book
    ? "Reader issue: " + book.title + (chapter ? " — " + (chapter.title || chapter.label || "Chapter") : "")
    : "Website issue: NovelHub";
  // Only include the page URL and known book/chapter context. No saved
  // progress, preferences, analytics or other local data leave the browser.
  const body = [
    "### What went wrong?",
    "",
    "(Describe the problem here.)",
    "",
    "### Where did it happen?",
    "",
    "Page: " + location.origin + location.pathname + location.search,
    ...(book ? ["Novel: " + book.title] : []),
    ...(chapter ? ["Chapter: " + (chapter.title || chapter.label || chapterKey)] : []),
    "",
    "### Expected behavior",
    "",
    "(What should have happened?)"
  ].join("\n");
  const href = base + "?title=" + encodeURIComponent(title) +
    "&body=" + encodeURIComponent(body);
  document.querySelectorAll("[data-report-problem]").forEach(node => {
    node.href = href;
    node.target = "_blank";
    node.rel = "noopener noreferrer";
    node.title = "Report a problem on GitHub (sign-in required)";
  });
})();
