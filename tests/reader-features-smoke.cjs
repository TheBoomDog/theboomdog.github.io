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
assert.equal(initial.document.querySelectorAll(".chapter-flag").length, 0,
  "Never mark the initial catalog as all-new");
const known = JSON.parse(initial.localStorage.getItem("novelhub:known-chapters:v1"));
assert.ok(known?.chapters, "Store the visitor's chapter baseline locally");

const first = initial.NOVELHUB_BOOKS.find(book => book.chapters?.length);
assert.ok(first);
const chapter = first.chapters[0];
const withProgress = page("index.html", "", w => {
  w.localStorage.setItem("novelhub:progress:v1", JSON.stringify({
    [first.id]: {key: chapter.key || null, chapter: 1, ratio: 0.36, updated: Date.now()}
  }));
});
const shelf = withProgress.document.querySelector("#continue-reading");
assert.equal(shelf.hidden, false, "Show the Continue Reading shelf for existing progress");
assert.equal(withProgress.document.querySelector("#continue-link").getAttribute("href"), chapter.href);
assert.match(withProgress.document.querySelector("#continue-details").textContent, /36% through chapter/);
assert.match(withProgress.document.querySelector("#continue-details").textContent, new RegExp(first.title));

const baseline = {...known, lastSeen: Date.now() - 31 * 60 * 1000};
const modified = page("index.html", "", w => {
  w.localStorage.setItem("novelhub:known-chapters:v1", JSON.stringify(baseline));
  const record = w.NOVELHUB_BOOKS.find(b => b.id === first.id);
  record.chapters[0].updatedAt = "2999-01-01T00:00:00Z";
  record.chapters.push({
    key: "return-visit-new-chapter", label: "A later chapter", title: "Added later",
    href: "reader.html?id=" + encodeURIComponent(first.id) + "&chapter=return-visit-new-chapter",
    source: "Novels/test/later.html", updatedAt:"2999-01-01T00:00:00Z"
  });
});
assert.equal(modified.NOVELHUB_CHAPTER_CHANGES.get(first.id, modified.NOVELHUB_BOOKS.find(b=>b.id===first.id).chapters[0]), "updated");
assert.equal(modified.NOVELHUB_CHAPTER_CHANGES.get(first.id, modified.NOVELHUB_BOOKS.find(b=>b.id===first.id).chapters.at(-1)), "new");
assert.ok(modified.document.querySelector(".chapter-flag-new"), "Display New chapter badge");
assert.ok(modified.document.querySelector(".chapter-flag-updated"), "Display Updated chapter badge");

const stable = page("index.html", "", w => {
  w.localStorage.setItem("novelhub:known-chapters:v1", JSON.stringify(
    JSON.parse(modified.localStorage.getItem("novelhub:known-chapters:v1"))
  ));
  const record = w.NOVELHUB_BOOKS.find(b => b.id === first.id);
  record.chapters[0].updatedAt = "2999-01-01T00:00:00Z";
  record.chapters.push({key:"return-visit-new-chapter",href:"reader.html?id="+first.id+"&chapter=return-visit-new-chapter"});
});
assert.ok(stable.document.querySelector(".chapter-flag-new"),
  "Changes remain visible on navigation within a session");

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
