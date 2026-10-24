const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const {JSDOM} = require("jsdom");

const read = path => fs.readFileSync(path, "utf8");

function page(name, query = "", setup = () => {}) {
  const dom = new JSDOM(read(name), {
    url: "https://theboomdog.github.io/" + name + query,
    runScripts: "outside-only"
  });
  const context = dom.getInternalVMContext();
  const run = file => vm.runInContext(read(file), context, {filename:file});
  run("data/catalog.js");
  setup(dom.window);
  run("js/chapter-changes.js");
  if (name !== "reader.html") {
    run("data/rankings.js");
    run(name === "book.html" ? "js/book.js" : "js/library.js");
  }
  run("data/site-config.js");
  run("js/report.js");
  return dom.window;
}

const initial = page("index.html");
assert.equal(initial.document.querySelector("#continue-reading").hidden, true,
  "No Continue Reading shelf before reading a chapter");
const first = initial.NOVELHUB_BOOKS.find(book => book.chapters?.length);
assert.ok(first);
const chapter = first.chapters[0];
assert.equal(initial.NOVELHUB_CHAPTER_CHANGES.get(first.id, chapter), "new",
  "A new device has no chapter history, so unread chapters are New");
assert.ok(initial.document.querySelectorAll(".chapter-flag-new").length > 0,
  "A first-time visitor sees locally unread chapters marked New");
assert.equal(initial.localStorage.getItem("novelhub:seen-chapters:v1"), null,
  "Browsing the catalog must not mark chapters as read");

// An existing reader's last chapter also supplies a useful continuation
// point, without pretending that all earlier chapters are unread.
const withProgress = page("index.html", "", w => {
  w.localStorage.setItem("novelhub:progress:v1", JSON.stringify({
    [first.id]: {key: chapter.key || null, chapter: 1, ratio: 0.36, updated: Date.now()}
  }));
});
const shelf = withProgress.document.querySelector("#continue-reading");
assert.equal(shelf.hidden, false, "Show Continue Reading for existing progress");
assert.equal(withProgress.document.querySelector("#continue-link").getAttribute("href"), chapter.href);
assert.match(withProgress.document.querySelector("#continue-details").textContent, /36% through chapter/);
assert.match(withProgress.document.querySelector("#continue-details").textContent, new RegExp(first.title));
assert.equal(withProgress.NOVELHUB_CHAPTER_CHANGES.get(first.id, withProgress.NOVELHUB_BOOKS
  .find(book => book.id === first.id).chapters[0]), null,
  "Chapters already reached in saved progress are not New");

// Explicit reading clears a New badge, without contacting any server.
initial.NOVELHUB_CHAPTER_CHANGES.markSeen(first.id, chapter);
assert.equal(initial.NOVELHUB_CHAPTER_CHANGES.get(first.id, chapter), null);
const readHistory = JSON.parse(initial.localStorage.getItem("novelhub:seen-chapters:v1"));
assert.ok(Object.hasOwn(readHistory[first.id], chapter.key || chapter.href));
const reopened = page("index.html", "", w => {
  w.localStorage.setItem("novelhub:seen-chapters:v1", JSON.stringify(readHistory));
});
assert.equal(reopened.NOVELHUB_CHAPTER_CHANGES.get(first.id, reopened.NOVELHUB_BOOKS
  .find(book => book.id === first.id).chapters[0]), null,
  "Read receipts survive navigation on the same browser");

