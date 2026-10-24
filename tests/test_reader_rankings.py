"""Offline tests: do not contact GoatCounter or publish synthetic statistics."""
import io
import json
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from update_reader_rankings import completed_week, catalog_ids, get_counts, build_snapshot


class ReaderRankingTests(unittest.TestCase):
    def test_catalog_detects_any_number_of_novels(self):
        import tempfile
        with tempfile.TemporaryDirectory() as temp:
            site = Path(temp)
            (site / "data").mkdir()
            (site / "data/catalog.js").write_text(
                'window.NOVELHUB_BOOKS = ['
                '{id:"alpha",chapters:[{href:"read-a"}]},'
                '{id:"beta",chapters:[{href:"read-b"}]},'
                '{id:"unpublished",chapters:[]}'
                '];',
                encoding="utf-8"
            )
            self.assertEqual(catalog_ids(site), ["alpha", "beta"])

    def test_live_catalog_has_published_novels(self):
        site = Path(__file__).resolve().parents[1]
        self.assertGreater(len(catalog_ids(site)), 0)

    def test_completed_week_respects_central_daylight_time(self):
        after = datetime(2026, 3, 9, 7, 15, tzinfo=timezone.utc)
        start, end = completed_week(after)
        self.assertEqual(start.isoformat(), "2026-03-02T01:00:00-06:00")
        self.assertEqual(end.isoformat(), "2026-03-09T01:00:00-05:00")

    def test_snapshots_rank_only_positive_visits(self):
        start, end = completed_week(datetime(2026, 10, 26, 8, tzinfo=timezone.utc))
        snapshot = build_snapshot(["mol", "malfoid", "empty"],
                                  {"mol": 3, "malfoid": 7, "empty": 0}, start, end)
        self.assertEqual(snapshot["entries"][0], {"id":"malfoid","rank":1})
        self.assertEqual(snapshot["entries"][1], {"id":"mol","rank":2})
        self.assertEqual(len(snapshot["entries"]), 2)
        self.assertNotIn("visits", str(snapshot))

    def test_more_than_ten_are_not_given_cover_numbers(self):
        ids = [f"book-{n}" for n in range(12)]
        start, end = completed_week()
        snapshot = build_snapshot(ids, {book: 1 for book in ids}, start, end)
        self.assertEqual(len(snapshot["entries"]), 10)
        self.assertTrue(all(1 <= entry["rank"] <= 10 for entry in snapshot["entries"]))

    def test_analytics_counts_use_one_path_per_novel(self):
        class Response(io.BytesIO):
            def __enter__(self): return self
            def __exit__(self, *args): self.close()
        def fake_open(req, timeout):
            self.assertIn("include_paths=%2Fnovel%2Fmol", req.full_url)
            self.assertIn("include_paths=%2Fnovel%2Fmalfoid", req.full_url)
            self.assertIn("Bearer ", req.get_header("Authorization"))
            return Response(json.dumps({"hits": [
                {"path":"/novel/mol","count":4,"event":False},
                {"path":"/novel/malfoid","count":11,"event":False},
                {"path":"/other","count":200,"event":False},
            ]}).encode())
        start, end = completed_week()
        with patch("update_reader_rankings.urlopen", side_effect=fake_open):
            counts = get_counts("novelhub", "fake-test-token", ["mol", "malfoid"], start, end)
        self.assertEqual(counts, {"mol":4, "malfoid":11})


if __name__ == "__main__":
    unittest.main()
