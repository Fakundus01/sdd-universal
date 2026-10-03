"""Arma proyectos temporales con git para probar el arnés de punta a punta."""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

HARNESS = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HARNESS))

PY = f'"{sys.executable}"'
PASS_CMD = f'{PY} -c "print(\'3 passed\')"'
FAIL_CMD = f'{PY} -c "import sys; print(\'1 failed: test_x\'); sys.exit(1)"'

CARD = """---
id: {id}
titulo: Tarjeta de prueba
estado: {estado}
feature: {feature}
rama: {rama}
---

# Tarjeta {id}

## Criterios de aceptación
{criterios}

## Zona de archivos
- **Podés tocar:** src/
"""


class Project:
    def __init__(self, git: bool = True, config: dict | None = None) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.root = Path(self._tmp.name).resolve()
        self.write("sdd/SDD-MASTER.md", "# master\n")
        self.write("harness.config.json", json.dumps(config if config is not None else {"test": PASS_CMD}))
        if git:
            self.git("init", "-q", "-b", "main")
            self.commit("inicio")

    def cleanup(self) -> None:
        self._tmp.cleanup()

    def write(self, rel: str, text: str) -> Path:
        path = self.root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        return path

    def git(self, *args: str) -> str:
        proc = subprocess.run(["git", "-c", "user.email=t@t", "-c", "user.name=t", *args], cwd=self.root,
                              capture_output=True, text=True, check=True)
        return proc.stdout.strip()

    def commit(self, msg: str) -> str:
        self.git("add", "-A")
        self.git("commit", "-q", "--allow-empty", "-m", msg)
        return self.git("rev-parse", "--short", "HEAD")

    def card(self, id: str = "H-1", estado: str = "pending", feature: str = "Login", rama: str = "",
             criterios: str = "1. Con datos válidos entra") -> Path:
        return self.write(f"sdd/cards/{id}.md", CARD.format(id=id, estado=estado, feature=feature, rama=rama,
                                                            criterios=criterios))

    def review(self, id: str = "H-1", rama: str = "main", verdict: str = "APPROVED",
               title_hash: str = "a942c177") -> Path:
        slug = rama.replace("/", "-")
        return self.write(f"sdd/progress/{slug}/review_{id}.md",
                          f"# Review {id} @ {title_hash}\n**Veredicto:** {verdict}\n")
