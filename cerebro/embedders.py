"""Embedders: la interfaz común y el falso determinista de los tests.

Los reales (local con fastembed, OpenAI) importan sus dependencias de forma perezosa: el núcleo es solo stdlib.
"""
from __future__ import annotations

import hashlib
import math
import os
import re
import sys
import time
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


MODELO_OPENAI = "text-embedding-3-small"
DIM_OPENAI = 1536
URL_OPENAI = "https://api.openai.com/v1"  # fija: el SDK leería OPENAI_BASE_URL del entorno y la clave iría a otro host
LOTE_OPENAI = 64
REINTENTOS_OPENAI = 3
ESPERA_MAXIMA = 20.0
_CLAVE_SK = re.compile(r"sk-[A-Za-z0-9_\-]{6,}")


class _Secreto:
    """Guarda la clave sin que `repr`, `str` o un volcado de `__dict__` la muestren."""

    __slots__ = ("_valor",)

    def __init__(self, valor: str) -> None:
        self._valor = valor

    def valor(self) -> str:
        return self._valor

    def __repr__(self) -> str:
        return "<clave oculta>"

    __str__ = __repr__


def _sin_clave(texto: str, clave: str) -> str:
    """El texto que vuelve de la API puede repetir la clave (el 401 lo hace): se tacha antes de mostrarlo."""
    texto = texto.replace(clave, "[clave]")
    texto = _CLAVE_SK.sub("sk-***", texto)
    return texto if len(texto) <= 300 else texto[:300] + "..."


