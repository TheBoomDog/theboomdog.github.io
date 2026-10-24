"""The catalog grows by adding sources, not by changing website page code."""
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from build_catalog import bundle, sources


class CatalogBuilderTests(unittest.TestCase):
    def test_any_new_novel_source_is_discovered_automatically(self):
        with tempfile.TemporaryDirectory() as directory:
            site = Path(directory)
            data = site / "data"
            data.mkdir()
            (data / "books.js").write_text(
                'window.NOVELHUB_BOOKS=[{id:"first",chapters:[{href:"read-1"}]}];',
                encoding="utf-8"
            )
            (data / "another-author.js").write_text(
                '(function(){window.NOVELHUB_BOOKS.push('
                '{id:"entirely-new-novel",chapters:[{href:"read-2"}]});})();',
                encoding="utf-8"
            )
            (data / "rankings.js").write_text(
                'window.NOVELHUB_RANKINGS = {status:"ready"};',encoding="utf-8"
            )
            (data / "analytics-config.js").write_text(
                'window.NOVELHUB_ANALYTICS={goatcounterCode:"testing"};',
                encoding="utf-8"
            )
            actual = [item.name for item in sources(site)]
            self.assertEqual(actual, ["books.js", "another-author.js"])
            output = data / "catalog.js"
            output.write_text(bundle(site), encoding="utf-8")
            code = ("const fs=require('fs');const vm=require('vm');"
                    "let c={window:{}};"
                    "vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),c);"
                    "process.stdout.write(JSON.stringify(c.window.NOVELHUB_BOOKS.map(b=>b.id)));")
            proc = subprocess.run(
                ["node", "-e", code, str(output)], check=True,
                text=True, capture_output=True
            )
            self.assertEqual(
                json.loads(proc.stdout), ["first", "entirely-new-novel"]
            )
            self.assertNotIn("NOVELHUB_RANKINGS", output.read_text(encoding="utf-8"))
            self.assertNotIn("NOVELHUB_ANALYTICS", output.read_text(encoding="utf-8"))

if __name__ == "__main__":
    unittest.main()
