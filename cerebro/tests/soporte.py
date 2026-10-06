"""Base de los tests: CEREBRO_DIR en un directorio temporal (nunca el Cerebro real) y embedder falso."""
from __future__ import annotations

import contextlib
import io
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

CEREBRO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(CEREBRO))

import cerebro  # noqa: E402
from embedders import Falso  # noqa: E402

NOTA = """---
proyecto: {proyecto}
tipo: {tipo}
fecha: 2026-10-06
fuente: {proyecto}/sdd/loops/x.md
tags: [loops, arnés]
---
# {titulo}

{cuerpo}
"""


class Contador(Falso):
    """Falso que cuenta cuántos textos le pidieron embeber."""

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.textos = 0

    def embed(self, textos):
        self.textos += len(textos)
        return super().embed(textos)


class Constante(Falso):
    """Todos los vectores iguales: el coseno no distingue nada; lo que gane, lo ganó FTS5."""

    def embed(self, textos):
        return [[1.0] * self.dim for _ in textos]


class ConCerebro(unittest.TestCase):
    """Cada test tiene su propio CEREBRO_DIR temporal, dentro de una carpeta `afuera` para ver escapes."""

    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.afuera = Path(self._tmp.name).resolve()
        self.base = self.afuera / "Cerebro"
        self.base.mkdir()
        env = mock.patch.dict(os.environ, {"CEREBRO_DIR": str(self.base), "CEREBRO_EMBEDDINGS": "falso"})
        env.start()
        self.addCleanup(env.stop)
        self.addCleanup(self._tmp.cleanup)

    def nota(self, proyecto: str, nombre: str, titulo: str, cuerpo: str, tipo: str = "leccion") -> Path:
        ruta = self.base / "proyectos" / proyecto / nombre
        ruta.parent.mkdir(parents=True, exist_ok=True)
        ruta.write_text(NOTA.format(proyecto=proyecto, tipo=tipo, titulo=titulo, cuerpo=cuerpo), encoding="utf-8")
        return ruta

    def cli(self, *args: str, embedder=None) -> tuple[int, str, str]:
        out, err = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = cerebro.main(list(args), embedder=embedder)
        return code, out.getvalue(), err.getvalue()

    def archivos_afuera(self) -> list[Path]:
        """Todo lo que existe en el temporal fuera de CEREBRO_DIR."""
        return [p for p in self.afuera.rglob("*") if p != self.base and self.base not in p.parents]
