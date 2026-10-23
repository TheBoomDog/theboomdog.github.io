#!/usr/bin/env python3
"""Import completed Malfoid chapters into the NovelHub GitHub Pages repository.

Run locally with copies of BOTH repositories on your computer:
  py scripts/import_malfoid.py --source "C:\path\to\Malfoid"
or:
  python3 scripts/import_malfoid.py --source ../Malfoid

Only Books 1-4 are imported by default. Never copies reference PDFs, GPT
notes, outlines, or Book 5-7 placeholders. Review the generated files before
committing to your public website repository.
"""
import argparse
import json
import re
from pathlib import Path

INDEX_ENTRY = re.compile(r"^-\s+\[(.+?)\]\((book-(\d+)/chapters/([^)]*\.md))\)\s*$", re.M)
NAVIGATION = re.compile(
    r"\n?<!-- MALFOID_CHAPTER_NAV_START -->[\s\S]*?"
    r"<!-- MALFOID_CHAPTER_NAV_END -->\s*$"
)
VOLUME_NAMES = {
    1: "Sorcerer's Stone",
    2: "Chamber of Secrets",
    3: "Prisoner of Azkaban",
    4: "Goblet of Fire",
}
DATA_MARKER = "// Auto-generated from the local Malfoid manuscript by scripts/import_malfoid.py.\n"


def import_books(source: Path, website: Path, books: list[int]) -> int:
    draft_dir = source / "drafts"
    if not draft_dir.is_dir():
        raise SystemExit(f"Missing manuscript drafts directory: {draft_dir}")
    chapters = []
    volumes = []
    seen = set()
    output_files = []
    for book_number in books:
        index_path = draft_dir / f"book-{book_number}.md"
        if not index_path.is_file():
            raise SystemExit(f"Missing manuscript index: {index_path}")
        index = index_path.read_text(encoding="utf-8-sig")
        found = list(INDEX_ENTRY.finditer(index))
        if not found:
            raise SystemExit(f"No chapter links found in {index_path}")
        volumes.append({"number": book_number, "name": f"Book {book_number} — {VOLUME_NAMES[book_number]}"})
        for local_number, match in enumerate(found, 1):
            title, relative, group, filename = match.groups()
            if int(group) != book_number:
                raise SystemExit(f"Wrong book in chapter link: {relative}")
            chapter_file = (draft_dir / relative).resolve()
            if not chapter_file.is_relative_to(draft_dir.resolve()):
                raise SystemExit(f"Unsafe manuscript path: {relative}")
            if not chapter_file.is_file():
                raise SystemExit(f"Chapter missing: {chapter_file}")
            body = chapter_file.read_text(encoding="utf-8-sig")
            body = NAVIGATION.sub("", body)
            body = re.sub(r"\A#\s+[^\n]+\r?\n+", "", body, count=1)
            body = body.strip()
            if len(body) < 1000:
                raise SystemExit(f"Refusing to import chapter placeholder: {chapter_file}")
            destination = website / "Novels" / "Malfoid" / f"book-{book_number}" / filename
            chapter_key = (book_number, filename)
            if chapter_key in seen:
                raise SystemExit(f"Duplicate chapter: {chapter_file}")
            seen.add(chapter_key)
            # Jekyll turns Markdown with front matter into HTML at the same path.
            site_document = "---\nlayout: null\nrender_with_liquid: false\n---\n\n" + body + "\n"
            output_files.append((destination, site_document))
            ordinal = len(chapters) + 1
            label = f"Book {book_number} · {('Epilogue' if title.lower() == 'epilogue' else f'Chapter {local_number}')}"
            chapters.append({
                "number": ordinal,
                "label": label,
                "title": title,
                "volume": book_number,
                "format": "jekyll",
                "source": f"Novels/Malfoid/book-{book_number}/{Path(filename).stem}.html",
                "href": f"reader.html?id=malfoid&chapter={ordinal}",
            })

    record = {
        "id": "malfoid",
        "title": "Malfoid",
        "status": "In progress",
        "genres": ["Fantasy", "Fanfiction", "Romance"],
        "description": "A Harry Potter fan rewrite featuring a gender-swapped Draco Malfoy.",
        "cover": {"start": "#38483a", "end": "#13221b", "ink": "#e5cc9f"},
        "volumes": volumes,
        "chapters": chapters,
    }
    catalog = DATA_MARKER + "(function () {\n" + "  const book = " + json.dumps(record, ensure_ascii=False, indent=2) + ";\n"
    catalog += (
        "  const books = window.NOVELHUB_BOOKS;\n"
        "  if (!Array.isArray(books)) return;\n"
        "  const index = books.findIndex(item => item.id === book.id);\n"
        "  if (index < 0) books.push(book);\n"
        "  else books[index] = book;\n"
        "})();\n"
    )
    output_files.append((website / "data" / "malfoid.js", catalog))
    for destination, contents in output_files:
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(contents, encoding="utf-8")
    print(f"Imported {len(chapters)} chapters from {len(volumes)} books.")
    print(f"Created or updated {len(output_files)} files in {website}.")
    print("Review the changes, then commit and push the website repository.")
    return len(chapters)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, type=Path, help="Path to your local private Malfoid repository")
    parser.add_argument("--site", type=Path, default=Path(__file__).resolve().parents[1],
                        help="Path to the NovelHub GitHub Pages repository (default: this script's parent repository)")
    parser.add_argument("--books", nargs="+", type=int, default=[1, 2, 3, 4], help="Book numbers (default: 1 2 3 4)")
    args = parser.parse_args()
    if not args.books or any(n not in VOLUME_NAMES for n in args.books) or len(set(args.books)) != len(args.books):
        parser.error("Choose unique book numbers among 1, 2, 3, 4; other books contain placeholders.")
    import_books(args.source.expanduser().resolve(), args.site.expanduser().resolve(), sorted(args.books))


if __name__ == "__main__":
    main()