// A revision gets an Updated badge only during its first three days and
// only until the revised version has been opened.
const DAY = 24 * 60 * 60 * 1000;
const today = Date.now();
const earlier = new Date(today - 8 * DAY).toISOString();
const revised = new Date(today - 2 * DAY).toISOString();
const oldRevision = new Date(today - 4 * DAY).toISOString();
const revision = page("index.html", "", w => {
  w.NOVELHUB_BOOKS.find(book => book.id === first.id).chapters[0].updatedAt = revised;
  w.localStorage.setItem("novelhub:seen-chapters:v1", JSON.stringify({
    [first.id]: {[chapter.key || chapter.href]: earlier}
  }));
});
const revisedChapter = revision.NOVELHUB_BOOKS.find(b => b.id === first.id).chapters[0];
assert.equal(revision.NOVELHUB_CHAPTER_CHANGES.get(first.id, revisedChapter), "updated");
assert.ok(revision.document.querySelector(".chapter-flag-updated"));
revision.NOVELHUB_CHAPTER_CHANGES.markSeen(first.id, revisedChapter);
assert.equal(revision.NOVELHUB_CHAPTER_CHANGES.get(first.id, revisedChapter), null);
const stale = page("index.html", "", w => {
  w.NOVELHUB_BOOKS.find(book => book.id === first.id).chapters[0].updatedAt = oldRevision;
  w.localStorage.setItem("novelhub:seen-chapters:v1", JSON.stringify({
    [first.id]: {[chapter.key || chapter.href]: earlier}
  }));
});
assert.equal(stale.NOVELHUB_CHAPTER_CHANGES.get(first.id,
  stale.NOVELHUB_BOOKS.find(b => b.id === first.id).chapters[0]), null,
  "An already-read chapter does not show an outdated revision badge");
const neverSeen = page("index.html", "", w => {
  w.NOVELHUB_BOOKS.find(book => book.id === first.id).chapters[0].updatedAt = oldRevision;
});
assert.equal(neverSeen.NOVELHUB_CHAPTER_CHANGES.get(first.id,
  neverSeen.NOVELHUB_BOOKS.find(b => b.id === first.id).chapters[0]), "new",
  "An unread chapter remains New, even if it was published long ago");

const newEntry = page("index.html", "", w => {
  const record = w.NOVELHUB_BOOKS.find(b => b.id === first.id);
  record.chapters.push({key:"dynamic-future-chapter",
    href:"reader.html?id="+encodeURIComponent(first.id)+"&chapter=dynamic-future-chapter",
    title:"Later chapter",updatedAt:revised});
});
assert.equal(newEntry.NOVELHUB_CHAPTER_CHANGES.get(first.id,
  newEntry.NOVELHUB_BOOKS.find(b => b.id === first.id).chapters.at(-1)), "new");

const homepageLink = initial.document.querySelector("a[data-report-problem]");
assert.ok(homepageLink, "Homepage needs a prominently visible report link");
assert.equal(homepageLink.target, "_blank");
assert.equal(homepageLink.rel, "noopener noreferrer");
const homepageIssue = new URL(homepageLink.href);
assert.equal(homepageIssue.origin, "https://github.com");
assert.equal(homepageIssue.pathname, "/TheBoomDog/theboomdog.github.io/issues/new");
assert.match(homepageIssue.searchParams.get("body"), /What went wrong/);
assert.match(homepageIssue.searchParams.get("body"), /index\.html/);

const reader = page("reader.html", "?id=" + encodeURIComponent(first.id) +
  "&chapter=" + encodeURIComponent(chapter.key || "1"));
const links = reader.document.querySelectorAll("a[data-report-problem]");
assert.equal(links.length, 2, "Allow chapter reporting at top and bottom");
for (const link of links) {
  const issue = new URL(link.href);
  assert.match(issue.searchParams.get("title"), new RegExp(first.title));
  assert.match(issue.searchParams.get("body"), new RegExp(first.title));
  assert.match(issue.searchParams.get("body"), /reader\.html\?id=/);
  assert.ok(!issue.searchParams.get("body").includes("novelhub:progress"));
}
const novel = page("book.html", "?id=" + encodeURIComponent(first.id));
assert.ok(novel.document.querySelector("a[data-report-problem]"));
console.log("Returning-reader shelf, chapter flags, and prefilled problem reports passed.");
