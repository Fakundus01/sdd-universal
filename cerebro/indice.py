"""Índice del Cerebro: SQLite de la stdlib con FTS5 (BM25) y vectores float32, fusionados con RRF.

Tablas: `meta(modelo, dim)`, `notas` (una fila por archivo, con el hash del contenido), `fragmentos`
(texto + vector) y `fts` (FTS5 sobre el texto de los fragmentos, mismo rowid). El frontmatter no es texto:
va a `notas` y sirve de filtro.
"""
from __future__ import annotations

import hashlib
import math
import re
import sqlite3
import struct
from dataclasses import dataclass, field
from pathlib import Path

import notas as notas_mod

RRF_K = 60
MAXIMO = 1500
CANDIDATOS = 50
LARGO_FRAGMENTO = 500

_ENCABEZADO = re.compile(r"^#{1,2}\s")
_PALABRA = re.compile(r"\w+")
_VACIAS = {"a", "al", "con", "de", "del", "el", "en", "es", "la", "las", "lo", "los", "o", "para", "por", "que",
           "se", "sin", "su", "sus", "un", "una", "unos", "unas", "y"}

ESQUEMA = """
CREATE TABLE IF NOT EXISTS meta(clave TEXT PRIMARY KEY, valor TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS notas(ruta TEXT PRIMARY KEY, hash TEXT NOT NULL, proyecto TEXT, tipo TEXT,
                                 fecha TEXT, fuente TEXT, titulo TEXT);
CREATE TABLE IF NOT EXISTS fragmentos(id INTEGER PRIMARY KEY, ruta TEXT NOT NULL, orden INTEGER NOT NULL,
                                      texto TEXT NOT NULL, vector BLOB NOT NULL);
CREATE INDEX IF NOT EXISTS fragmentos_ruta ON fragmentos(ruta);
CREATE VIRTUAL TABLE IF NOT EXISTS fts USING fts5(texto, tokenize='unicode61 remove_diacritics 2');
"""


class ErrorIndice(Exception):
    pass


class ErrorModelo(ErrorIndice):
    pass


@dataclass
class Resumen:
    nuevas: int = 0
    actualizadas: int = 0
    sin_cambios: int = 0
    borradas: int = 0
    invalidas: list[str] = field(default_factory=list)


def _solo_encabezados(texto: str) -> bool:
    return all(linea.lstrip().startswith("#") for linea in texto.split("\n") if linea.strip())


def _cortar(texto: str, maximo: int) -> list[str]:
    """Un fragmento largo se parte por párrafos; un párrafo más largo que el máximo, a la fuerza."""
    if len(texto) <= maximo:
        return [texto]
    partes: list[str] = []
    actual = ""
    for parrafo in texto.split("\n\n"):
        if len(parrafo) > maximo:
            if actual:
                partes.append(actual)
                actual = ""
            partes.extend(parrafo[i:i + maximo] for i in range(0, len(parrafo), maximo))
        elif actual and len(actual) + 2 + len(parrafo) > maximo:
            partes.append(actual)
            actual = parrafo
        else:
            actual = f"{actual}\n\n{parrafo}" if actual else parrafo
    if actual:
        partes.append(actual)
    return [p for p in partes if p.strip()]


def fragmentar(cuerpo: str, maximo: int = MAXIMO) -> list[str]:
    """Por encabezado `#` / `##` (fuera de bloques de código), hasta `maximo` caracteres. Un encabezado sin
    texto propio (el título justo antes de un `##`) se une al fragmento siguiente."""
    secciones: list[list[str]] = [[]]
    en_codigo = False
    for linea in cuerpo.split("\n"):
        if linea.lstrip().startswith(("```", "~~~")):
            en_codigo = not en_codigo
        elif not en_codigo and _ENCABEZADO.match(linea) and secciones[-1]:
            secciones.append([])
        secciones[-1].append(linea)
    unidas: list[str] = []
    pendiente = ""
    for seccion in secciones:
        texto = "\n".join(seccion).strip()
        if not texto:
            continue
        if pendiente:
            texto, pendiente = f"{pendiente}\n\n{texto}", ""
        if _solo_encabezados(texto):
            pendiente = texto
            continue
        unidas.append(texto)
    if pendiente:
        unidas.append(pendiente)
    return [parte for texto in unidas for parte in _cortar(texto, maximo)]


