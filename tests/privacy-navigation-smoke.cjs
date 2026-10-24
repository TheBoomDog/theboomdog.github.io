const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const {JSDOM} = require("jsdom");

const read = path => fs.readFileSync(path, "utf8");
const pages = ["index.html", "browse.html", "search.html", "ranking.html",
  "updates.html", "book.html", "reader.html"];
for (const filename of pages) {
  const doc = new JSDOM(read(filename)).window.document;
  const link = doc.querySelector('a[href="privacy.html"]');
  assert.ok(link, filename + " must link to its public privacy disclosure");
  const report = doc.querySelector("a[data-report-problem]");
  assert.ok(report, filename + " must offer issue reporting");
}
const disclosure = new JSDOM(read("privacy.html")).window.document;
const body = disclosure.body.textContent;
assert.match(body, /31.day retention/i);
assert.match(body, /anonymous visits/i);
assert.match(body, /GoatCounter/i);
assert.match(body, /IP address/i);
assert.match(body, /browser/i);
assert.match(body, /GitHub Pages/i);
assert.match(body, /publicly available/i);
assert.match(body, /does not currently contain a software license/i);
assert.ok(disclosure.querySelector('a[href="https://github.com/TheBoomDog/theboomdog.github.io"]'));
assert.ok(!/zero tracking|completely open.source/i.test(body),
  "Do not promise zero tracking or claim an open-source license that does not exist");

function nav(added) {
  const dom = new JSDOM(read("index.html"), {
    url: "https://theboomdog.github.io/",
    runScripts: "outside-only"
  });
  const ctx = dom.getInternalVMContext();
  vm.runInContext(read("data/catalog.js"), ctx);
  for(let i=0;i<added;i++) ctx.window.NOVELHUB_BOOKS.push({
    id:"test-novel-"+i,title:"New novel "+i,chapters:[]
  });
  vm.runInContext(read("js/nav.js"), ctx);
  return {
    count: new Set(ctx.window.NOVELHUB_BOOKS.map(b=>b.id)).size,
    links: [...dom.window.document.querySelectorAll("[data-browse-link]")]
  };
}
const small = nav(0);
assert.ok(small.count <= 10);
assert.ok(small.links.length > 0);
assert.ok(small.links.every(link => link.hidden),
  "Browse remains hidden while the site has ten or fewer novels");
const many = nav(11);
assert.ok(many.count > 10);
assert.ok(many.links.every(link => !link.hidden),
  "Browse reappears when the catalog grows beyond ten novels");
console.log("Privacy transparency, footer access, and catalog-aware navigation passed.");
