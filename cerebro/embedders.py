"""Embedders: la interfaz común y el falso determinista de los tests.

Los reales (local con fastembed, OpenAI) importan sus dependencias de forma perezosa: el núcleo es solo stdlib.
"""
from __future__ import annotations

import hashlib
import math
import re
import unicodedata

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


def obtener(modo: str | None = None) -> Embedder:
    """El embedder de `CEREBRO_EMBEDDINGS`. Los reales llegan con sus tarjetas (local: C-3, OpenAI: C-6)."""
    if modo is None:
        from config import modo_embeddings

        modo = modo_embeddings()
    if modo == "falso":
        return Falso()
    if modo in MODOS:
        raise ErrorEmbedder(f"el embedder «{modo}» todavía no está disponible en esta versión "
                            "(para probar sin modelos: CEREBRO_EMBEDDINGS=falso)")
    raise ErrorEmbedder(f"CEREBRO_EMBEDDINGS={modo!r} no existe: usá uno de {', '.join(MODOS)}")
