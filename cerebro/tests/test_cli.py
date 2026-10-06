"""cerebro.py de punta a punta: init, revisar, indexar, buscar --json, nota y errores sin traceback."""
from __future__ import annotations

import json
import os
import subprocess
import sys
import unittest
from pathlib import Path
from unittest import mock

from soporte import CEREBRO, ConCerebro, Contador

import config
import embedders
from embedders import ErrorEmbedder, Falso
from indice import Indice


class TestConfig(unittest.TestCase):
    def test_cerebro_dir_del_entorno_o_documents(self):
        with mock.patch.dict(os.environ, {"CEREBRO_DIR": "X:/algun/lado"}):
            self.assertEqual(config.cerebro_dir(), Path("X:/algun/lado"))
        sin = {k: v for k, v in os.environ.items() if k != "CEREBRO_DIR"}
        sin["USERPROFILE"] = "U:/perfil"
        with mock.patch.dict(os.environ, sin, clear=True):
            self.assertEqual(config.cerebro_dir(), Path("U:/perfil") / "Documents" / "Cerebro")
        with mock.patch.dict(os.environ, {"CEREBRO_DIR": "   "}):
            self.assertEqual(config.cerebro_dir().name, "Cerebro")

    def test_modo_embeddings(self):
        with mock.patch.dict(os.environ, {"CEREBRO_EMBEDDINGS": " Falso "}):
            self.assertEqual(config.modo_embeddings(), "falso")
        sin = {k: v for k, v in os.environ.items() if k != "CEREBRO_EMBEDDINGS"}
        with mock.patch.dict(os.environ, sin, clear=True):
            self.assertEqual(config.modo_embeddings(), "local")

    def test_ruta_del_indice(self):
        self.assertEqual(config.ruta_indice(Path("B")), Path("B") / ".cerebro" / "indice.sqlite")

    def test_obtener_embedder(self):
        self.assertIsInstance(embedders.obtener("falso"), Falso)
        for modo in ("nose", ""):
            with self.subTest(modo=modo):
                with self.assertRaises(ErrorEmbedder) as ctx:
                    embedders.obtener(modo)
                self.assertIn("CEREBRO_EMBEDDINGS", str(ctx.exception))


