(() => {
  "use strict";
  // Count one path per *novel*, not per chapter. GoatCounter deduplicates
  // repeat views of that path within its session window.
  const code = window.NOVELHUB_ANALYTICS?.goatcounterCode;
  if (typeof code !== "string" || !/^[a-z0-9-]{2,50}$/.test(code)) return;
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  if (!id) return;
  const book = (Array.isArray(window.NOVELHUB_BOOKS) ? window.NOVELHUB_BOOKS : [])
    .find(item => item.id === id && Array.isArray(item.chapters) && item.chapters.length);
  if (!book || !/^[a-z0-9-]{1,80}$/.test(book.id)) return;
  // Visiting a novel details page is not evidence that the person read it.
  if (!location.pathname.endsWith("/reader.html")) return;

  const loader = document.createElement("script");
  loader.async = true;
  loader.src = "https://gc.zgo.at/count.js";
  loader.setAttribute("data-goatcounter", "https://" + code + ".goatcounter.com/count");
  loader.setAttribute("data-goatcounter-settings", JSON.stringify({
    path: "/novel/" + book.id,
    title: book.title
  }));
  document.head.append(loader);
})();
