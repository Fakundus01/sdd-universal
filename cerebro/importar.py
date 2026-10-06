"""importar-sdd: convierte lo que ya aprendió el paquete (matriz de scenarios.md, hallazgos y «Resumen al cortar»
de los loops cumplidos) en notas del Cerebro. Idempotente; no pisa una nota editada a mano."""
from __future__ import annotations

import datetime
import hashlib
import re
from dataclasses import dataclass, field
from pathlib import Path

import notas

PROYECTO = "sdd-universal"
MARCA = "importado"
_FILA_ESC = re.compile(r"^\|\s*(S\d{2,3})\s*\|")
_FILA_HAL = re.compile(r"^\|\s*(H\d+)\s*\|")
_FECHA = re.compile(r"\d{4}-\d{2}-\d{2}")
_NOMBRE = re.compile(r"^\d{4}-\d{2}-\d{2}-(.+)\.md$")
_NEGRITA_INICIAL = re.compile(r"^\*\*(.+?)\*\*")


class ErrorImportar(Exception):
    pass


@dataclass
class Resumen:
    nuevas: int = 0
    actualizadas: int = 0
    sin_cambios: int = 0
    editadas: list[str] = field(default_factory=list)
    avisos: list[str] = field(default_factory=list)
    invalidas: list[str] = field(default_factory=list)
    por_tipo: dict[str, int] = field(default_factory=dict)


@dataclass
class Candidata:
    id: str
    tipo: str
    titulo: str
    cuerpo: str
    fuente: str
    fecha: str
    tags: list[str]


def celdas(linea: str) -> list[str]:
    """Celdas de una fila de tabla markdown: se corta en `|` sin escapar y `\\|` vuelve a `|`."""
    interior = linea.strip()
    interior = interior[1:] if interior.startswith("|") else interior
    interior = interior[:-1] if interior.endswith("|") and not interior.endswith("\\|") else interior
    partes = re.split(r"(?<!\\)\|", interior)
    return [p.strip().replace("\\|", "|") for p in partes]


def _una_linea(texto: str) -> str:
    return " ".join(texto.split())


def _escenarios(texto: str, avisos: list[str]) -> list[Candidata]:
    m = re.search(r"\*\*Versión:\*\*[^\n]*?(\d{4}-\d{2}-\d{2})", texto)
    fecha = m.group(1) if m else datetime.date.today().isoformat()
    out = []
    for linea in texto.split("\n"):
        m = _FILA_ESC.match(linea)
        if not m:
            continue
        c = celdas(linea)
        if len(c) != 5:
            avisos.append(f"scenarios.md: la fila {m.group(1)} tiene {len(c)} celdas y no 5; se saltea")
            continue
        id_, situacion, funciona, problema, adaptacion = c
        cuerpo = (f"**Situación:** {situacion}\n\n**¿Funciona hoy?** {funciona}\n\n"
                  f"**Problema:** {problema}\n\n**Adaptación:** {adaptacion}")
        out.append(Candidata(id_.lower(), "escenario", _una_linea(situacion), cuerpo,
                             f"{PROYECTO}/scenarios.md#{id_}", fecha, [id_]))
    return out


def _hallazgos(texto: str, nombre: str, avisos: list[str]) -> list[Candidata]:
    m = re.search(r"(\d{4}-\d{2})", nombre)
    fecha = f"{m.group(1)}-01" if m else datetime.date.today().isoformat()
    out = []
    for linea in texto.split("\n"):
        m = _FILA_HAL.match(linea)
        if not m:
            continue
        c = celdas(linea)
        if len(c) != 5:
            avisos.append(f"{nombre}: la fila {m.group(1)} tiene {len(c)} celdas y no 5; se saltea")
            continue
        id_, ejemplo, donde, paso, propuesta = c
        cuerpo = (f"**Ejemplo:** {ejemplo}\n\n**Dónde:** {donde}\n\n"
                  f"**Qué pasó:** {paso}\n\n**Propuesta:** {propuesta}")
        out.append(Candidata(id_.lower(), "hallazgo", _una_linea(f"{id_} · {donde}"), cuerpo,
                             f"{PROYECTO}/examples/{nombre}#{id_}", fecha, [id_]))
    return out


def _estado(texto: str) -> str:
    lineas = texto.replace("\r\n", "\n").split("\n")
    if not lineas or lineas[0].strip() != "---":
        return ""
    for linea in lineas[1:]:
        if linea.strip() == "---":
            return ""
        m = re.match(r"^estado\s*:\s*(\S+)", linea)
        if m:
            return m.group(1)
    return ""


def _resumen_al_cortar(texto: str) -> list[str]:
    lineas = texto.replace("\r\n", "\n").split("\n")
    try:
        ini = next(i for i, l in enumerate(lineas) if re.match(r"^##\s+Resumen al cortar\s*$", l))
    except StopIteration:
        return []
    seccion = []
    for l in lineas[ini + 1:]:
        if l.startswith("## "):
            break
        seccion.append(l)
    return seccion


