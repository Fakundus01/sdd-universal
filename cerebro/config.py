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
