"""embedders.Local (fastembed): criterios 2, 4 y 5 de C-3. Lo unitario usa un cargador falso (sin red ni modelo);
la integración usa el modelo real y se saltea con motivo si `fastembed` no está instalado."""
from __future__ import annotations

import importlib.util
import math
import os
import contextlib
import io
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from soporte import ConCerebro

import embedders
from embedders import ErrorEmbedder, Local

HAY_FASTEMBED = importlib.util.find_spec("fastembed") is not None


class Modelo:
    """Lo mínimo de fastembed.TextEmbedding: embed(textos) devuelve un iterable de vectores."""

    def __init__(self, dim: int = 384) -> None:
        self.dim = dim
        self.pedidos: list[list[str]] = []

    def embed(self, textos):
        self.pedidos.append(list(textos))
        return ([float(i + 1)] * self.dim for i, _ in enumerate(self.pedidos[-1]))


def cargador(modelo: Modelo, llamadas: list | None = None):
    def cargar(nombre, cache):
        if llamadas is not None:
            llamadas.append((nombre, cache))
        return modelo

    return cargar


class TestLocalUnitario(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.cache = Path(self._tmp.name) / "modelos"

    def modelo_bajado(self) -> Path:
        snap = self.cache / "models--qdrant--paraphrase-multilingual-MiniLM-L12-v2-onnx-Q" / "snapshots" / "abc"
        snap.mkdir(parents=True)
        (snap / "model_optimized.onnx").write_bytes(b"x")
        return snap

    def test_nombre_y_dim_son_los_del_modelo_multilingue(self):
        e = Local()
        self.assertEqual(e.nombre, "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
        self.assertEqual(e.dim, 384)

    def test_crearlo_no_carga_nada(self):
        llamadas: list = []
        Local(cargar=cargador(Modelo(), llamadas), cache=self.cache)
        self.assertEqual(llamadas, [])

    def test_obtener_local_devuelve_local_sin_importar_fastembed(self):
        with mock.patch.dict(sys.modules, {"fastembed": None}):
            e = embedders.obtener("local")
        self.assertIsInstance(e, Local)
        self.assertEqual((e.nombre, e.dim), (embedders.MODELO_LOCAL, embedders.DIM_LOCAL))
        self.assertEqual(e.dim, 384)

    def test_embed_devuelve_listas_de_floats_y_carga_una_sola_vez(self):
        modelo, llamadas = Modelo(), []
        e = Local(cargar=cargador(modelo, llamadas), avisar=lambda m: None, cache=self.cache)
        v = e.embed(["uno", "dos"])
        self.assertEqual(len(v), 2)
        self.assertTrue(all(isinstance(x, list) and len(x) == 384 for x in v))
        self.assertTrue(all(isinstance(c, float) for c in v[0]))
        e.embed(["tres"])
        self.assertEqual(len(llamadas), 1)
        self.assertEqual(llamadas[0], (e.nombre, str(self.cache)))
        self.assertEqual(e.embed([]), [])

    def test_vector_de_otra_dimension_es_error(self):
        e = Local(cargar=cargador(Modelo(dim=10)), avisar=lambda m: None, cache=self.cache)
        with self.assertRaises(ErrorEmbedder) as ctx:
            e.embed(["hola"])
        self.assertIn("384", str(ctx.exception))

    def test_primera_corrida_avisa_nombre_y_peso(self):
        avisos: list[str] = []
        e = Local(cargar=cargador(Modelo()), avisar=avisos.append, cache=self.cache)
        e.embed(["hola"])
        self.assertEqual(len(avisos), 1)
        self.assertIn(e.nombre, avisos[0])
        self.assertIn("220 MB", avisos[0])
        self.assertIn("una sola vez", avisos[0])

    def test_con_el_modelo_en_cache_no_avisa(self):
        self.modelo_bajado()
        avisos: list[str] = []
        Local(cargar=cargador(Modelo()), avisar=avisos.append, cache=self.cache).embed(["hola"])
        self.assertEqual(avisos, [])

    def test_cache_con_otro_modelo_igual_avisa(self):
        otro = self.cache / "models--otro--modelo" / "snapshots" / "abc"
        otro.mkdir(parents=True)
        (otro / "model.onnx").write_bytes(b"x")
        avisos: list[str] = []
        Local(cargar=cargador(Modelo()), avisar=avisos.append, cache=self.cache).embed(["hola"])
        self.assertEqual(len(avisos), 1)

    def test_sin_red_error_claro(self):
        def sin_red(nombre, cache):
            raise OSError("getaddrinfo failed")

        e = Local(cargar=sin_red, avisar=lambda m: None, cache=self.cache)
        with self.assertRaises(ErrorEmbedder) as ctx:
            e.embed(["hola"])
        msg = str(ctx.exception)
        self.assertIn("internet", msg)
        self.assertIn(e.nombre, msg)
        self.assertNotIn("Traceback", msg)

    def test_sin_fastembed_error_con_el_comando_de_instalacion(self):
        e = Local(avisar=lambda m: None, cache=self.cache)
        with mock.patch.dict(sys.modules, {"fastembed": None}):
            with self.assertRaises(ErrorEmbedder) as ctx:
                e.embed(["hola"])
        msg = str(ctx.exception)
        self.assertTrue(msg.startswith("falta `fastembed`"), msg)
        self.assertIn("pip install -r cerebro/requirements.txt", msg)
        self.assertNotIn("internet", msg)

    def test_aviso_sale_antes_de_la_carga_del_modelo(self):
        eventos: list[str] = []

        def cargar(nombre, cache):
            eventos.append("carga")
            return Modelo()

        e = Local(cargar=cargar, avisar=lambda m: eventos.append("aviso"), cache=self.cache)
        e.embed(["hola"])
        self.assertEqual(eventos, ["aviso", "carga"])

    def test_aviso_sale_aunque_la_carga_falle(self):
        avisos: list[str] = []

        def sin_red(nombre, cache):
            raise OSError("sin red")

        with self.assertRaises(ErrorEmbedder):
            Local(cargar=sin_red, avisar=avisos.append, cache=self.cache).embed(["hola"])
        self.assertEqual(len(avisos), 1)

    def test_el_aviso_va_a_stderr_y_stdout_queda_limpio(self):
        out, err = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            Local(cargar=cargador(Modelo()), cache=self.cache).embed(["hola"])
        self.assertEqual(out.getvalue(), "")
        self.assertIn(embedders.MODELO_LOCAL, err.getvalue())

    def test_importar_el_nucleo_no_importa_fastembed(self):
        codigo = ("import sys; sys.path.insert(0, sys.argv[1]); import embedders, indice, notas, cerebro; "
                  "embedders.obtener('local'); assert 'fastembed' not in sys.modules, 'fastembed importado'")
        r = subprocess.run([sys.executable, "-I", "-c", codigo, str(Path(embedders.__file__).parent)],
                           capture_output=True, text=True, timeout=60)
        self.assertEqual(r.returncode, 0, r.stderr)

    def test_snapshots_vacio_o_sin_onnx_no_cuenta_como_bajado(self):
        snap = self.modelo_bajado()
        (snap / "model_optimized.onnx").unlink()
        for caso in ("sin onnx", "otros archivos sin onnx", "snapshots vacio"):
            with self.subTest(caso):
                if caso == "otros archivos sin onnx":
                    (snap / "config.json").write_text("{}", encoding="utf-8")
                    (snap / "tokenizer.json").write_text("{}", encoding="utf-8")
                if caso == "snapshots vacio":
                    for f in snap.iterdir():
                        f.unlink()
                avisos: list[str] = []
                Local(cargar=cargador(Modelo()), avisar=avisos.append, cache=self.cache).embed(["hola"])
                self.assertEqual(len(avisos), 1)

    def test_convierte_cualquier_secuencia_numerica_a_lista_de_floats(self):
        class Enteros(Modelo):
            def embed(self, textos):
                return [tuple([1] * 384) for _ in textos]

        v = Local(cargar=cargador(Enteros()), avisar=lambda m: None, cache=self.cache).embed(["a"])[0]
        self.assertIsInstance(v, list)
        self.assertTrue(all(type(x) is float for x in v))

    def test_distinta_cantidad_de_vectores_es_error(self):
        class Corto(Modelo):
            def embed(self, textos):
                return list(super().embed(textos))[:-1]

        e = Local(cargar=cargador(Corto()), avisar=lambda m: None, cache=self.cache)
        with self.assertRaises(ErrorEmbedder):
            e.embed(["uno", "dos"])

    def test_un_solo_vector_de_dimension_mezclada_es_error(self):
        class Mezclado(Modelo):
            def embed(self, textos):
                return [[1.0] * 384, [1.0] * 10]

        e = Local(cargar=cargador(Mezclado()), avisar=lambda m: None, cache=self.cache)
        with self.assertRaises(ErrorEmbedder):
            e.embed(["uno", "dos"])

    def test_la_variable_de_symlinks_se_fija_antes_del_import_y_respeta_la_del_usuario(self):
        vista: dict = {}

        class Modulo:
            @property
            def TextEmbedding(self):  # se evalúa recién en el `from fastembed import`
                vista["al_importar"] = os.environ.get("HF_HUB_DISABLE_SYMLINKS_WARNING")
                return lambda **kw: None

        sin = {k: v for k, v in os.environ.items() if k != "HF_HUB_DISABLE_SYMLINKS_WARNING"}
        with mock.patch.dict(os.environ, sin, clear=True), mock.patch.dict(sys.modules, {"fastembed": Modulo()}):
            embedders._importar_fastembed()
        self.assertEqual(vista["al_importar"], "1")
        with mock.patch.dict(os.environ, {"HF_HUB_DISABLE_SYMLINKS_WARNING": "0"}),                 mock.patch.dict(sys.modules, {"fastembed": Modulo()}):
            embedders._importar_fastembed()
            self.assertEqual(vista["al_importar"], "0")


class TestMetaConLocal(ConCerebro):
    def test_el_indice_guarda_modelo_y_dim_del_local(self):
        self.nota("proy", "n.md", "Nota", "Algo de texto sobre el ciclo.")
        e = Local(cargar=cargador(Modelo()), avisar=lambda m: None, cache=self.afuera / "m")
        code, _, err = self.cli("indexar", embedder=e)
        self.assertEqual(code, 0, err)
        con = sqlite3.connect(self.base / ".cerebro" / "indice.sqlite")
        self.addCleanup(con.close)
        self.assertEqual(dict(con.execute("SELECT clave, valor FROM meta")),
                         {"modelo": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2", "dim": "384"})


def coseno(a, b) -> float:
    return sum(x * y for x, y in zip(a, b)) / (math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b)))


@unittest.skipUnless(HAY_FASTEMBED, "fastembed no está instalado: la constante de huggingface_hub solo se mide con él")
class TestSymlinksHF(unittest.TestCase):
    def test_huggingface_hub_ve_la_variable_tras_importar_fastembed(self):
        codigo = ("import os, sys; sys.path.insert(0, sys.argv[1]); os.environ.pop('HF_HUB_DISABLE_SYMLINKS_WARNING', None); "
                  "import embedders; embedders._importar_fastembed(); import huggingface_hub.constants as c; "
                  "assert c.HF_HUB_DISABLE_SYMLINKS_WARNING is True, c.HF_HUB_DISABLE_SYMLINKS_WARNING")
        r = subprocess.run([sys.executable, "-I", "-c", codigo, str(Path(embedders.__file__).parent)],
                           capture_output=True, text=True, timeout=120)
        self.assertEqual(r.returncode, 0, r.stderr)


@unittest.skipUnless(HAY_FASTEMBED, "fastembed no está instalado: `python -m venv cerebro/.venv` y "
                                    "`cerebro/.venv/Scripts/pip install -r cerebro/requirements.txt`")
class TestLocalIntegracion(unittest.TestCase):
    """Modelo real: la primera corrida lo baja (~220 MB) a `CEREBRO_MODELOS` o `~/.cache/cerebro/modelos`."""

    def test_mismo_sentido_con_otras_palabras_queda_mas_cerca_que_una_frase_ajena(self):
        e = Local()
        a, b, ajena = e.embed([
            "El agente copió un archivo para que pasara la verificación",
            "La IA duplicó un fichero con tal de que el chequeo diera verde",
            "Mañana a la tarde llueve en Mendoza y hace frío",
        ])
        self.assertEqual(len(a), e.dim)
        self.assertGreater(coseno(a, b), coseno(a, ajena) + 0.15)
        self.assertGreater(coseno(a, b), coseno(b, ajena) + 0.15)


if __name__ == "__main__":
    unittest.main()
