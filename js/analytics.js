(() => {
  "use strict";
  // Only canonical paths are sent: the whole site or one registered novel.
  // Never send chapter URLs, search text, page titles, referrals, screens, or campaigns.
  // GoatCounter's usual count.js is intentionally not loaded.
  const code = window.NOVELHUB_ANALYTICS?.goatcounterCode;
  if (typeof code !== "string" || !/^[a-z0-9-]{2,50}$/.test(code)) return;

  // Respect the existing browser-local opt-out before either counting request.
  // If browser storage is unavailable, fail closed.
  const optedOut = () => {
    try { return localStorage.getItem("novelhub:analytics-opt-out:v1") === "1"; }
    catch (_) { return true; }
  };
  if (optedOut()) return;

  const count = (path, marker) => {
    const pixel = document.createElement("img");
    pixel.alt = "";
    pixel.width = 1;
    pixel.height = 1;
    pixel.setAttribute("aria-hidden", "true");
    pixel.setAttribute(marker, "");
    pixel.referrerPolicy = "no-referrer";
    pixel.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px;pointer-events:none;";
    pixel.src = "https://" + code + ".goatcounter.com/count?p=" + encodeURIComponent(path);
    document.body.append(pixel);
  };

  // All site pages count toward one canonical website path. With GoatCounter
  // Sessions on, repeatedly visiting different pages in the same session
  // counts once for this path.
  count("/site/visit", "data-site-visit-count");

  // Reader traffic is separate, attributed to the novel only after the text
  // is loaded and rendered successfully. Book detail visits never count here.
  if (!location.pathname.endsWith("/reader.html")) return;
  let recordedNovel = false;
  document.addEventListener("novelhub:chapter-loaded", event => {
    if (recordedNovel || optedOut()) return;
    const id = event.detail?.novelId;
    if (typeof id !== "string" || !/^[a-z0-9-]{1,80}$/.test(id)) return;
    if (id !== new URLSearchParams(location.search).get("id")) return;
    const published = (Array.isArray(window.NOVELHUB_BOOKS) ? window.NOVELHUB_BOOKS : [])
      .some(book => book?.id === id && Array.isArray(book.chapters) && book.chapters.length);
    if (!published) return;
    recordedNovel = true;
    count("/novel/" + id, "data-novel-reader-count");
  });
})();
