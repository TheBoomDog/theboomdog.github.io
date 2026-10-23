// Match the homepage to the shared book catalog when chapters are published.
(() => {
  const books = window.NOVELHUB_BOOKS;
  const book = Array.isArray(books) && books.find(x => x.id === "malfoid");
  if (!book || !book.chapters || !book.chapters.length) return;
  const card = document.querySelector('[data-id="malfoid"]');
  if (!card) return;
  card.dataset.status = "available";
  const status = card.querySelector(".status");
  if (status) status.textContent = "Available";
  const meta = card.querySelectorAll(".meta span");
  if (meta.length > 1) meta[1].textContent = book.chapters.length + " chapters";
  const actions = card.querySelector(".card-actions");
  if (actions) {
    const start = document.createElement("a");
    start.href = book.chapters[0].href;
    start.textContent = "Start reading ↗";
    const chapters = document.createElement("a");
    chapters.href = "book.html?id=malfoid";
    chapters.textContent = "Chapters";
    actions.replaceChildren(start,chapters);
  }
})();