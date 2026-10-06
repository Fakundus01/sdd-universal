"""embedders.Local (fastembed): criterios 2, 4 y 5 de C-3. Lo unitario usa un cargador falso (sin red ni modelo);
la integración usa el modelo real y se saltea con motivo si `fastembed` no está instalado."""
from __future__ import annotations

import importlib.util
import math
import os
import sqlite3
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
        (self.cache / "models--qdrant--paraphrase-multilingual-MiniLM-L12-v2-onnx-Q" / "snapshots" / "abc").mkdir(parents=True)
        avisos: list[str] = []
        Local(cargar=cargador(Modelo()), avisar=avisos.append, cache=self.cache).embed(["hola"])
        self.assertEqual(avisos, [])

    def test_cache_con_otro_modelo_igual_avisa(self):
        (self.cache / "models--otro--modelo").mkdir(parents=True)
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
        self.assertIn("pip install -r cerebro/requirements.txt", str(ctx.exception))

    def test_el_cargador_real_le_pasa_modelo_y_cache_a_fastembed(self):
        pedido: dict = {}

        class TextEmbedding:
            def __init__(self, **kwargs) -> None:
                pedido.update(kwargs)

        falso = mock.Mock(TextEmbedding=TextEmbedding)
        with mock.patch.dict(sys.modules, {"fastembed": falso}):
            Local(avisar=lambda m: None, cache=self.cache).embed([])  # vacío: no carga
            self.assertEqual(pedido, {})
            Local(avisar=lambda m: None, cache=self.cache)._modelo_listo()
        self.assertEqual(pedido, {"model_name": embedders.MODELO_LOCAL, "cache_dir": str(self.cache)})

    def test_cache_por_defecto_y_variable_de_entorno(self):
        with mock.patch.dict(os.environ, {"CEREBRO_MODELOS": str(self.cache)}):
            self.assertEqual(embedders.dir_modelos(), self.cache)
        sin = {k: v for k, v in os.environ.items() if k != "CEREBRO_MODELOS"}
        with mock.patch.dict(os.environ, sin, clear=True):
            self.assertEqual(embedders.dir_modelos().parts[-2:], ("cerebro", "modelos"))
            self.assertNotEqual(embedders.dir_modelos().parent, Path(tempfile.gettempdir()))


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
