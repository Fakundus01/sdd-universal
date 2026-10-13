"""sync_graph.py de punta a punta: detecta drift, lo arregla con --accept, no rompe sin graph/."""
from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import sync_graph  # noqa: E402


class TestSyncGraph(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.root = Path(self._tmp.name)

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def check(self) -> int:
        return sync_graph.main(["--check", "--root", str(self.root)])

    def update(self, accept: bool = False) -> int:
        args = ["--update", "--root", str(self.root)]
        if accept:
            args.append("--accept")
        return sync_graph.main(args)

    def node(self, name: str = "area", rutas: str = "[area/**]") -> Path:
        path = self.root / "graph" / f"{name}.md"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(f"---\nid: {name}\nrutas: {rutas}\n---\n\n# {name}\n", encoding="utf-8")
        return path

    def code(self, rel: str, text: str = "x = 1\n") -> None:
        path = self.root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")

    def test_sin_graph_no_rompe(self):
        self.assertEqual(self.check(), 0)

    def test_nodo_nunca_sincronizado_falla_el_check(self):
        self.node()
        self.code("area/a.py")
        self.assertEqual(self.check(), 1)

    def test_update_sin_accept_no_escribe_nada(self):
        node = self.node()
        self.code("area/a.py")
        self.update(accept=False)
        self.assertNotIn("hash:", node.read_text(encoding="utf-8"))

    def test_update_accept_deja_el_check_en_verde(self):
        node = self.node()
        self.code("area/a.py")
        self.assertEqual(self.update(accept=True), 0)
        self.assertIn("hash:", node.read_text(encoding="utf-8"))
        self.assertEqual(self.check(), 0)

    def test_tocar_el_codigo_desincroniza_y_accept_lo_arregla_de_nuevo(self):
        self.node()
        self.code("area/a.py")
        self.update(accept=True)
        self.code("area/a.py", "x = 2\n")
        self.assertEqual(self.check(), 1)
        self.update(accept=True)
        self.assertEqual(self.check(), 0)

    def test_archivo_nuevo_bajo_la_ruta_tambien_desincroniza(self):
        self.node()
        self.code("area/a.py")
        self.update(accept=True)
        self.code("area/b.py")
        self.assertEqual(self.check(), 1)

    def test_archivo_borrado_bajo_la_ruta_tambien_desincroniza(self):
        self.node()
        self.code("area/a.py")
        self.code("area/b.py")
        self.update(accept=True)
        (self.root / "area" / "b.py").unlink()
        self.assertEqual(self.check(), 1)

    def test_ruta_sin_archivos_no_explota_y_se_informa(self):
        self.node()
        self.assertEqual(self.check(), 1)

    def test_md_sin_frontmatter_no_es_un_nodo(self):
        path = self.root / "graph" / "README.md"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("# graph/\n\nsin frontmatter, no es un nodo\n", encoding="utf-8")
        self.assertEqual(self.check(), 0)

    def test_frontmatter_sin_cerrar_se_informa_sin_romper_los_demas(self):
        path = self.root / "graph" / "roto.md"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("---\nid: roto\nrutas: [area/**]\n", encoding="utf-8")  # sin '---' de cierre
        self.node()
        self.code("area/a.py")
        self.assertEqual(self.check(), 1)

    def test_data_runtime_no_desincroniza(self):
        self.node()
        self.code("area/a.py")
        self.update(accept=True)
        self.code("area/.data/pg/base/1", "un postgres local escribe aca todo el tiempo")
        self.assertEqual(self.check(), 0)

    def test_meta_no_cuenta_como_nodo(self):
        meta = self.root / "graph" / "_meta" / "sync_graph.py"
        meta.parent.mkdir(parents=True, exist_ok=True)
        meta.write_text("# script\n", encoding="utf-8")
        self.assertEqual(self.check(), 0)

    def test_update_accept_preserva_crlf(self):
        path = self.root / "graph" / "area.md"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(b"---\r\nid: area\r\nrutas: [area/**]\r\n---\r\n\r\n# area\r\n")
        self.code("area/a.py")
        self.update(accept=True)
        raw = path.read_bytes()
        self.assertIn(b"\r\nhash: ", raw)
        self.assertEqual(raw.count(b"\n"), raw.count(b"\r\n"))  # ningún \n sin su \r: sigue siendo CRLF


if __name__ == "__main__":
    unittest.main()
