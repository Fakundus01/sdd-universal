"""Lo que el arnés necesita de git, sin dependencias. Sin git, todo degrada a valores vacíos."""
from __future__ import annotations

import os
import subprocess
from pathlib import Path

# El arnés escribe bytecode y estado propio: no es «código cambiado» del proyecto.
IGNORED_PARTS = ("__pycache__",)


class Repo:
    def __init__(self, root: Path) -> None:
        self.root = root

    def git(self, *args: str, strip: bool = True) -> str | None:
        try:
            proc = subprocess.run(["git", *args], cwd=self.root, capture_output=True, text=True,
                                  encoding="utf-8", errors="replace", timeout=20, stdin=subprocess.DEVNULL)
        except (OSError, subprocess.SubprocessError):
            return None
        if proc.returncode != 0:
            return None
        return proc.stdout.strip() if strip else proc.stdout

    @property
    def is_git(self) -> bool:
        return self.git("rev-parse", "--is-inside-work-tree") == "true"

    @property
    def branch(self) -> str:
        # symbolic-ref también responde antes del primer commit, cuando rev-parse todavía falla.
        name = self.git("symbolic-ref", "--short", "-q", "HEAD") or self.git("rev-parse", "--abbrev-ref", "HEAD")
        if not name:
            return "sin-git"
        if name == "HEAD":
            # En un PR, CI hace checkout en HEAD detached; la rama real viene por entorno.
            return os.environ.get("GITHUB_HEAD_REF") or os.environ.get("CI_COMMIT_REF_NAME") or "detached"
        return name

    @staticmethod
    def slug(branch: str) -> str:
        return branch.replace("/", "-")

    @property
    def progress_dir(self) -> Path:
        return self.root / "sdd" / "progress" / self.slug(self.branch)

    def head(self) -> str:
        return self.git("rev-parse", "--short", "HEAD") or "sin-commit"

    def _status(self, under: str = ".") -> list[str]:
        """Rutas con cambios sin commitear (staged, modificadas o nuevas), relativas a root.

        -z evita el escape de no-ASCII (`canci\\303\\263n.py`) y de comillas; en un renombre trae la ruta nueva
        primero. porcelain siempre responde relativo al toplevel: con root dentro de un monorepo se recorta el prefijo.
        """
        out = self.git("status", "--porcelain=v1", "-z", "--untracked-files=all", "--", under, strip=False)
        if not out:
            return []
        prefix = self.git("rev-parse", "--show-prefix") or ""
        entries = out.split("\0")
        paths, i = [], 0
        while i < len(entries):
            entry = entries[i]
            i += 1
            if len(entry) < 4:
                continue
            if entry[0] in "RC":
                i += 1  # la ruta de origen del renombre viene en la entrada siguiente
            path = entry[3:]
            if path.startswith(prefix):
                paths.append(path[len(prefix):])
        return paths

    def changed_files(self) -> list[str]:
        return [p for p in self._status()
                if (self.root / p).is_file() and not any(part in IGNORED_PARTS for part in p.split("/"))]

    def uncommitted(self, under: str) -> list[str]:
        return self._status(under)
