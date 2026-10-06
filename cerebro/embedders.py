"""Embedders: la interfaz común y el falso determinista de los tests.

Los reales (local con fastembed, OpenAI) importan sus dependencias de forma perezosa: el núcleo es solo stdlib.
"""
from __future__ import annotations

import hashlib
import math
import os
import re
import sys
import unicodedata
from pathlib import Path

MODOS = ("local", "openai", "falso")
_PALABRA = re.compile(r"\w+")


class ErrorEmbedder(Exception):
    pass


class Embedder:
    """`nombre` y `dim` quedan en el índice: si cambian, no se mezclan vectores (hay que `indexar --todo`)."""

    nombre: str = ""
    dim: int = 0

    def embed(self, textos: list[str]) -> list[list[float]]:
        raise NotImplementedError


def _normalizar(palabra: str) -> str:
    sin_tildes = unicodedata.normalize("NFKD", palabra.lower())
    return "".join(c for c in sin_tildes if not unicodedata.combining(c))


class Falso(Embedder):
    """Bolsa de palabras con hash a `dim` posiciones, normalizada. `sinonimos` lleva palabras a una canónica,
    para armar en los tests una búsqueda «por significado» sin modelos ni red."""

    def __init__(self, dim: int = 64, sinonimos: dict[str, str] | None = None, nombre: str = "falso") -> None:
        self.dim = dim
        self.nombre = nombre
        self.sinonimos = {_normalizar(k): _normalizar(v) for k, v in (sinonimos or {}).items()}

    def _vector(self, texto: str) -> list[float]:
        v = [0.0] * self.dim
        for palabra in _PALABRA.findall(texto):
            p = _normalizar(palabra)
            p = self.sinonimos.get(p, p)
            h = int.from_bytes(hashlib.sha256(p.encode("utf-8")).digest()[:8], "big")
            v[h % self.dim] += 1.0
        norma = math.sqrt(sum(x * x for x in v))
        return [x / norma for x in v] if norma else v

    def embed(self, textos: list[str]) -> list[list[float]]:
        return [self._vector(t) for t in textos]


MODELO_LOCAL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
DIM_LOCAL = 384
PESO_LOCAL = "unos 220 MB"
_HUELLA_CACHE = "paraphrase-multilingual-minilm-l12-v2"


def dir_modelos() -> Path:
    """Dónde vive el modelo bajado: `CEREBRO_MODELOS`, o `~/.cache/cerebro/modelos` (persistente: el default de
    fastembed es una carpeta temporal que el sistema borra, y el modelo se volvería a bajar)."""
    propio = os.environ.get("CEREBRO_MODELOS", "").strip()
    return Path(propio) if propio else Path.home() / ".cache" / "cerebro" / "modelos"


def _avisar_stderr(mensaje: str) -> None:
    print(mensaje, file=sys.stderr, flush=True)


def _importar_fastembed():
    """Importa fastembed. `huggingface_hub` lee `HF_HUB_DISABLE_SYMLINKS_WARNING` una sola vez, al importarse, así
    que la variable se fija ANTES del import (en Windows sin modo desarrollador el aviso de symlinks es solo ruido).
    `setdefault` respeta lo que el usuario ya traiga; queda fijada en el proceso, que es donde `huggingface_hub`
    la necesita."""
    os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")
    try:
        from fastembed import TextEmbedding
    except ImportError as e:
        raise ErrorEmbedder("falta `fastembed` para los embeddings locales: instalalo en un venv con "
                            "`pip install -r cerebro/requirements.txt` (o probá sin modelos con "
                            "CEREBRO_EMBEDDINGS=falso)") from e
    return TextEmbedding


def _cargar_fastembed(nombre: str, cache: str):
    return _importar_fastembed()(model_name=nombre, cache_dir=cache)


class Local(Embedder):
    """Embeddings locales con fastembed (ONNX, CPU, sin servidor). El modelo se baja la primera vez y se carga
    recién en el primer `embed`: crear el objeto no importa nada pesado. `cargar`/`avisar`/`cache` se inyectan
    en los tests."""

    nombre = MODELO_LOCAL
    dim = DIM_LOCAL

    def __init__(self, cargar=None, avisar=None, cache=None) -> None:
        self._cargar = cargar or _cargar_fastembed
        self._avisar = avisar or _avisar_stderr
        self._cache = Path(cache) if cache is not None else dir_modelos()
        self._modelo = None

    def _en_cache(self) -> bool:
        try:
            return any(_HUELLA_CACHE in d.name.lower() and any((d / "snapshots").glob("*/*.onnx"))
                       for d in self._cache.iterdir())
        except OSError:
            return False

    def _modelo_listo(self):
        if self._modelo is None:
            if not self._en_cache():
                self._avisar(f"cerebro: bajando el modelo de embeddings «{self.nombre}» ({PESO_LOCAL}, una sola "
                             f"vez) a {self._cache} ...")
            try:
                self._modelo = self._cargar(self.nombre, str(self._cache))
            except ErrorEmbedder:
                raise
            except Exception as e:
                raise ErrorEmbedder(f"no pude cargar el modelo «{self.nombre}»: {e}. La primera vez hace falta "
                                    "conexión a internet para bajarlo; si ya lo tenías, revisá "
                                    f"{self._cache} (borrala para bajarlo de nuevo)") from e
        return self._modelo

    def embed(self, textos: list[str]) -> list[list[float]]:
        if not textos:
            return []
        vectores = [[float(x) for x in v] for v in self._modelo_listo().embed(textos)]
        if len(vectores) != len(textos) or any(len(v) != self.dim for v in vectores):
            raise ErrorEmbedder(f"el modelo «{self.nombre}» devolvió vectores que no son de dim {self.dim}")
        return vectores


def obtener(modo: str | None = None) -> Embedder:
    """El embedder de `CEREBRO_EMBEDDINGS`. El de OpenAI llega con C-6."""
    if modo is None:
        from config import modo_embeddings

        modo = modo_embeddings()
    if modo == "falso":
        return Falso()
    if modo == "local":
        return Local()
    if modo in MODOS:
        raise ErrorEmbedder(f"el embedder «{modo}» todavía no está disponible en esta versión "
                            "(para probar sin modelos: CEREBRO_EMBEDDINGS=falso)")
    raise ErrorEmbedder(f"CEREBRO_EMBEDDINGS={modo!r} no existe: usá uno de {', '.join(MODOS)}")
