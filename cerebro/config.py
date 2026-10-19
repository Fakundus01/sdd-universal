"""Configuración del Cerebro por variables de entorno (playbook obsidian-cerebro §B y §D)."""
from __future__ import annotations

import os
from pathlib import Path

MODO_DEFAULT = "local"


def cerebro_dir() -> Path:
    """`CEREBRO_DIR`, o `%USERPROFILE%/Documents/Cerebro` (fuera de OneDrive, §B.1)."""
    propio = os.environ.get("CEREBRO_DIR", "").strip()
    if propio:
        return Path(propio)
    perfil = os.environ.get("USERPROFILE", "").strip()
    return (Path(perfil) if perfil else Path.home()) / "Documents" / "Cerebro"


def modo_embeddings() -> str:
    """`CEREBRO_EMBEDDINGS`: local (default) | openai | falso (tests)."""
    return os.environ.get("CEREBRO_EMBEDDINGS", "").strip().lower() or MODO_DEFAULT


def ruta_indice(base: Path) -> Path:
    """El índice vive en una carpeta con punto: Obsidian no la muestra."""
    return Path(base) / ".cerebro" / "indice.sqlite"


def _archivo_demonio(base: Path, nombre: str) -> str | None:
    """Una línea de `<CEREBRO_DIR>/cerebrod/<nombre>`, o `None`.

    Esa carpeta es la convención: un demonio que quiera que lo usen deja ahí su `url.txt` y su
    `token.txt`. Poner esos archivos adentro del Cerebro es el acto de opt-in — no se descubre
    nada solo, no se escanean puertos, y alcanza con borrar la carpeta para volver atrás. Además
    sirve para todos los clientes a la vez, sin repetir la config en cada uno."""
    try:
        texto = (Path(base) / "cerebrod" / nombre).read_text(encoding="utf-8").strip()
    except (OSError, UnicodeDecodeError):
        return None
    return texto.splitlines()[0].strip() if texto else None


def url_demonio(base: Path) -> str:
    """La URL de un demonio de búsqueda: `CEREBRO_DEMONIO`, y si no, `cerebrod/url.txt`. Vacío si
    no hay ninguno de los dos, que es lo normal: ahí el paquete no abre ningún socket."""
    propio = os.environ.get("CEREBRO_DEMONIO", "").strip()
    return propio or (_archivo_demonio(base, "url.txt") or "")


def token_demonio(base: Path) -> str | None:
    """El token del demonio: `CEREBRO_DEMONIO_TOKEN`, y si no, `cerebrod/token.txt`."""
    propio = os.environ.get("CEREBRO_DEMONIO_TOKEN", "").strip()
    return propio or _archivo_demonio(base, "token.txt")


def ruta_env() -> Path:
    """El `.env` de la raíz del paquete (`.gitignore`-ado; el repo solo versiona `.env.example`)."""
    return Path(__file__).resolve().parent.parent / ".env"


def _valor_env(linea: str, nombre: str) -> str | None:
    linea = linea.strip()
    if not linea or linea.startswith("#"):
        return None
    if linea.startswith("export "):
        linea = linea[len("export "):].lstrip()
    clave, igual, valor = linea.partition("=")
    if not igual or clave.strip() != nombre:
        return None
    valor = valor.strip()
    if valor[:1] in ("'", '"'):
        cierre = valor.find(valor[0], 1)
        return valor[1:cierre] if cierre > 0 else valor[1:]
    return valor.split(" #", 1)[0].strip()


def clave_openai() -> str | None:
    """`OPENAI_API_KEY`: el entorno primero, después el `.env` de la raíz del paquete. `None` si no hay (vacía
    cuenta como no hay). Nunca la escribe en el entorno ni en ningún otro lado."""
    clave = os.environ.get("OPENAI_API_KEY", "").strip()
    if clave:
        return clave
    try:
        lineas = ruta_env().read_text(encoding="utf-8-sig").splitlines()
    except (OSError, UnicodeDecodeError):
        return None
    for linea in lineas:
        valor = _valor_env(linea, "OPENAI_API_KEY")
        if valor:
            return valor
    return None
