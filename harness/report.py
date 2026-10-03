"""Acumula resultados [OK]/[WARN]/[FAIL] y decide el exit code."""
from __future__ import annotations

import sys

LEVELS = ("OK", "WARN", "FAIL")


def force_utf8() -> None:
    # Windows con consola cp1252 revienta al imprimir `→` o tildes de los MD.
    for stream in (sys.stdin, sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):
            pass


class Report:
    def __init__(self) -> None:
        self.lines: list[tuple[str, str]] = []

    def ok(self, msg: str) -> None:
        self.lines.append(("OK", msg))

    def warn(self, msg: str) -> None:
        self.lines.append(("WARN", msg))

    def fail(self, msg: str) -> None:
        self.lines.append(("FAIL", msg))

    def section(self, title: str) -> None:
        self.lines.append(("", f"\n── {title} ──"))

    @property
    def failed(self) -> bool:
        return any(level == "FAIL" for level, _ in self.lines)

    def messages(self, level: str) -> list[str]:
        return [msg for lvl, msg in self.lines if lvl == level]

    def render(self) -> str:
        out = []
        for level, msg in self.lines:
            out.append(msg if not level else f"[{level}]{' ' * (6 - len(level))}{msg}")
        return "\n".join(out)

    def exit_code(self) -> int:
        return 1 if self.failed else 0
