const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { JSDOM } = require("jsdom");

const scripts = ["data/books.js", "data/malfoid.js", "data/rankings.js", "js/library.js"];
function open(name, query = "", leaderboard = null) {
  const html = fs.readFileSync(name, "utf8");
  const dom = new JSDOM(html, {
    url: "https://novelhub.test/" + name + query,
    runScripts: "outside-only"
  });
  const context = dom.getInternalVMContext();
  for (const script of scripts) {
    if (script === "js/library.js" && leaderboard) {
      context.window.NOVELHUB_RANKINGS = leaderboard;
    }
    vm.runInContext(fs.readFileSync(script, "utf8"), context, { filename: script });
  }
  return dom.window;
}

const home = open("index.html");
assert.equal(home.document.querySelectorAll(".novel-card").length, 2, "Render both novels from catalog");
assert.equal(home.document.getElementById("latest-list").children.length, 10, "Render ten recent chapters");
const malfoid = [...home.document.querySelectorAll(".novel-card")].find(n => n.dataset.id === "malfoid");
assert.match(malfoid.textContent, /\d+ chapters/, "Show the live generated Malfoid count");
assert.ok([...home.document.querySelectorAll("#latest-list .chapter-book")].some(n => n.textContent === "Malfoid"), "Include Malfoid in recent chapters");

home.document.querySelector('.novel-card[data-id="malfoid"] .save-button').click();
assert.equal(JSON.parse(home.localStorage.getItem("novelhub:saved:v1"))[0], "malfoid");
home.document.getElementById("saved-only").click();
assert.equal(home.document.querySelectorAll(".novel-card").length, 1, "Filter saved novels");
assert.equal(home.document.querySelector(".novel-card").dataset.id, "malfoid");
home.document.getElementById("reset").click();
assert.equal(home.document.querySelectorAll(".novel-card").length, 2);
const genre = home.document.getElementById("genre");
assert.ok([...genre.options].some(o => o.value === "Time Loop"));
genre.value = "Time Loop";
genre.dispatchEvent(new home.Event("change"));
assert.equal(home.document.querySelectorAll(".novel-card").length, 1);

const search = open("search.html", "?q=malfoid");
assert.equal(search.document.querySelectorAll(".novel-card").length, 1);
assert.equal(search.document.querySelector(".card-title").textContent, "Malfoid");

const rankings = open("ranking.html");
assert.equal(rankings.document.querySelectorAll(".cover-mark").length, 0, "Do not invent rankings before analytics is active");
const summary = rankings.document.getElementById("ranking-summary").textContent;
if (rankings.NOVELHUB_RANKINGS?.status === "ready") {
  assert.match(summary, /Ranked by reader visits/);
} else {
  assert.match(summary, /awaiting analytics/i);
}
const sample = {
  status: "ready", metric: "visits", periodStart: "2026-10-12T01:00:00-05:00",
  periodEnd: "2026-10-19T01:00:00-05:00",
  entries: [{id:"malfoid",visits:9,rank:1},{id:"mol",visits:4,rank:2}]
};
const liveRanks = open("ranking.html", "", sample);
assert.equal(liveRanks.document.querySelector(".novel-card").dataset.id, "malfoid", "Sort by visits, not chapter count");
assert.equal(liveRanks.document.querySelectorAll(".cover-mark").length, 2, "Only measured top ten receive cover numerals");
assert.equal(liveRanks.document.querySelector(".cover-mark").textContent, "1.");
assert.match(liveRanks.document.querySelector(".weekly-visits").textContent, /9 reader visits/);

const updates = open("updates.html");
assert.equal(updates.document.getElementById("updates-list").children.length, 30);
updates.document.getElementById("more-updates").click();
assert.equal(updates.document.getElementById("updates-list").children.length, 60, "Load more must increment");
const filter = updates.document.getElementById("update-book");
filter.value = "malfoid";
filter.dispatchEvent(new updates.Event("change"));
assert.equal(updates.document.getElementById("updates-list").children.length, 30, "Filter by book");
const query = updates.document.getElementById("update-search");
query.value = "The Beginning";
query.dispatchEvent(new updates.Event("input"));
assert.equal(updates.document.getElementById("updates-list").children.length, 1, "Search by chapter title");

console.log("Catalog smoke tests passed: home, saved, search, rankings, chapter updates.");