def rrf(listas: list[list], k: int = RRF_K) -> dict:
    """Reciprocal Rank Fusion: cada lista suma 1 / (k + rango), con rango desde 1."""
    puntos: dict = {}
    for lista in listas:
        for rango, clave in enumerate(lista, start=1):
            puntos[clave] = puntos.get(clave, 0.0) + 1.0 / (k + rango)
    return puntos


def _consulta_fts(consulta: str) -> str:
    """Las palabras de la consulta, cada una entre comillas (nada de sintaxis FTS5 del usuario), unidas con OR.
    Las palabras vacías se caen, salvo que no quede otra cosa."""
    palabras = list(dict.fromkeys(p.lower() for p in _PALABRA.findall(consulta)))
    utiles = [p for p in palabras if notas_mod._slug_crudo(p) not in _VACIAS] or palabras
    return " OR ".join(f'"{p}"' for p in utiles)


def _coseno(a: tuple[float, ...], b: list[float]) -> float:
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    if not na or not nb:
        return 0.0
    return sum(x * y for x, y in zip(a, b)) / (na * nb)


class Indice:
    def __init__(self, ruta_db: Path, embedder) -> None:
        self.ruta_db = Path(ruta_db)
        self.embedder = embedder
        self._con: sqlite3.Connection | None = None

    def __enter__(self) -> "Indice":
        return self

    def __exit__(self, *exc) -> bool:
        self.close()
        return False

    def close(self) -> None:
        if self._con is not None:
            self._con.close()
            self._con = None

    # --- conexión y guardia de modelo ---

    def _abrir(self, crear: bool) -> sqlite3.Connection:
        if self._con is None:
            if not self.ruta_db.is_file():
                if not crear:
                    raise ErrorIndice("no hay índice todavía: corré `cerebro.py indexar`")
                self.ruta_db.parent.mkdir(parents=True, exist_ok=True)
            con = sqlite3.connect(self.ruta_db)
            try:
                con.executescript(ESQUEMA)
            except sqlite3.OperationalError as e:
                con.close()
                raise ErrorIndice(f"el SQLite de este Python no sirve para el índice ({e}); hace falta FTS5") from None
            self._con = con
        return self._con

    def _verificar_modelo(self, con: sqlite3.Connection) -> None:
        meta = dict(con.execute("SELECT clave, valor FROM meta"))
        if not meta:
            return
        if (meta.get("modelo"), meta.get("dim")) != (self.embedder.nombre, str(self.embedder.dim)):
            raise ErrorModelo(
                f"el índice se armó con el modelo «{meta.get('modelo')}» (dim {meta.get('dim')}) y el activo es "
                f"«{self.embedder.nombre}» (dim {self.embedder.dim}): los vectores de dos modelos no se comparan. "
                "Corré `cerebro.py indexar --todo`")

    def _embeber(self, textos: list[str]) -> list[bytes]:
        vectores = self.embedder.embed(textos) if textos else []
        dim = self.embedder.dim
        if len(vectores) != len(textos) or any(len(v) != dim for v in vectores):
            raise ErrorIndice(f"el embedder «{self.embedder.nombre}» devolvió vectores que no son de dim {dim}")
        return [struct.pack(f"<{dim}f", *v) for v in vectores]

    # --- indexar ---

    def _borrar(self, con: sqlite3.Connection, ruta: str) -> None:
        con.execute("DELETE FROM fts WHERE rowid IN (SELECT id FROM fragmentos WHERE ruta = ?)", (ruta,))
        con.execute("DELETE FROM fragmentos WHERE ruta = ?", (ruta,))
        con.execute("DELETE FROM notas WHERE ruta = ?", (ruta,))

    def indexar(self, base: Path, todo: bool = False) -> Resumen:
        """Incremental por hash del contenido; `todo` reconstruye. Todo en una transacción: si algo falla,
        el índice queda como estaba."""
        base = Path(base)
        con = self._abrir(crear=True)
        resumen = Resumen()
        with con:
            if todo:
                for tabla in ("fts", "fragmentos", "notas", "meta"):
                    con.execute(f"DELETE FROM {tabla}")
            else:
                self._verificar_modelo(con)
            con.executemany("INSERT OR REPLACE INTO meta(clave, valor) VALUES (?, ?)",
                            [("modelo", self.embedder.nombre), ("dim", str(self.embedder.dim))])
            previas = dict(con.execute("SELECT ruta, hash FROM notas"))
            vigentes = set()
            for archivo in notas_mod.listar(base):
                ruta = archivo.relative_to(base).as_posix()
                texto = archivo.read_text(encoding="utf-8", errors="replace")
                firma = hashlib.sha256(texto.encode("utf-8")).hexdigest()
                if previas.get(ruta) == firma:
                    vigentes.add(ruta)
                    resumen.sin_cambios += 1
                    continue
                nota, errores = notas_mod.parsear(texto, ruta)
                if errores:
                    resumen.invalidas.extend(errores)
                    continue
                vigentes.add(ruta)
                fragmentos = fragmentar(nota.cuerpo)
                vectores = self._embeber([f"{nota.titulo}\n\n{f}" for f in fragmentos])
                self._borrar(con, ruta)
                con.execute("INSERT INTO notas VALUES (?, ?, ?, ?, ?, ?, ?)",
                            (ruta, firma, nota.proyecto, nota.tipo, nota.fecha, nota.fuente, nota.titulo))
                for orden, (frag, vector) in enumerate(zip(fragmentos, vectores)):
                    cur = con.execute("INSERT INTO fragmentos(ruta, orden, texto, vector) VALUES (?, ?, ?, ?)",
                                      (ruta, orden, frag, vector))
                    con.execute("INSERT INTO fts(rowid, texto) VALUES (?, ?)", (cur.lastrowid, frag))
                if ruta in previas:
                    resumen.actualizadas += 1
                else:
                    resumen.nuevas += 1
            for ruta in set(previas) - vigentes:
                self._borrar(con, ruta)
                resumen.borradas += 1
        return resumen

    # --- buscar ---

    def buscar(self, consulta: str, proyecto: str | None = None, tipo: str | None = None,
               k: int = 5) -> list[dict]:
        """Top-N por FTS5 (BM25) y top-N por coseno, con los filtros aplicados antes; fusión RRF (k=60);
        una entrada por nota (su mejor fragmento)."""
        con = self._abrir(crear=False)
        self._verificar_modelo(con)
        if not consulta.strip():
            return []
        n = max(CANDIDATOS, k * 10)
        filtro = "(:proyecto IS NULL OR n.proyecto = :proyecto) AND (:tipo IS NULL OR n.tipo = :tipo)"
        params = {"proyecto": proyecto, "tipo": tipo, "n": n}
        por_palabras: list[int] = []
        expresion = _consulta_fts(consulta)
        if expresion:
            por_palabras = [i for (i,) in con.execute(
                "SELECT f.id FROM fts JOIN fragmentos f ON f.id = fts.rowid JOIN notas n ON n.ruta = f.ruta "
                f"WHERE fts MATCH :q AND {filtro} ORDER BY bm25(fts), f.id LIMIT :n", {**params, "q": expresion})]
        pregunta = self.embedder.embed([consulta])[0]
        if len(pregunta) != self.embedder.dim:
            raise ErrorIndice(f"el embedder «{self.embedder.nombre}» devolvió una consulta que no es de dim "
                              f"{self.embedder.dim}")
        formato = f"<{self.embedder.dim}f"
        cercanos = sorted(
            ((_coseno(struct.unpack(formato, blob), pregunta), i) for i, blob in con.execute(
                f"SELECT f.id, f.vector FROM fragmentos f JOIN notas n ON n.ruta = f.ruta WHERE {filtro}", params)),
            key=lambda par: (-par[0], par[1]))[:n]
        puntos = rrf([por_palabras, [i for _, i in cercanos]])
        resultados: list[dict] = []
        vistas: set[str] = set()
        for i in sorted(puntos, key=lambda i: (-puntos[i], i)):
            fila = con.execute(
                "SELECT n.titulo, n.ruta, n.proyecto, n.tipo, n.fuente, f.texto FROM fragmentos f "
                "JOIN notas n ON n.ruta = f.ruta WHERE f.id = ?", (i,)).fetchone()
            if fila[1] in vistas:
                continue
            vistas.add(fila[1])
            titulo, ruta, proy, tip, fuente, texto = fila
            resultados.append({"titulo": titulo, "ruta": ruta, "proyecto": proy, "tipo": tip, "fuente": fuente,
                               "fragmento": texto[:LARGO_FRAGMENTO], "puntaje": round(puntos[i], 6)})
            if len(resultados) == k:
                break
        return resultados
