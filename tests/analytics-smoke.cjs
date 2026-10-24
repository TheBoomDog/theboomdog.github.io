const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const {JSDOM} = require("jsdom");

function visit(page, query, novel = null) {
  const dom = new JSDOM(fs.readFileSync(page, "utf8"), {
    url: "https://theboomdog.github.io/" + page + (query || ""),
    runScripts: "outside-only"
  });
  const context = dom.getInternalVMContext();
  for (const path of ["data/catalog.js", "data/analytics-config.js"]) {
    vm.runInContext(fs.readFileSync(path, "utf8"), context, {filename:path});
  }
  if (novel) context.window.NOVELHUB_BOOKS.push(novel);
  vm.runInContext(fs.readFileSync("js/analytics.js", "utf8"), context, {
    filename:"js/analytics.js"
  });
  return dom.window.document.querySelector("img[data-novel-reader-count]");
}

const books = visit; // Every published entry gets the same anonymous visitor treatment.
const base = new JSDOM("", {runScripts:"outside-only"});
vm.runInContext(fs.readFileSync("data/catalog.js","utf8"),base.getInternalVMContext());
const available = base.window.NOVELHUB_BOOKS.filter(b=>b.chapters?.length);
assert.ok(available.length > 0);
function verify(book, extra = null) {
  const pixel = visit("reader.html", "?id=" + encodeURIComponent(book.id) +
    "&chapter=" + encodeURIComponent(book.chapters[0].key || "1"), extra);
  assert.ok(pixel, "Registered "+book.id+" in reader");
  const url = new URL(pixel.src);
  assert.equal(url.origin, "https://theboomdog.goatcounter.com");
  assert.equal(url.pathname, "/count");
  assert.deepEqual([...url.searchParams.keys()], ["p"]);
  assert.equal(url.searchParams.get("p"), "/novel/" + book.id);
  assert.equal(pixel.referrerPolicy, "no-referrer");
}
available.forEach(b => verify(b));
const future = {id:"future-book",title:"Any New Novel",chapters:[{
  key:"chapter-one",href:"reader.html?id=future-book&chapter=chapter-one"
}]};
verify(future, future);
assert.equal(visit("book.html","?id="+encodeURIComponent(available[0].id)), null,
  "Book details do not count as reading");
assert.equal(visit("reader.html","?id=unknown&chapter=1"), null);
console.log("Minimal reader tracking automatically supports new novels.");
