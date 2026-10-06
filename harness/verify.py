#!/usr/bin/env python3
"""Verificación única del arnés (harness.md §3). Sin dependencias: Python 3.10+ y git.

  python harness/verify.py --quick     integridad del arnés + lint de lo cambiado (segundos)
  python harness/verify.py --changed   --quick + test_quick si hay cambios de código
  python harness/verify.py             todo, igual que CI: lint + test
  python harness/verify.py --e2e       además corre e2e y, si da verde, lo registra en sdd/progress/e2e.md
                                       (en modo LITE, en sdd/e2e.md)

La primera línea dice el hash: la salida entera sirve como evidencia (R30). Exit 1 si algo falla.
"""
from __future__ import annotations

import argparse
import locale
import os
import shlex
import subprocess
import sys
import time
from datetime import date
from pathlib import Path

sys.dont_write_bytecode = True  # un __pycache__ del arnés aparecería como «código cambiado» del proyecto
sys.path.insert(0, str(Path(__file__).resolve().parent))

from checks import HarnessChecks  # noqa: E402
from config import ConfigError, HarnessConfig, e2e_record  # noqa: E402
from report import Report, force_utf8  # noqa: E402
from repo import LOST, OutputLost, Repo, run_captured  # noqa: E402

TAIL_OK = 3
TAIL_FAIL = 25
COMMAND_TIMEOUT_S = 1800


class Verifier:
    def __init__(self, root: Path, mode: str, e2e: bool = False, argv: list[str] | None = None) -> None:
        self.root = root
        self.mode = mode
        self.e2e = e2e
        self.argv = argv or []
        self.repo = Repo(root)
        self.report = Report()

    def run(self) -> int:
        command = " ".join(["verify.py", *self.argv])
        print(f"{command} @ {self.repo.head()} (rama {self.repo.branch})")
        try:
            config = HarnessConfig.load(self.root)
        except ConfigError as exc:
            self.report.fail(str(exc))
            return self._finish()
        self.report.section("Arnés")
        HarnessChecks(self.root, config, self.report, self.repo, e2e_running=self.e2e).run_all()
        changed_code = [f for f in self.repo.changed_files() if not f.startswith("sdd/")]
        if self.mode == "full":
            self._full(config)
        else:
            self._lint_changed(config, changed_code)
            if self.mode == "changed":
                self._tests_changed(config, changed_code)
        if self.e2e:
            self._e2e(config)
        return self._finish()

    def _full(self, config: HarnessConfig) -> None:
        self.report.section("Lint")
        if config.lint:
            self._command("lint", config.lint)
        else:
            self.report.warn("sin 'lint' en harness.config.json")
        self.report.section("Tests")
        self._command("test", config.test)

    def _lint_changed(self, config: HarnessConfig, changed: list[str]) -> None:
        targets = [f for f in changed if config.lints(f)]
        if not targets:
            return
        self.report.section("Lint de lo cambiado")
        batches = [targets] if config.lint_batches else [[rel] for rel in targets]
        for batch in batches:
            cmd, skipped = config.lint_cmd(batch, self.root)
            for rel in skipped:
                self.report.warn(f"lint salteado: {rel} tiene caracteres que cmd.exe interpreta (% ! ^ \" & | < > ( )) "
                                 "y el linter es un .cmd/.bat")
            if cmd:
                self._command(f"lint {batch[0] if len(batch) == 1 else f'({len(batch)} archivos)'}", cmd)

    def _tests_changed(self, config: HarnessConfig, changed: list[str]) -> None:
        self.report.section("Tests de lo cambiado")
        if not self.repo.is_git:
            self.report.warn("sin git no se puede saber qué cambió: se corren los tests igual")
        elif not changed:
            self.report.ok("sin cambios de código sin commitear: nada que testear")
            return
        self._command("test_quick", config.test_quick or config.test)

    def _e2e(self, config: HarnessConfig) -> None:
        self.report.section("E2E")
        if not config.e2e:
            self.report.fail("--e2e pedido pero no hay 'e2e' en harness.config.json")
            return
        if self._command("e2e", config.e2e):
            record = e2e_record(self.root, config.master)
            record.parent.mkdir(parents=True, exist_ok=True)
            with record.open("a", encoding="utf-8") as fh:
                fh.write(f"- {date.today().isoformat()} @ {self.repo.head()} — e2e verde\n")

    def _command(self, label: str, command: str | list[str]) -> bool:
        """`test`/`lint`/`e2e` vienen como texto y pasan por el shell (no llevan rutas ajenas); el lint por
        archivo viene como lista y corre SIN shell, para que ningún nombre de archivo se interprete."""
        cmd = command if isinstance(command, str) else shown_cmd(command)
        start = time.monotonic()
        try:
            # stdin cerrado: un comando que pide input falla en vez de colgar el pre-commit.
            proc = run_captured(command, shell=isinstance(command, str), cwd=self.root, stdin=subprocess.DEVNULL,
                                timeout=COMMAND_TIMEOUT_S)
        except OutputLost as exc:
            # Sin la salida no hay evidencia (R30), aunque el exit haya sido 0.
            self.report.fail(f"{label} — `{cmd}` salió con {exc.returncode}, pero {LOST}: se perdió dos veces "
                             "(Windows bajo carga). Volvé a correrlo; si se repite, corré una sola suite por vez")
            return False
        except subprocess.TimeoutExpired:
            self.report.fail(f"{label}: `{cmd}` no terminó en {COMMAND_TIMEOUT_S}s")
            return False
        except OSError as exc:
            self.report.fail(f"{label}: no se pudo ejecutar `{cmd}` ({exc})")
            return False
        took = time.monotonic() - start
        lines = (decode(proc.stdout) + decode(proc.stderr)).strip().splitlines()
        if proc.returncode == 0:
            tail = " · ".join(ln.strip() for ln in lines[-TAIL_OK:] if ln.strip())
            self.report.ok(f"{label} — `{cmd}` ({took:.1f}s){': ' + tail if tail else ''}")
            return True
        tail = "\n".join(lines[-TAIL_FAIL:])
        self.report.fail(f"{label} — `{cmd}` salió con {proc.returncode} ({took:.1f}s):\n{tail}")
        return False

    def _finish(self) -> int:
        for msg in self.repo.errors:
            self.report.fail(msg)
        print(self.report.render())
        fails, warns = len(self.report.messages("FAIL")), len(self.report.messages("WARN"))
        print(f"\n{'ROJO' if fails else 'VERDE'} — {fails} FAIL, {warns} WARN")
        return self.report.exit_code()


