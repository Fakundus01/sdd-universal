"""ciclo.py — una vuelta completa en un comando: sincronizar lo derivado, verificar, y dejar la
evidencia armada (R30). Es el ritual que el agente repetía a mano cada vez, y lo que repetía a mano
es justo lo que se olvida a la quinta.

    python harness/ciclo.py                        sync + verify --changed, imprime la evidencia
    python harness/ciclo.py --full                 sync + verify completo (lo que corre el reviewer)
    python harness/ciclo.py --commit "mensaje"     lo anterior y, si está verde, commitea
    python harness/ciclo.py --commit "m" --push    además pushea la rama

Qué hace y qué no:

- **Sincronizar** corre los comandos de la clave `sync` de `harness.config.json` (conteos derivados,
  hashes de un grafo de contexto, índices). Van declarados por proyecto, no acá: nada del arnés
  nombra una herramienta concreta (R20). Tienen que ser idempotentes y sin red.
- **No commitea en rojo.** Es la razón de ser del comando: el `done` con el verificador en rojo no
  es evidencia (R30), y el que lo arma a mano lo descubre después.
- **No despliega nunca**, ni con `--push`: `deploy` de la config es documental (R32). Y `--push` se
  niega sobre `prod_branch` salvo `--a-prod`, que es el OK humano explícito.
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from config import ConfigError, HarnessConfig  # noqa: E402
from report import force_utf8  # noqa: E402
from repo import OutputLost, Repo, run_captured  # noqa: E402

TIMEOUT_S = 1800
TAIL = 25


def decodificar(raw: object) -> str:
    if isinstance(raw, str):
        return raw
    if not isinstance(raw, bytes):
        return ""
    for enc in ("utf-8", "cp1252", "cp850"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


class Paso:
    """Un comando corrido, con su salida literal: la unidad de la evidencia."""

    def __init__(self, cmd: str, codigo: int, salida: str) -> None:
        self.cmd, self.codigo, self.salida = cmd, codigo, salida

    @property
    def verde(self) -> bool:
        return self.codigo == 0

    def bloque(self, tail: int = TAIL) -> str:
        lineas = self.salida.strip().splitlines()
        recortado = len(lineas) > tail
        cuerpo = "\n".join(lineas[-tail:])
        marca = f"[... recortado a las últimas {tail} líneas]\n" if recortado else ""
        return f"$ {self.cmd}\n{marca}{cuerpo}".rstrip()


class Ciclo:
    def __init__(self, root: Path, nivel: str = "changed") -> None:
        self.root = root
        self.nivel = nivel
        self.repo = Repo(root)
        self.pasos: list[Paso] = []

    def correr(self, cmd: str, mostrar: str | None = None) -> Paso:
        real, cmd = cmd, mostrar or cmd
        try:
            proc = run_captured(real, shell=True, cwd=self.root, stdin=subprocess.DEVNULL, timeout=TIMEOUT_S)
        except OutputLost as exc:
            # Sin salida no hay evidencia, aunque el exit haya sido 0 (Windows bajo carga).
            paso = Paso(cmd, exc.returncode or 1, "salida no disponible: se perdió dos veces")
        except subprocess.TimeoutExpired:
            paso = Paso(cmd, 1, f"no terminó en {TIMEOUT_S}s")
        except OSError as exc:
            paso = Paso(cmd, 1, f"no se pudo ejecutar: {exc}")
        else:
            paso = Paso(cmd, proc.returncode, decodificar(proc.stdout) + decodificar(proc.stderr))
        self.pasos.append(paso)
        return paso

    def sucios(self) -> set[str]:
        salida = self.repo.git("status", "--porcelain", strip=False) or ""
        return {ln[3:].strip() for ln in salida.splitlines() if ln[3:].strip()}

    def sincronizar(self, comandos: list[str]) -> tuple[bool, set[str]]:
        """Devuelve (todo verde, archivos que movieron los fixers)."""
        antes = self.sucios()
        verde = True
        for cmd in comandos:
            paso = self.correr(cmd)
            if not paso.verde:
                verde = False
                print(f"[ciclo] sync ROJO: {cmd}")
                print(paso.bloque())
                break
            print(f"[ciclo] sync: {cmd}")
        return verde, self.sucios() - antes

    def verificar(self) -> Paso:
        bandera = {"quick": " --quick", "changed": " --changed", "full": ""}[self.nivel]
        # El arnés viaja dentro del repo, así que lo normal es `root/harness/verify.py` y su `--root`
        # por default ya apunta bien. Si no está ahí (tests, o el arnés compartido de un monorepo),
        # se usa el de al lado de este archivo y hay que decirle cuál es la raíz.
        local = self.root / "harness" / "verify.py"
        if local.is_file():
            real = f'"{sys.executable}" "{local}"{bandera}'
            mostrar = f"python harness/verify.py{bandera}"
        else:
            ajeno = Path(__file__).resolve().parent / "verify.py"
            real = f'"{sys.executable}" "{ajeno}"{bandera} --root "{self.root}"'
            mostrar = f"python {ajeno.as_posix()}{bandera} --root ."
        paso = self.correr(real, mostrar)
        print(paso.salida.rstrip())
        return paso

    def evidencia(self, movidos: set[str]) -> str:
        cab = f"=== EVIDENCIA · ciclo --{self.nivel} @ {self.repo.head()} (rama {self.repo.branch}) ==="
        partes = [cab]
        if movidos:
            partes.append("Los fixers de `sync` movieron: " + ", ".join(sorted(movidos)))
        partes += [p.bloque() for p in self.pasos]
        return "\n".join(partes)


def commitear(ciclo: Ciclo, mensaje: str, evidencia: str) -> int:
    sucios = ciclo.sucios()
    if not sucios:
        print("[ciclo] no hay nada para commitear")
        return 0
    print(f"[ciclo] commiteando {len(sucios)} archivo(s): " + ", ".join(sorted(sucios)[:10]))
    if ciclo.repo.git("add", "-A") is None:
        print("[ciclo] `git add -A` falló")
        return 1
    # El mensaje va por stdin en bytes UTF-8, no como texto: la evidencia trae la salida de
    # verify.py con sus caracteres de caja (`── Arnés ──`), y en Windows stdin usa cp1252, que no
    # los sabe escribir. Con `text=True` el commit reventaba con UnicodeEncodeError.
    cuerpo = f"{mensaje}\n\n{evidencia}\n".encode("utf-8")
    proc = run_captured(["git", "-c", "i18n.commitEncoding=utf-8", "commit", "-q", "-F", "-"],
                        cwd=ciclo.root, input=cuerpo, timeout=120)
    if proc.returncode:
        print(f"[ciclo] el commit falló (¿hook en rojo?):\n{decodificar(proc.stdout)}{decodificar(proc.stderr)}")
        return 1
    print(f"[ciclo] commiteado @ {ciclo.repo.head()}")
    return 0


def pushear(ciclo: Ciclo, config: HarnessConfig, a_prod: bool) -> int:
    rama = ciclo.repo.branch
    if rama == config.prod_branch and not a_prod:
        print(f"[ciclo] push a '{rama}' (prod_branch) frenado: pide --a-prod, que es el OK humano (R32).")
        print("[ciclo] Un commit se revierte; lo que el push dispare del otro lado, no siempre.")
        return 1
    paso = ciclo.correr(f"git push origin {rama}")
    print(paso.bloque(tail=8))
    return 0 if paso.verde else 1


def parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Una vuelta completa: sync + verify + evidencia (+ commit).")
    nivel = p.add_mutually_exclusive_group()
    nivel.add_argument("--quick", action="store_true", help="solo integridad del arnés y lint de lo cambiado")
    nivel.add_argument("--full", action="store_true", help="todo, igual que CI (lo que corre el reviewer)")
    p.add_argument("--commit", metavar="MENSAJE", help="si queda verde, commitea con la evidencia pegada")
    p.add_argument("--push", action="store_true", help="además pushea la rama (nunca despliega)")
    p.add_argument("--a-prod", action="store_true", help="habilita el push sobre prod_branch (OK humano, R32)")
    p.add_argument("--sin-sync", action="store_true", help="no corre los fixers de 'sync'")
    p.add_argument("--root", default=".", help="raíz del repo (default: la actual)")
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    # La salida de verify.py trae caracteres de caja (`── Arnés ──`) y la consola de Windows arranca
    # en cp1252: sin esto, imprimir la evidencia revienta con UnicodeEncodeError.
    force_utf8()
    args = parse_args(sys.argv[1:] if argv is None else argv)
    root = Path(args.root).resolve()
    nivel = "quick" if args.quick else "full" if args.full else "changed"
    ciclo = Ciclo(root, nivel)
    try:
        config = HarnessConfig.load(root)
    except ConfigError as exc:
        print(f"[ciclo] {exc}")
        return 1

    movidos: set[str] = set()
    if config.sync and not args.sin_sync:
        verde, movidos = ciclo.sincronizar(config.sync)
        if not verde:
            print("[ciclo] ROJO en sync: no sigo. Un fixer que falla deja lo derivado a medias.")
            return 1
    elif not config.sync:
        print("[ciclo] sin 'sync' en harness.config.json: nada que sincronizar")

    paso = ciclo.verificar()
    evidencia = ciclo.evidencia(movidos)
    print()
    print(evidencia)
    if not paso.verde:
        print("\n[ciclo] ROJO: no commiteo. Un done con el verificador en rojo no es evidencia (R30).")
        return 1

    if args.commit:
        codigo = commitear(ciclo, args.commit, evidencia)
        if codigo:
            return codigo
    if args.push:
        return pushear(ciclo, config, args.a_prod)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
