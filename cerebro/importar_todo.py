"""importar-todo: recorre una carpeta madre y llama a `importar.importar` por cada repo SDD que
encuentra, con Gitleaks como filtro bloqueante antes de tocar cualquiera (playbook obsidian-cerebro).
Nunca se auto-importa, y una carpeta con `CEREBRO-NO-ENTRA.md` en su raíz queda siempre afuera."""
from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import dataclass, field
from pathlib import Path

import importar
import notas

MARCA_AFUERA = "CEREBRO-NO-ENTRA.md"


class ErrorImportarTodo(Exception):
    pass


@dataclass
class ResumenTodo:
    importados: list[str] = field(default_factory=list)
    saltados: list[str] = field(default_factory=list)
    bloqueados: list[str] = field(default_factory=list)
    resultados: dict[str, importar.Resumen] = field(default_factory=dict)


def _gitleaks_bin() -> str:
    """Bloqueante a propósito: sin Gitleaks, `importar-todo` no puede garantizar que no cruce un
    secreto entre repos, así que no arranca (ni toca una sola carpeta) en vez de arriesgarse."""
    binario = shutil.which("gitleaks")
    if not binario:
        raise ErrorImportarTodo(
            "gitleaks no está en el PATH: importar-todo no puede garantizar que no se filtre un secreto "
            "entre repos. Instalalo con `winget install Gitleaks.Gitleaks` (Windows) o bajando el binario "
            "de https://github.com/gitleaks/gitleaks/releases, y volvé a correr este comando.")
    return binario


def _hallazgos_gitleaks(carpeta: Path, binario: str) -> list[str]:
    """Nombres de archivo con hallazgos (nunca el valor del secreto). `[]` si está limpio."""
    args = [binario, "detect", "--source", str(carpeta), "--no-banner", "--report-format", "json",
            "--report-path", "-", "--exit-code", "1"]
    if not (carpeta / ".git").is_dir():
        args.append("--no-git")
    proc = subprocess.run(args, capture_output=True, text=True)
    if proc.returncode == 0:
        return []
    try:
        hallazgos = json.loads(proc.stdout) if proc.stdout.strip() else []
    except json.JSONDecodeError:
        hallazgos = []
    archivos = sorted({h.get("File", "?") for h in hallazgos if isinstance(h, dict)})
    return archivos or ["(gitleaks encontró algo pero no devolvió el detalle; corré `gitleaks detect` a mano)"]


def _es_candidata(hijo: Path, base_real: Path) -> str:
    """`""` si hay que importarla; si no, el motivo por el que se saltea."""
    if hijo.resolve() == base_real:
        return "es el propio CEREBRO_DIR"
    if (hijo / MARCA_AFUERA).is_file():
        return f"afuera ({MARCA_AFUERA})"
    if not (hijo / "sdd").is_dir() and not (hijo / "SDD-MASTER.md").is_file():
        return "no parece un repo SDD, se saltea"
    return ""


def importar_todo(raiz: Path, base: Path) -> ResumenTodo:
    raiz, base = Path(raiz), Path(base)
    if not raiz.is_dir():
        raise ErrorImportarTodo(f"no existe {raiz}")
    binario = _gitleaks_bin()
    r = ResumenTodo()
    base_real = base.resolve()
    for hijo in sorted(p for p in raiz.iterdir() if p.is_dir() and not p.name.startswith(".")):
        motivo = _es_candidata(hijo, base_real)
        if motivo == "es el propio CEREBRO_DIR":
            continue  # nunca se auto-importa, ni siquiera se informa: no es ruido útil
        if motivo:
            r.saltados.append(f"{hijo.name}: {motivo}")
            print(f"[cerebro] {hijo.name}: {motivo}")
            continue
        archivos = _hallazgos_gitleaks(hijo, binario)
        if archivos:
            r.bloqueados.append(hijo.name)
            print(f"[cerebro] {hijo.name}: BLOQUEADO por gitleaks en {', '.join(archivos)} — no se importó nada")
            continue
        proyecto = notas.slug(hijo.name)
        try:
            res = importar.importar(hijo, base, proyecto=proyecto)
        except importar.ErrorImportar as e:
            r.saltados.append(f"{hijo.name}: error al importar ({e})")
            print(f"[cerebro] {hijo.name}: error al importar: {e}")
            continue
        r.importados.append(hijo.name)
        r.resultados[hijo.name] = res
        print(f"[cerebro] {hijo.name}: importado como «{proyecto}» "
              f"({res.nuevas} nuevas, {res.actualizadas} actualizadas, {res.sin_cambios} sin cambios)")
    print(f"\n[cerebro] importar-todo: {len(r.importados)} importado(s), {len(r.saltados)} salteado(s), "
          f"{len(r.bloqueados)} bloqueado(s) por gitleaks")
    return r
