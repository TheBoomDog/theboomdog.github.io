(()=>{
"use strict";
const $=id=>document.getElementById(id);
const books=Array.isArray(window.NOVELHUB_BOOKS)?window.NOVELHUB_BOOKS:[];
const params=new URLSearchParams(location.search);
const book=books.find(x=>x.id===params.get("id"));
const requested=params.get("chapter");
const keyIndex=book?.chapters?.findIndex(ch=>ch.key&&ch.key===requested)??-1;
const ordinal=keyIndex>=0?keyIndex+1:Number(requested);
const article=$("chapter-text");
const error=message=>{article.replaceChildren();const p=document.createElement("p");p.className="loading-message";p.textContent=message;article.append(p);$("chapter-title").textContent="Chapter unavailable"};
if(!book||!Number.isInteger(ordinal)||ordinal<1||ordinal>book.chapters.length){error("Chapter not found. Return to the library.");return}
const chapter=book.chapters[ordinal-1];
const chapterURL=new URL(chapter.source||chapter.href,location.href);
if(chapterURL.origin!==location.origin||!/^https?:$/.test(chapterURL.protocol)){error("Invalid chapter source.");return}
const readerLink=n=>book.chapters[n-1]?.href||("reader.html?id="+encodeURIComponent(book.id)+"&chapter="+n);
const detailLink="book.html?id="+encodeURIComponent(book.id);
$("book-link").textContent=book.title;$("book-link").href=detailLink;
$("novel-title-link").textContent=book.title;$("novel-title-link").href=detailLink;
$("bar-chapter").textContent=chapter.label||("Chapter "+ordinal);
$("chapter-title").textContent=chapter.title||("Chapter "+ordinal);
$("chapter-position").textContent=ordinal+" / "+book.chapters.length;
$("footer-position").textContent=ordinal+" / "+book.chapters.length;
const nav=(id,n)=>{const a=$(id);if(n>=1&&n<=book.chapters.length){a.href=readerLink(n);a.removeAttribute("aria-disabled")}else{a.removeAttribute("href");a.setAttribute("aria-disabled","true")}};
nav("bottom-prev",ordinal-1);nav("footer-prev",ordinal-1);nav("bottom-next",ordinal+1);nav("footer-next",ordinal+1);
const defaults={theme:"dark",font:"georgia",size:18,line:1.8,gap:1.25,width:760,align:"left"};
const settingsKey="novelhub:reader-settings:v1",progressKey="novelhub:progress:v1";
const fonts={georgia:'Georgia,"Times New Roman",serif',times:'"Times New Roman",Times,serif',palatino:'Palatino,"Palatino Linotype","Book Antiqua",Georgia,serif',arial:'Arial,Helvetica,sans-serif',verdana:'Verdana,Geneva,sans-serif',system:'system-ui,-apple-system,"Segoe UI",sans-serif'};
const themes=["dark","light","sepia","black"];
const numeric=(x,min,max,fallback)=>{const n=Number(x);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback};
const loadJSON=(key,fallback)=>{try{const value=JSON.parse(localStorage.getItem(key)||"null");return value&&typeof value==="object"&&!Array.isArray(value)?value:fallback}catch(e){return fallback}};
const saveJSON=(key,data)=>{try{localStorage.setItem(key,JSON.stringify(data))}catch(e){}};
const stored=loadJSON(settingsKey,{});
let settings={
theme:themes.includes(stored.theme)?stored.theme:defaults.theme,
font:Object.hasOwn(fonts,stored.font)?stored.font:defaults.font,
size:numeric(stored.size,14,32,defaults.size),
line:numeric(stored.line,1.3,2.3,defaults.line),
gap:numeric(stored.gap,0,2.5,defaults.gap),
width:numeric(stored.width,520,1080,defaults.width),
align:stored.align==="justify"?"justify":"left"
};
const syncControls=()=>{
$("font-select").value=settings.font;$("font-size").value=settings.size;
$("line-height").value=settings.line;$("paragraph-gap").value=settings.gap;
$("reader-width").value=settings.width;$("text-align").value=settings.align;
$("font-size-label").textContent=settings.size+" px";
$("line-height-label").textContent=Number(settings.line).toFixed(1)+"×";
$("paragraph-gap-label").textContent=Number(settings.gap).toFixed(2).replace(/0+$/,"").replace(/\.$/,"")+" em";
$("reader-width-label").textContent=settings.width+" px";
document.querySelectorAll("[data-theme-choice]").forEach(btn=>btn.setAttribute("aria-pressed",String(settings.theme===btn.dataset.themeChoice)));
};
const applySettings=(preservePosition=false)=>{
const available=Math.max(0,document.documentElement.scrollHeight-innerHeight);
const ratio=available?scrollY/available:0;
document.body.dataset.theme=settings.theme;
const root=document.documentElement.style;
root.setProperty("--reader-font",fonts[settings.font]);
root.setProperty("--reader-size",settings.size+"px");
root.setProperty("--reader-line",settings.line);
root.setProperty("--reader-gap",settings.gap+"em");
root.setProperty("--reader-width",settings.width+"px");
root.setProperty("--reader-align",settings.align);
syncControls();saveJSON(settingsKey,settings);
if(preservePosition)requestAnimationFrame(()=>window.scrollTo(0,Math.round(Math.max(0,document.documentElement.scrollHeight-innerHeight)*ratio)));
};
applySettings();
const bindRange=(id,key)=>$(id).addEventListener("input",e=>{settings[key]=Number(e.target.value);applySettings(true)});
bindRange("font-size","size");bindRange("line-height","line");bindRange("paragraph-gap","gap");bindRange("reader-width","width");
$("font-select").addEventListener("change",e=>{settings.font=e.target.value;applySettings(true)});
$("text-align").addEventListener("change",e=>{settings.align=e.target.value;applySettings(true)});
document.querySelectorAll("[data-theme-choice]").forEach(btn=>btn.addEventListener("click",()=>{settings.theme=btn.dataset.themeChoice;applySettings()}));
$("reset-settings").addEventListener("click",()=>{settings={...defaults};applySettings(true)});
const settingsDialog=$("settings-dialog"),tocDialog=$("toc-dialog");
const openDialog=dialog=>{if(dialog===settingsDialog&&tocDialog.open)tocDialog.close();if(dialog===tocDialog&&settingsDialog.open)settingsDialog.close();if(!dialog.open)dialog.showModal();$("settings-open").setAttribute("aria-expanded",String(settingsDialog.open))};
const closeDialog=dialog=>{if(dialog.open)dialog.close();$("settings-open").setAttribute("aria-expanded","false")};
$("settings-open").addEventListener("click",()=>openDialog(settingsDialog));
$("done-settings").addEventListener("click",()=>closeDialog(settingsDialog));
$("toc-open").addEventListener("click",()=>openDialog(tocDialog));
["bottom-toc","footer-chapters"].forEach(id=>$(id).addEventListener("click",()=>openDialog(tocDialog)));
document.querySelectorAll("[data-close-dialog]").forEach(btn=>btn.addEventListener("click",()=>closeDialog(btn.closest("dialog"))));
[settingsDialog,tocDialog].forEach(d=>{d.addEventListener("close",()=>{$("settings-open").setAttribute("aria-expanded","false")});d.addEventListener("click",e=>{if(e.target===d)closeDialog(d)})});
const tocList=$("toc-list"),tocSearch=$("toc-search");
const drawToc=()=>{
const query=tocSearch.value.trim().toLocaleLowerCase();
tocList.replaceChildren();
let found=0;
book.chapters.forEach((c,i)=>{
const label=c.label||("Chapter "+(i+1)),title=c.title||label;
if(query&&!((label+" "+title+" "+(i+1)).toLocaleLowerCase().includes(query)))return;
const a=document.createElement("a");a.href=readerLink(i+1);if(i+1===ordinal)a.setAttribute("aria-current","page");
const small=document.createElement("small");small.textContent=label;
const name=document.createElement("span");name.textContent=title;
a.append(small,name);tocList.append(a);found++;
});
if(!found){const empty=document.createElement("p");empty.className="toc-empty";empty.textContent="No matching chapters.";tocList.append(empty)}
};
tocSearch.addEventListener("input",drawToc);drawToc();
const progressMap=loadJSON(progressKey,{});
const saved=progressMap[book.id];
let ready=false,saveQueued=false;
const percent=()=>{const max=Math.max(0,document.documentElement.scrollHeight-innerHeight);return max>0?Math.min(1,Math.max(0,scrollY/max)):1};
const updateProgress=()=>{
const ratio=percent(),bar=$("scroll-progress");bar.style.width=(ratio*100).toFixed(2)+"%";bar.setAttribute("aria-valuenow",String(Math.round(ratio*100)));
if(!ready)return;
progressMap[book.id]={chapter:ordinal,key:chapter.key||null,ratio:Number(ratio.toFixed(5)),updated:Date.now()};
if(!saveQueued){saveQueued=true;setTimeout(()=>{saveJSON(progressKey,progressMap);saveQueued=false},400)}
};
window.addEventListener("scroll",updateProgress,{passive:true});window.addEventListener("resize",updateProgress,{passive:true});
window.addEventListener("pagehide",()=>{if(ready){progressMap[book.id]={chapter:ordinal,key:chapter.key||null,ratio:Number(percent().toFixed(5)),updated:Date.now()};saveJSON(progressKey,progressMap)}});
let controlsVisible=true;
const toggleControls=()=>{controlsVisible=!controlsVisible;document.body.classList.toggle("controls-hidden",!controlsVisible)};
article.addEventListener("click",e=>{
if(e.target.closest("a,button,input,select")||settingsDialog.open||tocDialog.open)return;
const selection=window.getSelection();if(selection&&String(selection).trim())return;
const x=e.clientX/innerWidth,y=e.clientY/innerHeight;
if(x>.2&&x<.8&&y>.12&&y<.88)toggleControls();
});
document.addEventListener("keydown",e=>{
if(e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||e.repeat||settingsDialog.open||tocDialog.open)return;
const tag=document.activeElement?.tagName||"";
if(["INPUT","SELECT","TEXTAREA","BUTTON"].includes(tag)||document.activeElement?.isContentEditable)return;
if(window.getSelection()?.toString())return;
if(e.key==="ArrowLeft"&&ordinal>1){location.href=readerLink(ordinal-1)}
if(e.key==="ArrowRight"&&ordinal<book.chapters.length){location.href=readerLink(ordinal+1)}
});
const sanitize=(node)=>{
if(node.nodeType===Node.TEXT_NODE)return document.createTextNode(node.nodeValue);
if(node.nodeType!==Node.ELEMENT_NODE)return document.createDocumentFragment();
const tag=node.tagName.toLowerCase();
if(["script","style","iframe","object","embed","form","input","button","svg","noscript","template","video","audio"].includes(tag))return document.createDocumentFragment();
const allowed=["p","br","strong","b","em","i","u","s","blockquote","h2","h3","h4","hr","ul","ol","li","a","div","span","img"];
const parent=allowed.includes(tag)?document.createElement(tag):document.createDocumentFragment();
if(tag==="a"){const href=node.getAttribute("href");if(href){try{const url=new URL(href,chapterURL);if(["https:","http:"].includes(url.protocol))parent.href=url.href}catch(e){}}}
if(tag==="img"){const src=node.getAttribute("src");if(src){try{const url=new URL(src,chapterURL);if(["https:","http:"].includes(url.protocol)){parent.src=url.href;parent.alt=node.alt||"";parent.loading="lazy"}}catch(e){}}}
node.childNodes.forEach(child=>parent.append(sanitize(child)));
return parent;
};
async function loadChapter(){
try{
const response=await fetch(chapterURL.href,{credentials:"same-origin"});
if(!response.ok)throw new Error("HTTP "+response.status);
const doc=new DOMParser().parseFromString(await response.text(),"text/html");
const source=doc.querySelector(".chapter-content")||doc.querySelector("#chapter-content")||(chapter.format==="jekyll"?doc.body:null);
if(!source)throw new Error("Could not locate chapter text");
const pageTitle=doc.querySelector("title")?.textContent?.trim();
if(pageTitle){$("chapter-title").textContent=pageTitle;$("bar-chapter").textContent=pageTitle;document.title=pageTitle+" | "+book.title+" | NovelHub"}else{document.title=$("chapter-title").textContent+" | "+book.title+" | NovelHub"}
article.replaceChildren();
source.childNodes.forEach(node=>article.append(sanitize(node)));
if(!article.textContent?.trim())throw new Error("Chapter is empty");
requestAnimationFrame(()=>requestAnimationFrame(()=>{
if(saved&&((saved.key&&chapter.key&&saved.key===chapter.key)||(!saved.key&&saved.chapter===ordinal))&&Number.isFinite(saved.ratio)&&saved.ratio>0){window.scrollTo(0,Math.max(0,document.documentElement.scrollHeight-innerHeight)*Math.min(1,saved.ratio))}
ready=true;updateProgress();
}));
}catch(e){error("Unable to load this chapter. Please try reloading the page.");console.error("NovelHub reader:",e)}
}
loadChapter();
})();