def _lecciones(texto: str, loop: str) -> list[Candidata]:
    seccion = _resumen_al_cortar(texto)
    m = _FECHA.search("\n".join(seccion))
    fecha = m.group(0) if m else datetime.date.today().isoformat()
    bullets: list[list[str]] = []
    for l in seccion:
        if l.startswith("- "):
            bullets.append([l[2:].strip()])
        elif bullets and l.strip() and l[:1] in " \t":
            bullets[-1].append(l.strip())
    out = []
    n = 0
    for b in bullets:
        completo = " ".join(b)
        lider = _NEGRITA_INICIAL.match(completo)
        titulo = lider.group(1).strip().rstrip(":").strip() if lider else _una_linea(completo)[:80]
        if titulo.lower().startswith("pendiente"):
            continue
        n += 1
        out.append(Candidata(f"{loop}-l{n}", "leccion", titulo, completo,
                             f"{PROYECTO}/sdd/loops/{loop}.md#resumen-al-cortar", fecha, [loop]))
    return out


def _texto(c: Candidata) -> str:
    """La nota completa, con la marca `importado: <hash del resto>` para saber si después la editaron."""
    base = ["---", f"proyecto: {PROYECTO}", f"tipo: {c.tipo}", f"fecha: {c.fecha}", f"fuente: {c.fuente}",
            f"tags: [{', '.join(c.tags)}]", "---", f"# {c.titulo}", "", c.cuerpo.strip(), ""]
    return _con_marca("\n".join(base))


def _hash(texto: str) -> str:
    return hashlib.sha256(texto.encode("utf-8")).hexdigest()[:16]


def _sin_marca(texto: str) -> tuple[str, str | None]:
    lineas = texto.replace("\r\n", "\n").split("\n")
    marca = None
    resto = []
    for l in lineas:
        if marca is None and l.startswith(f"{MARCA}: "):
            marca = l.split(": ", 1)[1].strip()
            continue
        resto.append(l)
    return "\n".join(resto), marca


def _con_marca(texto: str) -> str:
    lineas = texto.split("\n")
    cierre = lineas.index("---", 1)
    lineas.insert(cierre, f"{MARCA}: {_hash(texto)}")
    return "\n".join(lineas)


def _existentes(carpeta: Path) -> dict[str, Path]:
    if not carpeta.is_dir():
        return {}
    out = {}
    for p in carpeta.iterdir():
        m = _NOMBRE.match(p.name)
        if m and p.is_file():
            out[m.group(1)] = p
    return out


def _leer(repo: Path, ruta: str, avisos: list[str]) -> str | None:
    p = repo / ruta
    if not p.is_file():
        avisos.append(f"{ruta}: no existe en el repo; se saltea")
        return None
    return p.read_text(encoding="utf-8")


def candidatas(repo: Path, avisos: list[str]) -> list[Candidata]:
    out: list[Candidata] = []
    t = _leer(repo, "scenarios.md", avisos)
    if t is not None:
        out += _escenarios(t, avisos)
    for p in sorted((repo / "examples").glob("hallazgos-*.md")) if (repo / "examples").is_dir() else []:
        out += _hallazgos(p.read_text(encoding="utf-8"), p.name, avisos)
    if not (repo / "examples").is_dir() or not list((repo / "examples").glob("hallazgos-*.md")):
        avisos.append("examples/hallazgos-*.md: no existe en el repo; se saltea")
    loops = repo / "sdd" / "loops"
    for p in sorted(loops.glob("*.md")) if loops.is_dir() else []:
        texto = p.read_text(encoding="utf-8")
        if _estado(texto) == "cumplido":
            out += _lecciones(texto, p.stem)
    return out


def importar(repo: Path, base: Path) -> Resumen:
    repo, base = Path(repo), Path(base)
    if not repo.is_dir():
        raise ErrorImportar(f"no existe el repo {repo}")
    if not base.is_dir():
        raise ErrorImportar(f"no existe {base}: corré `cerebro.py init`")
    r = Resumen()
    cands = candidatas(repo, r.avisos)
    raiz = base / "proyectos"
    raiz.mkdir(exist_ok=True)
    raiz_real = raiz.resolve()
    carpeta = raiz / notas.slug(PROYECTO)
    if raiz_real.parent != base.resolve() or carpeta.resolve().parent != raiz_real:
        raise ErrorImportar(f"{carpeta}: queda fuera de CEREBRO_DIR/proyectos (¿un enlace?)")
    previas = _existentes(carpeta)
    for c in cands:
        texto = _texto(c)
        nota, errores = notas.parsear(texto, c.fuente)
        if errores:
            r.invalidas.extend(errores)
            continue
        r.por_tipo[c.tipo] = r.por_tipo.get(c.tipo, 0) + 1
        destino = previas.get(c.id)
        if destino is None:
            carpeta.mkdir(exist_ok=True)
            destino = carpeta / f"{c.fecha}-{c.id}.md"
            with open(destino, "x", encoding="utf-8", newline="\n") as f:
                f.write(texto)
            r.nuevas += 1
            continue
        actual = destino.read_text(encoding="utf-8")
        resto, marca = _sin_marca(actual)
        if marca != _hash(resto):
            r.editadas.append(f"{c.fuente.split('#')[-1]} ({destino.name}): editada a mano; no se pisa")
        elif actual.replace("\r\n", "\n") == texto:
            r.sin_cambios += 1
        else:
            destino.write_text(texto, encoding="utf-8", newline="\n")
            r.actualizadas += 1
    return r