class TestCLI(ConCerebro):
    def test_init_crea_y_dos_veces_no_pisa(self):
        code, out, _ = self.cli("init")
        self.assertEqual(code, 0)
        self.assertTrue((self.base / "proyectos").is_dir())
        leeme = self.base / "LEEME.md"
        leeme.write_text("mío", encoding="utf-8")
        code, out, _ = self.cli("init")
        self.assertEqual(code, 0)
        self.assertEqual(leeme.read_text(encoding="utf-8"), "mío")
        self.assertIn("ya existía", out)
        self.assertEqual(self.archivos_afuera(), [])

    def test_revisar(self):
        self.cli("init")
        self.nota("p", "buena.md", "Buena", "x")
        code, out, _ = self.cli("revisar")
        self.assertEqual(code, 0, out)
        self.assertIn("1 nota", out)
        mala = self.base / "proyectos" / "p" / "mala.md"
        mala.write_text("---\nproyecto: p\ntipo: receta\nfecha: 2026-10-06\nfuente: x\n---\n# M\n", encoding="utf-8")
        code, out, _ = self.cli("revisar")
        self.assertNotEqual(code, 0)
        self.assertIn("proyectos/p/mala.md: tipo:", out)

    def test_indexar_buscar_json(self):
        self.cli("init")
        self.nota("sdd-universal", "a.md", "UnboundLocalError en el hook", "La variable no estaba asignada.")
        self.nota("turnos", "b.md", "Grilla", "Flexbox y colores.", tipo="decision")
        emb = Contador()
        code, out, err = self.cli("indexar", embedder=emb)
        self.assertEqual(code, 0, err)
        self.assertIn("2 nuevas", out)
        code, out, _ = self.cli("buscar", "UnboundLocalError", "--json", embedder=emb)
        self.assertEqual(code, 0)
        res = json.loads(out)
        self.assertIsInstance(res, list)
        self.assertEqual(res[0]["ruta"], "proyectos/sdd-universal/a.md")
        self.assertEqual(set(res[0]), {"titulo", "ruta", "proyecto", "tipo", "fuente", "fragmento", "puntaje"})
        code, out, _ = self.cli("buscar", "UnboundLocalError", "--json", "--proyecto", "turnos", embedder=emb)
        self.assertEqual([r["ruta"] for r in json.loads(out)], ["proyectos/turnos/b.md"])
        code, out, _ = self.cli("buscar", "UnboundLocalError", "--json", "--tipo", "leccion", "-k", "1", embedder=emb)
        self.assertEqual([r["ruta"] for r in json.loads(out)], ["proyectos/sdd-universal/a.md"])
        code, out, _ = self.cli("buscar", "UnboundLocalError", "--tipo", "receta", embedder=emb)
        self.assertNotEqual(code, 0)

    def test_buscar_texto_marca_dato_recuperado_y_fuente(self):
        self.cli("init")
        self.nota("p", "a.md", "UnboundLocalError en el hook", "x")
        self.cli("indexar")
        code, out, _ = self.cli("buscar", "UnboundLocalError")
        self.assertEqual(code, 0)
        self.assertIn("R26", out)
        self.assertIn("fuente: p/sdd/loops/x.md", out)
        self.assertIn("proyectos/p/a.md", out)

    def test_indexar_todo(self):
        self.cli("init")
        self.nota("p", "a.md", "A", "x")
        emb = Contador()
        self.cli("indexar", embedder=emb)
        self.cli("indexar", embedder=emb)
        self.assertEqual(emb.textos, 1)
        code, out, _ = self.cli("indexar", "--todo", embedder=emb)
        self.assertEqual(code, 0)
        self.assertEqual(emb.textos, 2)

    def test_cambio_de_embedder_error_claro_sin_traceback(self):
        self.cli("init")
        self.nota("p", "a.md", "A", "x")
        self.cli("indexar", embedder=Falso(dim=16))
        for args in (["indexar"], ["buscar", "x"]):
            with self.subTest(args=args):
                code, out, err = self.cli(*args, embedder=Falso(dim=32))
                self.assertEqual(code, 2)
                self.assertIn("indexar --todo", err)
                self.assertNotIn("Traceback", out + err)

    def test_proceso_real_sin_traceback(self):
        """El mismo error corriendo el script como lo corre el usuario (con el modo del entorno)."""
        self.cli("init")
        self.nota("p", "a.md", "A", "x")
        self.cli("indexar", embedder=Falso(dim=16, nombre="otro"))
        env = dict(os.environ, CEREBRO_DIR=str(self.base), CEREBRO_EMBEDDINGS="falso", PYTHONIOENCODING="utf-8")
        for args in (["indexar"], ["buscar", "x"]):
            with self.subTest(args=args):
                p = subprocess.run([sys.executable, str(CEREBRO / "cerebro.py"), *args], capture_output=True,
                                   text=True, encoding="utf-8", env=env, timeout=60)
                self.assertEqual(p.returncode, 2, p.stdout + p.stderr)
                self.assertIn("indexar --todo", p.stderr)
                self.assertNotIn("Traceback", p.stdout + p.stderr)
        with Indice(config.ruta_indice(self.base), Falso(dim=16, nombre="otro")) as ind:
            self.assertTrue(ind.buscar("x"), "el índice viejo sigue intacto")

    def test_modo_desconocido_error_claro(self):
        self.cli("init")
        with mock.patch.dict(os.environ, {"CEREBRO_EMBEDDINGS": "nose"}):
            code, out, err = self.cli("indexar")
        self.assertEqual(code, 2)
        self.assertIn("CEREBRO_EMBEDDINGS", err)
        self.assertNotIn("Traceback", err)

    def test_buscar_sin_indice(self):
        code, out, err = self.cli("buscar", "x")
        self.assertEqual(code, 2)
        self.assertIn("indexar", err)

    def test_indexar_sin_init(self):
        vacio = self.base / "no-existe"
        with mock.patch.dict(os.environ, {"CEREBRO_DIR": str(vacio)}):
            code, out, err = self.cli("indexar")
        self.assertEqual(code, 2)
        self.assertIn("init", err)
        self.assertFalse(vacio.exists())

    def test_nota_escribe_y_no_pisa(self):
        self.cli("init")
        args = ["nota", "--proyecto", "sdd-universal", "--tipo", "leccion", "--titulo", "Una lección",
                "--fuente", "sdd-universal/x.md", "--tags", "a, b", "--cuerpo", "**Contexto:** algo.",
                "--fecha", "2026-10-06"]
        code, out, err = self.cli(*args)
        self.assertEqual(code, 0, err)
        ruta = self.base / "proyectos" / "sdd-universal" / "2026-10-06-una-leccion.md"
        self.assertIn(str(ruta), out)
        self.assertIn("tags: [a, b]", ruta.read_text(encoding="utf-8"))
        code, out, err = self.cli(*args[:-4], "--cuerpo", "otra", "--fecha", "2026-10-06")
        self.assertEqual(code, 2)
        self.assertIn("ya existe", err)
        self.assertIn("**Contexto:** algo.", ruta.read_text(encoding="utf-8"))
        code, _, _ = self.cli("revisar")
        self.assertEqual(code, 0)

    def test_nota_hostil_no_sale(self):
        self.cli("init")
        for proyecto in ("..", "../../afuera", str(self.afuera), "CON"):
            with self.subTest(proyecto=proyecto):
                self.cli("nota", "--proyecto", proyecto, "--tipo", "hallazgo", "--titulo", "../x",
                         "--fuente", "f", "--cuerpo", "c")
        self.assertEqual(self.archivos_afuera(), [])
        escritas = list((self.base / "proyectos").rglob("*.md"))
        self.assertTrue(escritas, "los nombres hostiles se sanean, no se pierden")
        self.assertTrue(all(p.parent.parent == self.base / "proyectos" for p in escritas), escritas)

    def test_sin_subcomando(self):
        with self.assertRaises(SystemExit) as ctx:
            self.cli()
        self.assertNotEqual(ctx.exception.code, 0)


if __name__ == "__main__":
    unittest.main()
