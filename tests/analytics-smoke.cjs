const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { JSDOM } = require("jsdom");

const read = path => fs.readFileSync(path, "utf8");
const pages = ["index.html", "browse.html", "search.html", "ranking.html",
  "updates.html", "book.html", "reader.html", "privacy.html"];

function open(page, query = "", extra = null) {
  const dom = new JSDOM(read(page), {
    url: "https://theboomdog.github.io/" + page + query, runScripts: "outside-only"
  });
  const context = dom.getInternalVMContext();
  const run = path => vm.runInContext(read(path), context, { filename: path });
  run("data/catalog.js");
  if (extra) context.window.NOVELHUB_BOOKS.push(extra);
  run("data/analytics-config.js");
  run("js/analytics.js");
  return { dom, window: dom.window, run };
}

const catalog = new JSDOM("", { runScripts: "outside-only" });
vm.runInContext(read("data/catalog.js"), catalog.getInternalVMContext());
const books = catalog.window.NOVELHUB_BOOKS.filter(book => book.chapters?.length);
assert.ok(books.length);

function checkPixel(pixel, path) {
  assert.ok(pixel, "Tracking pixel exists for " + path);
  const url = new URL(pixel.src);
  assert.equal(url.origin, "https://theboomdog.goatcounter.com");
  assert.equal(url.pathname, "/count");
  assert.deepEqual([...url.searchParams.keys()], ["p"]);
  assert.equal(url.searchParams.get("p"), path);
  assert.equal(pixel.referrerPolicy, "no-referrer");
}

for (const page of pages) {
  const src = read(page);
  assert.equal((src.match(/src="js\\/analytics\\.js"/g) || []).length, 1,
    page + " must run minimal analytics exactly once");
  assert.equal((src.match(/src="data\\/analytics-config\\.js"/g) || []).length, 1,
    page + " must load GoatCounter configuration exactly once");
  const pageview = open(page);
  const doc = pageview.window.document;
  checkPixel(doc.querySelector("img[data-site-visit-count]"), "/site/visit");
  assert.equal(doc.querySelectorAll("img[data-novel-reader-count]").length, 0,
    "Opening " + page + " alone is not a novel read");
}
for (const book of books) {
  const view = open("reader.html", "?id=" + encodeURIComponent(book.id) +
    "&chapter=" + encodeURIComponent(book.chapters[0].key || "1"));
  const doc = view.window.document;
  checkPixel(doc.querySelector("img[data-site-visit-count]"), "/site/visit");
  assert.equal(doc.querySelectorAll("img[data-novel-reader-count]").length, 0,
    "No novel count until chapter content succeeds");
  doc.dispatchEvent(new view.window.CustomEvent("novelhub:chapter-loaded",
    {detail:{novelId:book.id}}));
  checkPixel(doc.querySelector("img[data-novel-reader-count]"), "/novel/" + book.id);
  doc.dispatchEvent(new view.window.CustomEvent("novelhub:chapter-loaded",
    {detail:{novelId:book.id}}));
  assert.equal(doc.querySelectorAll("img[data-novel-reader-count]").length, 1,
    "Only one novel request per reader page");
}
const future = {id:"future-book",title:"Any New Novel",chapters:[{
  key:"chapter-one",href:"reader.html?id=future-book&chapter=chapter-one"
}]};
const futureView = open("reader.html","?id=future-book&chapter=chapter-one", future);
futureView.window.document.dispatchEvent(new futureView.window.CustomEvent(
  "novelhub:chapter-loaded", {detail:{novelId:future.id}}));
checkPixel(futureView.window.document.querySelector("img[data-novel-reader-count]"),
  "/novel/" + future.id);
const bogus = open("reader.html", "?id=unknown&chapter=1");
bogus.window.document.dispatchEvent(new bogus.window.CustomEvent(
  "novelhub:chapter-loaded", {detail:{novelId:"unknown"}}));
assert.equal(bogus.window.document.querySelectorAll("img[data-novel-reader-count]").length,0);

// Integrate the real reader's async load path; a failed or empty chapter is
// counted as a site visit but NOT a novel visit.
async function loadReader(response) {
  const book = books.find(b => b.id === "malfoid") || books[0];
  const chapter = book.chapters[0];
  const v = open("reader.html", "?id=" + encodeURIComponent(book.id) +
    "&chapter=" + encodeURIComponent(chapter.key || "1"));
  v.window.fetch = async () => response;
  v.window.requestAnimationFrame = () => 1;
  v.window.console.error = () => {};
  v.run("js/chapter-changes.js");
  v.run("js/reader.js");
  await new Promise(resolve => setImmediate(resolve));
  return v.window.document;
}
(async () => {
  const good = await loadReader({
    ok:true,text:async()=>"<html><body><p>Example chapter text that loaded.</p></body></html>"
  });
  assert.equal(good.querySelectorAll("img[data-novel-reader-count]").length, 1,
    "Real successfully rendered chapter emits exactly one novel count");
  const failed = await loadReader({ok:false,status:404,text:async()=>""});
  assert.equal(failed.querySelectorAll("img[data-site-visit-count]").length, 1);
  assert.equal(failed.querySelectorAll("img[data-novel-reader-count]").length, 0,
    "Failed fetch must not count as a reader");
  const empty = await loadReader({
    ok:true,text:async()=>"<html><body><p> </p></body></html>"
  });
  assert.equal(empty.querySelectorAll("img[data-novel-reader-count]").length, 0,
    "Empty chapters must not count as reads");
  console.log("Canonical site visits and successful novel reads are counted separately.");
})().catch(error => {console.error(error);process.exitCode=1;});