def decode(raw: bytes) -> str:
    """La salida va «tal cual» (R30): UTF-8 si lo es; si no, la codepage de la consola (Windows: cp1252/cp850)."""
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        return raw.decode(locale.getpreferredencoding(False), errors="replace")


def shown_cmd(argv: list[str]) -> str:
    """Un argv como se tipearía en la terminal de este sistema, para la evidencia."""
    return subprocess.list2cmdline(argv) if os.name == "nt" else shlex.join(argv)


def shown_args(argv: list[str]) -> list[str]:
    """Los argumentos tal como se tipearon, sin la ruta de --root (no aporta a la evidencia y ensucia)."""
    shown = []
    for i, arg in enumerate(argv):
        if arg == "--root" or arg.startswith("--root=") or (i > 0 and argv[i - 1] == "--root"):
            continue
        shown.append(arg)
    return shown


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Verificación única del arnés SDD (harness.md §3)")
    level = parser.add_mutually_exclusive_group()
    level.add_argument("--quick", action="store_const", const="quick", dest="mode")
    level.add_argument("--changed", action="store_const", const="changed", dest="mode")
    level.add_argument("--full", action="store_const", const="full", dest="mode", help="el default")
    parser.add_argument("--e2e", action="store_true", help="correr e2e y registrar el verde")
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parent.parent,
                        help="raíz del proyecto (default: la carpeta que contiene harness/)")
    args = parser.parse_args(argv)
    args.mode = args.mode or "full"
    return args


def main(argv: list[str] | None = None) -> int:
    force_utf8()
    argv = sys.argv[1:] if argv is None else argv
    args = parse_args(argv)
    return Verifier(args.root.resolve(), args.mode, args.e2e, shown_args(argv)).run()


if __name__ == "__main__":
    sys.exit(main())
