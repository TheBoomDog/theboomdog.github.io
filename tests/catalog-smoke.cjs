const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const {JSDOM} = require("jsdom");

function open(page, search = "", rankings = null, extra = null) {
  const html = fs.readFileSync(page, "utf8");
  const dom = new JSDOM(html, {
    url: "https://novelhub.test/" + page + search,
    runScripts: "outside-only"
  });
  const context = dom.getInternalVMContext();
  const run = filename => vm.runInContext(fs.readFileSync(filename, "utf8"), context, {filename});
  run("data/catalog.js");
  if (extra) context.window.NOVELHUB_BOOKS.push(extra);
  run("data/rankings.js");
  if (rankings) context.window.NOVELHUB_RANKINGS = rankings;
  run("js/library.js");
  return dom.window;
}

const allBooks = open("index.html").NOVELHUB_BOOKS;
const published = allBooks.filter(book => book.chapters?.length);
assert.ok(published.length > 0, "At least one novel is published");
const home = open("index.html");
assert.equal(home.document.querySelectorAll(".novel-card").length, allBooks.length);
assert.equal(home.document.getElementById("latest-list").children.length,
  Math.min(10, published.reduce((sum, b) => sum + b.chapters.length, 0)));

const first = published[0];
const firstCard = home.document.querySelector('.novel-card[data-id="' + first.id + '"]');
firstCard.querySelector(".save-button").click();
assert.deepEqual(JSON.parse(home.localStorage.getItem("novelhub:saved:v1")), [first.id]);
home.document.getElementById("saved-only").click();
assert.equal(home.document.querySelectorAll(".novel-card").length, 1);
home.document.getElementById("reset").click();
assert.equal(home.document.querySelectorAll(".novel-card").length, allBooks.length);

const genre = allBooks.flatMap(b => b.genres || [])[0];
assert.ok(genre);
assert.ok([...home.document.getElementById("genre").options].some(option => option.value === genre));
home.document.getElementById("genre").value = genre;
home.document.getElementById("genre").dispatchEvent(new home.Event("change"));
assert.equal(home.document.querySelectorAll(".novel-card").length,
  allBooks.filter(book => (book.genres || []).includes(genre)).length);

const searched = open("search.html", "?q=" + encodeURIComponent(first.title));
assert.ok([...searched.document.querySelectorAll(".card-title")].some(n => n.textContent === first.title));

const rankings = open("ranking.html");
const validRanks = (rankings.NOVELHUB_RANKINGS?.entries || []).filter(entry =>
  Number.isInteger(entry.rank) && entry.rank > 0 && entry.rank <= 10).length;
assert.equal(rankings.document.querySelectorAll(".cover-mark").length, validRanks);
const summary = rankings.document.getElementById("ranking-summary").textContent;
assert.match(summary, /Weekly rankings|being prepared/i);

const sample = {
  status: "ready", metric: "visits", periodStart: "2026-10-12T01:00:00-05:00",
  periodEnd: "2026-10-19T01:00:00-05:00",
  entries: published.map((b, i) => ({id: b.id, rank: i + 1}))
};
const ranked = open("ranking.html", "", sample);
assert.equal(ranked.document.querySelector(".novel-card").dataset.id, first.id);
assert.equal(ranked.document.querySelector(".cover-mark").textContent, "1.");
assert.equal(ranked.document.querySelectorAll(".weekly-visits").length, 0,
  "Never show visit totals publicly");
assert.ok(!ranked.document.body.textContent.toLowerCase().includes("reader visits"),
  "Rankings should not disclose analytics terminology");


const updates = open("updates.html");
const allChapters = published.reduce((n,b) => n + b.chapters.length, 0);
assert.equal(updates.document.getElementById("updates-list").children.length, Math.min(30, allChapters));
updates.document.getElementById("more-updates").click();
assert.equal(updates.document.getElementById("updates-list").children.length, Math.min(60, allChapters));
const select = updates.document.getElementById("update-book");
select.value = first.id;
select.dispatchEvent(new updates.Event("change"));
assert.equal(updates.document.getElementById("updates-list").children.length, Math.min(30, first.chapters.length));

// Adding a future novel must not require editing page HTML or application code.
const newBook = {
  id: "synthetic-future-novel", title: "An Unlisted New Novel", genres: ["Experimental"],
  status: "In progress", chapters: [{
    key: "first", label: "Chapter 1", title: "A Beginning",
    href: "reader.html?id=synthetic-future-novel&chapter=first",
    source: "Novels/synthetic/chapter.html"
  }]
};
const additional = open("index.html", "", null, newBook);
assert.equal(additional.document.querySelectorAll(".novel-card").length, allBooks.length + 1);
assert.ok(additional.document.querySelector('.novel-card[data-id="synthetic-future-novel"]'));
assert.ok([...additional.document.querySelector("#genre").options].some(x => x.value === "Experimental"));
const rankedExtra = open("ranking.html", "", {
  status: "ready", metric: "visits", periodStart: "2026-10-12T01:00:00-05:00",
  periodEnd: "2026-10-19T01:00:00-05:00",
  entries: [{id:"synthetic-future-novel",rank:1}]
}, newBook);
assert.equal(rankedExtra.document.querySelector(".novel-card").dataset.id, newBook.id);
console.log("NovelHub catalog works with any published or newly registered novel.");
