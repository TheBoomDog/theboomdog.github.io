const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { JSDOM } = require("jsdom");

const read = path => fs.readFileSync(path, "utf8");
const KEY = "novelhub:analytics-opt-out:v1";

function privacy(stored, blockStorage = false) {
  const dom = new JSDOM(read("privacy.html"), {
    url: "https://theboomdog.github.io/privacy.html",
    runScripts: "outside-only"
  });
  if (stored !== undefined) dom.window.localStorage.setItem(KEY, stored);
  if (blockStorage) Object.defineProperty(dom.window, "localStorage", {
    configurable: true, get() { throw new Error("Storage blocked"); }
  });
  vm.runInContext(read("js/privacy-optout.js"), dom.getInternalVMContext(), {
    filename: "js/privacy-optout.js"
  });
  return dom.window;
}

function reader(stored, blockStorage = false) {
  const dom = new JSDOM(read("reader.html"), {
    url: "https://theboomdog.github.io/reader.html?id=" +
      encodeURIComponent(book.id) + "&chapter=" +
      encodeURIComponent(book.chapters[0].key || "1"),
    runScripts: "outside-only"
  });
  if (stored !== undefined) dom.window.localStorage.setItem(KEY, stored);
  if (blockStorage) Object.defineProperty(dom.window, "localStorage", {
    configurable: true, get() { throw new Error("Storage blocked"); }
  });
  const ctx = dom.getInternalVMContext();
  for (const file of ["data/catalog.js", "data/analytics-config.js", "js/analytics.js"]) {
    vm.runInContext(read(file), ctx, {filename:file});
  }
  return dom.window.document.querySelectorAll("img[data-novel-reader-count]");
}

const catalog = new JSDOM("", {runScripts: "outside-only"});
vm.runInContext(read("data/catalog.js"), catalog.getInternalVMContext());
const book = catalog.window.NOVELHUB_BOOKS.find(b => b.chapters?.length);
assert.ok(book, "Need a novel to exercise the anonymous visit counter");

const fresh = privacy();
const control = fresh.document.getElementById("analytics-opt-out");
assert.ok(control);
assert.equal(control.disabled, false);
assert.equal(control.checked, false, "Default is anonymous counting on");
assert.match(fresh.document.getElementById("analytics-opt-out-status").textContent, /counting is on/i);
assert.equal(reader().length, 1, "Without an opt-out, one anonymous visit is counted");

control.checked = true;
control.dispatchEvent(new fresh.Event("change", {bubbles:true}));
assert.equal(fresh.localStorage.getItem(KEY), "1");
assert.match(fresh.document.getElementById("analytics-opt-out-status").textContent, /counting is off/i);
assert.equal(reader("1").length, 0, "Opted-out reader must not create any GoatCounter pixel");
assert.equal(privacy("1").document.getElementById("analytics-opt-out").checked, true,
  "A saved preference must be reflected on future privacy-page visits");

control.checked = false;
control.dispatchEvent(new fresh.Event("change", {bubbles:true}));
assert.equal(fresh.localStorage.getItem(KEY), null);
assert.equal(reader().length, 1, "Opting back in restores ordinary counting");

assert.equal(reader(undefined, true).length, 0,
  "Blocked localStorage must fail closed before a tracking request is made");
const restricted = privacy(undefined, true);
assert.equal(restricted.document.getElementById("analytics-opt-out").disabled, true);
assert.match(restricted.document.getElementById("analytics-opt-out-status").textContent,
  /storage cannot be read/i);
assert.ok(!read("index.html").includes("analytics-opt-out"),
  "The opt-out belongs on the privacy page, not on the homepage");
console.log("Opt-out persistence, opt-in, and fail-closed analytics checks passed.");
