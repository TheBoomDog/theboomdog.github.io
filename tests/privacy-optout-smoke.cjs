const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { JSDOM } = require("jsdom");
const read = path => fs.readFileSync(path, "utf8");
const KEY = "novelhub:analytics-opt-out:v1";
const catalog = new JSDOM("", {runScripts:"outside-only"});
vm.runInContext(read("data/catalog.js"), catalog.getInternalVMContext());
const book = catalog.window.NOVELHUB_BOOKS.find(b => b.chapters?.length);
assert.ok(book);

function visit(page, stored, blockStorage = false) {
  const query = page === "reader.html" ? "?id=" + encodeURIComponent(book.id) +
    "&chapter=" + encodeURIComponent(book.chapters[0].key || "1") : "";
  const dom = new JSDOM(read(page), {
    url:"https://theboomdog.github.io/" + page + query,
    runScripts:"outside-only"
  });
  if (stored !== undefined) dom.window.localStorage.setItem(KEY, stored);
  if (blockStorage) Object.defineProperty(dom.window, "localStorage", {
    configurable:true, get() {throw new Error("Storage blocked");}
  });
  const ctx = dom.getInternalVMContext();
  const run = file => vm.runInContext(read(file),ctx,{filename:file});
  run("data/catalog.js");
  if (page === "privacy.html") run("js/privacy-optout.js");
  run("data/analytics-config.js");
  run("js/analytics.js");
  return dom.window;
}
const sitePixels = win => win.document.querySelectorAll("img[data-site-visit-count]");
const novelPixels = win => win.document.querySelectorAll("img[data-novel-reader-count]");
const signal = win => win.document.dispatchEvent(new win.CustomEvent("novelhub:chapter-loaded",
  {detail:{novelId:book.id}}));

const fresh = visit("privacy.html");
const control = fresh.document.getElementById("analytics-opt-out");
assert.ok(control);
assert.equal(control.disabled,false);
assert.equal(control.checked,false,"Counting is on by default");
assert.equal(sitePixels(fresh).length,1,"Even privacy page is part of sitewide visits");
const normal = visit("reader.html");
assert.equal(sitePixels(normal).length,1);
assert.equal(novelPixels(normal).length,0,"A novel is counted only after load");
signal(normal);
assert.equal(novelPixels(normal).length,1);

control.checked = true;
control.dispatchEvent(new fresh.Event("change",{bubbles:true}));
assert.equal(fresh.localStorage.getItem(KEY),"1");
assert.match(fresh.document.getElementById("analytics-opt-out-status").textContent,/counting is off/i);
for(const page of ["index.html","reader.html","privacy.html"]) {
 const w=visit(page,"1");
 assert.equal(sitePixels(w).length,0,page+" opted-out site count");
 signal(w);
 assert.equal(novelPixels(w).length,0,page+" opted-out novel count");
}
assert.equal(visit("privacy.html","1").document.getElementById("analytics-opt-out").checked,true);
control.checked = false;
control.dispatchEvent(new fresh.Event("change",{bubbles:true}));
assert.equal(fresh.localStorage.getItem(KEY),null);
assert.equal(sitePixels(visit("index.html")).length,1,"Opting back in resumes site visits");
const again = visit("reader.html");
signal(again);
assert.equal(novelPixels(again).length,1,"Opting in resumes novel reads");

for (const page of ["index.html","reader.html","privacy.html"]) {
 const restricted=visit(page,undefined,true);
 assert.equal(sitePixels(restricted).length,0,page+" fails closed when storage blocked");
 signal(restricted);
 assert.equal(novelPixels(restricted).length,0);
 if(page==="privacy.html") {
  assert.equal(restricted.document.getElementById("analytics-opt-out").disabled,true);
  assert.match(restricted.document.getElementById("analytics-opt-out-status").textContent,
    /storage cannot be read/i);
 }
}
assert.ok(!read("index.html").includes("analytics-opt-out"),
  "The opt-out control belongs on the privacy page, not the homepage");
console.log("Sitewide/novel opt-out and blocked-storage fail-closed checks passed.");
