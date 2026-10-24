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
  return dom.window.document.querySelector('script[data-goatcounter]');
}

for (const [novel, chapter] of [["mol", "1"], ["malfoid", "b1-01-the-boy-who-lived"]]) {
  const node = visit("reader.html", "?id=" + novel + "&chapter=" + chapter);
  assert.ok(node, "Registered " + novel + " in reader");
  assert.equal(node.getAttribute("data-goatcounter"), "https://theboomdog.goatcounter.com/count");
  assert.equal(node.getAttribute("src"), "https://gc.zgo.at/count.js");
  const settings = JSON.parse(node.getAttribute("data-goatcounter-settings"));
  assert.equal(settings.path, "/novel/" + novel);
  assert.equal(settings.title, novel === "mol" ? "Mother of Learning" : "Malfoid");
}

assert.equal(visit("book.html", "?id=malfoid"), null, "Book info pages do not count as readers");
assert.equal(visit("reader.html", "?id=unknown&chapter=1"), null, "Unknown novels do not count");
console.log("GoatCounter novel-reader tracking integration passes.");
