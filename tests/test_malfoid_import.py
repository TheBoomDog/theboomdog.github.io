"""Basic checks for publication filtering, without copying real manuscripts."""
import tempfile
import subprocess
import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from import_malfoid import import_books


class ImportMalfoidTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / "private"
        self.site = self.root / "public"
        (self.source / "drafts").mkdir(parents=True)
        self.site.mkdir()

    def add_chapter(self, book, prose):
        drafts = self.source / "drafts"
        chapters = drafts / f"book-{book}" / "chapters"
        chapters.mkdir(parents=True, exist_ok=True)
        (drafts / f"book-{book}.md").write_text(
            f"# Book {book}\n\n## Chapters\n"
            f"- [Chapter 1: A Test](book-{book}/chapters/01-a-test.md)\n",
            encoding="utf-8",
        )
        (chapters / "01-a-test.md").write_text(
            "# Chapter 1: A Test\n\n" + prose + "\n",
            encoding="utf-8",
        )

    def test_future_book_placeholder_is_not_published(self):
        self.add_chapter(1, "Original testing prose. " * 90)
        self.add_chapter(5, "<!-- navigation placeholder -->")
        total = import_books(self.source, self.site, [1, 5])
        self.assertEqual(total, 1)
        self.assertFalse((self.site / "Novels/Malfoid/book-5").exists())
        catalog = (self.site / "data/malfoid.js").read_text(encoding="utf-8")
        self.assertNotIn('Book 5 —', catalog)

    def test_future_book_is_included_when_substantial(self):
        self.add_chapter(1, "Original testing prose. " * 90)
        self.add_chapter(5, "A completely new chapter. " * 90)
        total = import_books(self.source, self.site, [1, 5])
        self.assertEqual(total, 2)
        self.assertTrue(
            (self.site / "Novels/Malfoid/book-5/01-a-test.md").exists()
        )
        catalog = (self.site / "data/malfoid.js").read_text(encoding="utf-8")
        self.assertIn("Book 5 —", catalog)
        self.assertIn("reader.html?id=malfoid&chapter=b5-01-a-test", catalog)

    def test_git_change_date_is_preserved(self):
        self.add_chapter(1, "Original testing prose. " * 90)
        for args in [
            ["git", "init", "-q"],
            ["git", "config", "user.email", "tests@example.com"],
            ["git", "config", "user.name", "Test runner"],
            ["git", "add", "drafts"],
            ["git", "commit", "-qm", "Add chapter"],
        ]:
            subprocess.run(args, cwd=self.source, check=True, capture_output=True)
        total = import_books(self.source, self.site, [1])
        self.assertEqual(total, 1)
        catalog = (self.site / "data/malfoid.js").read_text(encoding="utf-8")
        self.assertIn('"updatedAt":', catalog)
        self.assertIn('"key": "b1-01-a-test"', catalog)

    def test_existing_book_placeholder_is_an_error(self):
        self.add_chapter(1, "<!-- navigation placeholder -->")
        with self.assertRaises(SystemExit):
            import_books(self.source, self.site, [1])


if __name__ == "__main__":
    unittest.main()
