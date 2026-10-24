const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const {JSDOM} = require("jsdom");

function visit(page, query) {
  const dom = new JSDOM(fs.readFileSync(page, "utf8"), {
    url: "https://theboomdog.github.io/" + page + (query || ""),
    runScripts: "outside-only"
  });
  const context = dom.getInternalVMContext();
  for (const path of ["data/books.js", "data/malfoid.js", "data/analytics-config.js", "js/analytics.js"]) {
    vm.runInContext(fs.readFileSync(path, "utf8"), context, {filename: path});
  }
  return {
    pixel: dom.window.document.querySelector('img[data-novel-reader-count]'),
    loadedScript: dom.window.document.querySelector('script[data-goatcounter]'),
  };
}

for (const [novel, chapter] of [["mol", "1"], ["malfoid", "b1-01-the-boy-who-lived"]]) {
  const {pixel, loadedScript} = visit("reader.html", "?id=" + novel + "&chapter=" + chapter);
  assert.ok(pixel, "Registered " + novel + " in reader");
  assert.equal(loadedScript, null, "External analytics JavaScript must not load");
  const url = new URL(pixel.src);
  assert.equal(url.origin, "https://theboomdog.goatcounter.com");
  assert.equal(url.pathname, "/count");
  assert.deepEqual([...url.searchParams.keys()], ["p"], "Send only the novel path");
  assert.equal(url.searchParams.get("p"), "/novel/" + novel);
  assert.equal(pixel.referrerPolicy, "no-referrer", "Do not send referrer headers");
  assert.equal(pixel.getAttribute("alt"), "", "Invisible analytics pixel is decorative");
}
assert.equal(visit("book.html", "?id=malfoid").pixel, null,
  "Book info pages do not count as readers");
assert.equal(visit("reader.html", "?id=unknown&chapter=1").pixel, null,
  "Unknown novels do not count");
console.log("Minimal novel-reader pixel tracking passes.");
