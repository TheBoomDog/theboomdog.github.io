(() => {
  "use strict";
  // Minimal anonymous counting. Do not load GoatCounter's normal count.js,
  // collect per-chapter URLs, send a title, referrer, screen size or campaigns.
  // The requested URL carries exactly one piece of site-specific information:
  // the novel identifier (e.g. /novel/malfoid).
  const code = window.NOVELHUB_ANALYTICS?.goatcounterCode;
  if (typeof code !== "string" || !/^[a-z0-9-]{2,50}$/.test(code)) return;
  if (!location.pathname.endsWith("/reader.html")) return;

  // The user's preference is checked before any GoatCounter image is created.
  // Fail closed if storage cannot be read (e.g., strict browser privacy mode).
  try {
    if (localStorage.getItem("novelhub:analytics-opt-out:v1") === "1") return;
  } catch (_) {
    return;
  }

  const id = new URLSearchParams(location.search).get("id");
  const book = (Array.isArray(window.NOVELHUB_BOOKS) ? window.NOVELHUB_BOOKS : [])
    .find(item => item.id === id && Array.isArray(item.chapters) && item.chapters.length);
  if (!book || !/^[a-z0-9-]{1,80}$/.test(book.id)) return;

  // GoatCounter's official /count pixel accepts p=path and retains
  // the same session-based deduplication as its regular JS integration.
  const pixel = document.createElement("img");
  pixel.alt = "";
  pixel.width = 1;
  pixel.height = 1;
  pixel.setAttribute("aria-hidden", "true");
  pixel.setAttribute("data-novel-reader-count", "");
  pixel.referrerPolicy = "no-referrer";
  pixel.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px;pointer-events:none;";
  pixel.src = "https://" + code + ".goatcounter.com/count?p=" +
    encodeURIComponent("/novel/" + book.id);
  document.body.append(pixel);
})();
