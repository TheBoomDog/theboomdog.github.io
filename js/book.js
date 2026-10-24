(()=>{"use strict";
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search);
const id=params.get("id");
const status=$("load-status"), content=$("book-content");
const clean=s=>typeof s==="string"?s:"";
const element=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=String(text);return el};
const entries=Array.isArray(window.NOVELHUB_BOOKS)?window.NOVELHUB_BOOKS:[];
const book=entries.find(b=>b.id===id);
if(!book){status.textContent="Book not found. Return to the library.";return}
document.title=book.title+" | NovelHub";
$("crumb-title").textContent=book.title;
$("book-title").textContent=book.title;
$("cover-title").textContent=book.title;
$("book-status").textContent=book.status||"";
const cover=$("book-cover");if(book.cover?.start)cover.style.setProperty("--cover-start",book.cover.start);if(book.cover?.end)cover.style.setProperty("--cover-end",book.cover.end);if(book.cover?.ink)cover.style.setProperty("--cover-ink",book.cover.ink);
if(book.cover?.image){cover.style.backgroundImage='url("'+encodeURI(book.cover.image).replaceAll('"',"%22")+'")';cover.style.backgroundSize="cover";cover.style.backgroundPosition="center";cover.querySelectorAll("span").forEach(el=>el.hidden=true)}
const meta=[book.author,book.chapters?.length?book.chapters.length+" chapters":"No chapters published",book.language].filter(Boolean);
meta.forEach(t=>$("metadata").append(element("span","",t)));
(book.genres||[]).forEach(g=>$("genres").append(element("span","tag",g)));
if(book.description){$("description").textContent=book.description;$("description").hidden=false}
const chapters=Array.isArray(book.chapters)?book.chapters.filter(c=>c&&typeof c.href==="string"&&c.href):[];
const first=chapters[0],last=chapters[chapters.length-1];
if(first){$("start-reading").href=first.href;$("start-reading").hidden=false}
if(last){$("latest-reading").href=last.href;$("latest-reading").hidden=false}
try{
  const storedProgress=JSON.parse(localStorage.getItem("novelhub:progress:v1")||"{}");
  const place=storedProgress&&storedProgress[book.id];
  const continueChapter=place?.key?chapters.find(ch=>ch.key===place.key):(Number.isInteger(place?.chapter)?chapters[place.chapter-1]:null);
  if(continueChapter){
    const continueLink=element("a","secondary-action","Continue reading");
    continueLink.href=continueChapter.href;
    $("start-reading").after(continueLink);
  }
}catch(e){}

$("chapter-count").textContent=chapters.length+" total";
const storageKey="novelhub:saved:v1";let saved=[];
try{const value=JSON.parse(localStorage.getItem(storageKey)||"[]");if(Array.isArray(value))saved=value.filter(x=>typeof x==="string")}catch(e){}
const save=$("save-book");const refreshSave=()=>{const selected=saved.includes(book.id);save.textContent=selected?"★ Saved":"☆ Save";save.setAttribute("aria-pressed",String(selected))};
refreshSave();save.addEventListener("click",()=>{saved=saved.includes(book.id)?saved.filter(v=>v!==book.id):[...saved,book.id];try{localStorage.setItem(storageKey,JSON.stringify(saved))}catch(e){}refreshSave()});
const volumeSelector = document.createElement("select");
volumeSelector.setAttribute("aria-label","Select book volume");
const hasVolumes = Array.isArray(book.volumes) && book.volumes.length>1;
if(hasVolumes){
  const all = document.createElement("option");
  all.value = "";
  all.textContent = "All books";
  volumeSelector.append(all);
  book.volumes.forEach(v=>{
    const option=document.createElement("option");
    option.value=String(v.number);
    option.textContent=v.name;
    volumeSelector.append(option);
  });
  $("chapter-controls").prepend(volumeSelector);
}
let page=0;const pageSize=25;
const search=$("chapter-search"),sort=$("chapter-sort"),list=$("chapter-list"),pager=$("pager");
const render=()=>{
const q=search.value.trim().toLocaleLowerCase();
const matches=chapters.map((c,i)=>({...c,ordinal:i+1})).filter(c=>(!hasVolumes||!volumeSelector.value||String(c.volume)===volumeSelector.value)&&(!q||(String(c.title||"").toLocaleLowerCase().includes(q)||String(c.label||"").toLocaleLowerCase().includes(q)||String(c.number??c.ordinal).toLocaleLowerCase().includes(q))));
if(sort.value==="desc")matches.reverse();
const pages=Math.max(1,Math.ceil(matches.length/pageSize));page=Math.min(page,pages-1);
list.replaceChildren();
matches.slice(page*pageSize,(page+1)*pageSize).forEach(c=>{
const a=element("a","chapter-row");a.href=c.href;
a.append(element("span","chapter-label",c.label||("Chapter "+(c.number??c.ordinal))),element("span","chapter-title",c.title||("Chapter "+(c.number??c.ordinal))),element("span","chapter-arrow","↗"));
list.append(a)
});
$("chapter-empty").hidden=matches.length>0;
$("chapter-empty").textContent=chapters.length?"No matching chapters.":"No chapters published yet.";
$("page-status").textContent=(page+1)+" / "+pages;
$("page-prev").disabled=page===0;$("page-next").disabled=page>=pages-1;
pager.hidden=pages<=1;
};
if(hasVolumes)volumeSelector.addEventListener("change",()=>{page=0;render()});
search.addEventListener("input",()=>{page=0;render()});sort.addEventListener("change",()=>{page=0;render()});
$("page-prev").addEventListener("click",()=>{if(page>0){page--;render()}});$("page-next").addEventListener("click",()=>{page++;render()});
render();status.hidden=true;content.hidden=false;
})();