class OpenAIEmbedder(Embedder):
    """Embeddings de OpenAI (`text-embedding-3-small`, 1536 dim) con el SDK `openai`, importado de forma
    perezosa. Por lotes; reintento propio y acotado ante 429/5xx/red (el SDK va con `max_retries=0`: dos capas
    de reintentos multiplican los requests); 401 y el resto, error claro. La clave sale de `OPENAI_API_KEY` y
    no aparece en ningún mensaje de error ni en el `repr`: los errores del SDK se traducen a `ErrorEmbedder`
    fuera del `except`, sin encadenar la excepción original. `http_client`/`esperar` se inyectan en los tests."""

    nombre = MODELO_OPENAI
    dim = DIM_OPENAI

    def __init__(self, clave: str | None = None, http_client=None, esperar=None, reintentos: int = REINTENTOS_OPENAI,
                 lote: int = LOTE_OPENAI) -> None:
        if clave is None:
            from config import clave_openai

            clave = clave_openai()
        if not clave:
            raise ErrorEmbedder("falta la clave de OpenAI: definí la variable de entorno OPENAI_API_KEY (o ponela "
                                "en el archivo `.env` de la raíz del paquete; hay un `.env.example`). Sin clave "
                                "podés usar CEREBRO_EMBEDDINGS=local, que no la necesita")
        self._clave = _Secreto(clave)
        self._http_client = http_client
        self._esperar = esperar or time.sleep
        self.reintentos = max(0, reintentos)
        self.lote = max(1, lote)
        self._cliente = None
        self._sdk = None

    def __repr__(self) -> str:
        return f"OpenAIEmbedder(modelo={self.nombre!r}, dim={self.dim})"

    def _cliente_listo(self):
        if self._cliente is None:
            try:
                import openai
            except ImportError as e:
                raise ErrorEmbedder("falta `openai` para los embeddings de OpenAI: instalalo en un venv con "
                                    "`pip install -r cerebro/requirements.txt` (o usá CEREBRO_EMBEDDINGS=local)") from e
            extra = {"http_client": self._http_client} if self._http_client is not None else {}
            self._sdk = openai
            self._cliente = openai.OpenAI(api_key=self._clave.valor(), base_url=URL_OPENAI, max_retries=0,
                                          timeout=30.0, **extra)
        return self._cliente

    def _clasificar(self, e: Exception) -> tuple[str, bool, float | None]:
        """(mensaje sin clave, ¿se reintenta?, espera pedida por la API). Nunca devuelve ni cita `e`."""
        oa, clave = self._sdk, self._clave.valor()
        if isinstance(e, oa.APIStatusError):
            estado = e.status_code
            detalle = _sin_clave(str(getattr(e, "message", "") or ""), clave)
            if estado == 401:
                return ("OpenAI rechazó la clave (401): revisá OPENAI_API_KEY (¿está vencida o mal copiada?). "
                        f"Detalle: {detalle}", False, None)
            if estado == 429 and getattr(e, "code", None) == "insufficient_quota":
                return ("OpenAI dice que la cuenta no tiene cuota o crédito (429 insufficient_quota): revisá el "
                        f"plan y la facturación. Detalle: {detalle}", False, None)
            if estado == 429 or estado >= 500:
                try:
                    espera = max(0.0, min(float(e.response.headers.get("retry-after", "")), ESPERA_MAXIMA))
                except (ValueError, TypeError, AttributeError):
                    espera = None
                return f"OpenAI no pudo atender el pedido ({estado}) tras los reintentos. Detalle: {detalle}", True, espera
            return f"OpenAI rechazó el pedido ({estado}): {detalle}", False, None
        if isinstance(e, oa.APIConnectionError):
            return "no pude conectar con la API de OpenAI (¿hay internet?); probá de nuevo en un rato", True, None
        return f"falló la llamada a OpenAI ({type(e).__name__})", False, None

    def _lote(self, textos: list[str]) -> list[list[float]]:
        entrada = [t if t.strip() else " " for t in textos]  # la API rechaza el texto vacío
        cliente = self._cliente_listo()
        intento = 0
        while True:
            fallo = respuesta = None
            try:
                respuesta = cliente.embeddings.create(model=self.nombre, input=entrada, encoding_format="float")
            except Exception as e:
                fallo = self._clasificar(e)
            if fallo is None:
                break
            mensaje, reintentable, espera = fallo
            if not reintentable or intento >= self.reintentos:
                raise ErrorEmbedder(mensaje)  # fuera del `except`: sin __context__ con la excepción del SDK
            self._esperar(espera if espera is not None else min(2.0 ** intento, ESPERA_MAXIMA))
            intento += 1
        problema = None
        try:
            datos = sorted(respuesta.data, key=lambda d: d.index)
            if [d.index for d in datos] != list(range(len(textos))):
                problema = f"trajo {len(datos)} vectores con índices que no cuadran para {len(textos)} textos"
            else:
                vectores = [[float(x) for x in d.embedding] for d in datos]
        except Exception:  # portal cautivo (texto plano), `data` ausente o null, embedding no numérico, `index` roto
            problema = "no tiene la forma esperada (¿un proxy o un portal cautivo en el medio?)"
        if problema:  # fuera del `except`: sin __context__, y no se cita nada de la respuesta (podría llevar la clave)
            raise ErrorEmbedder(f"OpenAI devolvió una respuesta que no sirve: {problema}")
        if any(len(v) != self.dim for v in vectores):
            raise ErrorEmbedder(f"el modelo «{self.nombre}» devolvió vectores que no son de dim {self.dim}")
        return vectores

    def embed(self, textos: list[str]) -> list[list[float]]:
        vectores: list[list[float]] = []
        for i in range(0, len(textos), self.lote):
            vectores.extend(self._lote(textos[i:i + self.lote]))
        return vectores


def obtener(modo: str | None = None) -> Embedder:
    """El embedder de `CEREBRO_EMBEDDINGS`."""
    if modo is None:
        from config import modo_embeddings

        modo = modo_embeddings()
    if modo == "falso":
        return Falso()
    if modo == "local":
        return Local()
    if modo == "openai":
        return OpenAIEmbedder()
    raise ErrorEmbedder(f"CEREBRO_EMBEDDINGS={modo!r} no existe: usá uno de {', '.join(MODOS)}")
