#!/usr/bin/env python3
"""Publish a weekly GoatCounter reader-visit snapshot for the NovelHub catalog.

Visits are counted per novel path (/novel/<book-id>) rather than per chapter.
GoatCounter deduplicates visits within a session; this is not a count of
verified unique individuals. The snapshot always covers the last completed
Monday 01:00 to Monday 01:00 interval in America/Chicago.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from datetime import datetime, time, timedelta, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

TZ = ZoneInfo("America/Chicago")
CODE_RE = re.compile(r"^[a-z0-9-]{2,50}$")


def completed_week(now: datetime | None = None) -> tuple[datetime, datetime]:
    now = (now or datetime.now(timezone.utc)).astimezone(TZ)
    day = now.date() - timedelta(days=now.weekday())
    monday = datetime.combine(day, time(1, 0), TZ)
    if now < monday:
        monday = datetime.combine(day - timedelta(days=7), time(1, 0), TZ)
    # Compute calendar weeks in Central Time, including DST transitions.
    return monday - timedelta(days=7), monday


def catalog_ids(site: Path) -> list[str]:
    """Execute the site's own trusted catalog JS, not copied/duplicated titles."""
    node = r"""
const fs = require('fs');
const vm = require('vm');
const site = process.argv[1];
const scope = {window: {NOVELHUB_BOOKS: []}};
for (const filename of ['data/books.js', 'data/malfoid.js']) {
  vm.runInNewContext(fs.readFileSync(site + '/' + filename, 'utf8'), scope, {filename});
}
const books = scope.window.NOVELHUB_BOOKS;
process.stdout.write(JSON.stringify(books.filter(
  b => b && typeof b.id === 'string' && /^[a-z0-9-]{1,80}$/.test(b.id) &&
  Array.isArray(b.chapters) && b.chapters.length > 0
).map(b => b.id)));
"""
    result = subprocess.run(
        ["node", "-e", node, str(site)], text=True, capture_output=True, check=True
    )
    ids = json.loads(result.stdout)
    if len(ids) != len(set(ids)):
        raise ValueError("The novel catalog contains duplicate IDs")
    return ids


def get_counts(code: str, token: str, book_ids: list[str],
               start: datetime, end: datetime) -> dict[str, int]:
    counts = {book_id: 0 for book_id in book_ids}
    for offset in range(0, len(book_ids), 100):
        batch = book_ids[offset:offset + 100]
        if not batch:
            continue
        paths = ["/novel/" + book_id for book_id in batch]
        args = [
            ("start", start.isoformat(timespec="seconds")),
            ("end", end.isoformat(timespec="seconds")),
            ("path_by_name", "true"),
            ("limit", "100"),
            *[("include_paths", path) for path in paths],
        ]
        endpoint = ("https://" + code + ".goatcounter.com/api/v0/stats/hits?"
                    + urlencode(args))
        request = Request(
            endpoint,
            headers={"Authorization": "Bearer " + token,
                     "Accept": "application/json",
                     "Content-Type": "application/json"},
        )
        try:
            with urlopen(request, timeout=30) as response:
                data = json.load(response)
        except HTTPError as exc:
            # Never log the Authorization header or API key. HTTP status and
            # GoatCounter's short error label are enough to diagnose failures.
            detail = ""
            try:
                problem = json.loads(exc.read(2048).decode("utf-8", errors="replace"))
                detail = str(problem.get("error", ""))[:160] if isinstance(problem, dict) else ""
                detail = detail.replace(token, "[redacted]")
            except (ValueError, OSError):
                pass
            hint = {
                400: "Request parameters rejected by GoatCounter",
                401: "API token is invalid or not authorized",
                403: "API token lacks statistics permissions",
                404: "GoatCounter site or statistics endpoint not found",
            }.get(exc.code, "GoatCounter API returned an error")
            raise RuntimeError(
                f"GoatCounter HTTP {exc.code}: {hint}" + (f" ({detail})" if detail else "")
            ) from exc
        except URLError as exc:
            raise RuntimeError("Could not reach GoatCounter over HTTPS") from exc
        if not isinstance(data.get("hits"), list):
            raise ValueError("Unexpected analytics API response: no hits list")
        for hit in data["hits"]:
            path, count = hit.get("path"), hit.get("count")
            if (path in paths and type(count) is int and count >= 0
                    and not hit.get("event", False)):
                counts[path.removeprefix("/novel/")] += count
    return counts


def build_snapshot(book_ids: list[str], counts: dict[str, int],
                   start: datetime, end: datetime) -> dict:
    sorted_ids = sorted(book_ids, key=lambda i: (-counts.get(i, 0), i))
    entries = [
        {"id": book_id, "visits": counts.get(book_id, 0),
         "rank": position if position <= 10 and counts.get(book_id, 0) > 0 else None}
        for position, book_id in enumerate(sorted_ids, 1)
    ]
    return {
        "status": "ready",
        "metric": "visits",
        "timezone": "America/Chicago",
        "periodStart": start.isoformat(timespec="seconds"),
        "periodEnd": end.isoformat(timespec="seconds"),
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "entries": entries,
    }


def main() -> int:
    site = Path(__file__).resolve().parents[1]
    code = os.environ.get("GOATCOUNTER_CODE", "").strip().lower()
    token = os.environ.get("GOATCOUNTER_API_TOKEN", "").strip()
    if not code:
        print("GOATCOUNTER_CODE is not configured; preserving empty rankings.")
        return 0
    if not CODE_RE.fullmatch(code):
        raise ValueError("GOATCOUNTER_CODE must be your GoatCounter site's subdomain")
    config = ("// Public analytics site code. API credentials remain in Actions secrets.\n"
              + "window.NOVELHUB_ANALYTICS = "
              + json.dumps({"goatcounterCode": code}) + ";\n")
    if not token:
        (site / "data/analytics-config.js").write_text(config, encoding="utf-8")
        print("Analytics script configured; API token missing, so rankings are unchanged.")
        return 0
    books = catalog_ids(site)
    start, end = completed_week()
    if not books:
        print("No published novels in the catalog; no rankings to publish.")
        return 0
    counts = get_counts(code, token, books, start, end)
    snapshot = build_snapshot(books, counts, start, end)
    content = ("// Generated reader visit counts for the last completed Central week.\n"
               + "window.NOVELHUB_RANKINGS = "
               + json.dumps(snapshot, ensure_ascii=False, indent=2) + ";\n")
    # Only write live config after successful analytics retrieval.
    (site / "data/analytics-config.js").write_text(config, encoding="utf-8")
    (site / "data/rankings.js").write_text(content, encoding="utf-8")
    print("Weekly reader rankings updated from " + str(start) + " to " + str(end))
    print("Counted " + str(len(books)) + " published novels.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError, RuntimeError) as exc:
        print("Analytics refresh failed: " + str(exc), file=sys.stderr)
        sys.exit(1)
