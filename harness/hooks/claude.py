#!/usr/bin/env python3
"""Hooks de Claude Code para el arnés SDD (harness.md §9). Se configuran con hooks/settings.example.json.

  session-start  SessionStart      → muestra sdd/progress/<rama>/current.md y la tarjeta en curso
  context-guard  UserPromptSubmit  → si el trabajo (uso − base) pasó context_threshold, pide el relevo
  post-edit      PostToolUse       → lint_file sobre el archivo editado (exit 2 = feedback al agente)
  stop           Stop              → verify.py --quick (exit 2 = no cerrar todavía)

Ningún error interno pasa en silencio: session-start avisa por stdout, stop devuelve 2 explicándolo (salvo con
stop_hook_active, para no armar un bucle) y el resto sale con 1 y stderr.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

HARNESS = Path(__file__).resolve().parent.parent
sys.dont_write_bytecode = True  # un __pycache__ del arnés aparecería como «código cambiado» del proyecto
sys.path.insert(0, str(HARNESS))

from checks import Card  # noqa: E402
from config import ConfigError, HarnessConfig, sdd_mode  # noqa: E402
from report import force_utf8  # noqa: E402
from repo import Repo  # noqa: E402
from verify import decode  # noqa: E402

STEP_TOKENS = 50_000
MAX_CURRENT_CHARS = 6000


def project_root() -> Path:
    return Path(os.environ.get("CLAUDE_PROJECT_DIR") or HARNESS.parent).resolve()


def load_config(root: Path) -> HarnessConfig | None:
    try:
        return HarnessConfig.load(root)
    except ConfigError:
        return None


class Hooks:
    def __init__(self, root: Path, payload: dict) -> None:
        self.root = root
        self.payload = payload
        self.repo = Repo(root)
        self.lite = sdd_mode(root) == "LITE"

    def _memory(self) -> Path:
        """Dónde vive el estado del trabajo: current.md de la rama, o sdd-lite.md en modo LITE (harness.md §10)."""
        return self.root / "sdd" / "sdd-lite.md" if self.lite else self.repo.progress_dir / "current.md"

    # ── SessionStart ─────────────────────────────────────────────────────────
    def session_start(self) -> int:
        branch = self.repo.branch
        current = self._memory()
        rel = current.relative_to(self.root).as_posix()
        print(f"[arnés] Rama `{branch}`. Leé sdd/SDD-MASTER.md y seguí desde el próximo paso de {rel}.")
        if current.is_file():
            text = current.read_text(encoding="utf-8", errors="replace")
            if len(text) > MAX_CURRENT_CHARS:
                text = text[:MAX_CURRENT_CHARS] + "\n…(truncado; leé el archivo completo)"
            print(f"Estado que dejó la sesión anterior ({rel}):\n\n{text}")
        elif self.lite:
            print(f"Modo LITE: todavía no hay {rel}. Crealo con la plantilla prompts/sdd-lite.md.")
        else:
            print(f"Todavía no hay {rel}: `python harness/verify.py --quick` lo crea.")
        cards = self.root / "sdd" / "cards"
        mine = []
        for path in sorted(cards.glob("*.md")) if cards.is_dir() else []:
            card = Card.parse(path)
            if card.state == "in_progress" and card.meta.get("rama") == branch:
                mine.append(f"{card.id} — {card.meta.get('titulo', '')}")
        if mine:
            print("\nTarjeta en curso en esta rama: " + "; ".join(mine))
        return 0

    # ── UserPromptSubmit ─────────────────────────────────────────────────────
    # Se mide el TRABAJO de la sesión, no el contexto total: la base (system prompt + herramientas + primer
    # mensaje) ya ocupa decenas de miles de tokens, y con un umbral sobre el total el aviso saltaba desde el
    # principio. Es un número fijo y no un % porque la ventana cambia según el modelo.
    def context_guard(self) -> int:
        path = self.payload.get("transcript_path")
        if not path or not Path(path).is_file():
            return 0
        config = load_config(self.root)
        default = config.context_threshold if config else 400_000
        limit = int(os.environ.get("HARNESS_CONTEXT_WORK_TOKENS") or default)
        state_file = self._guard_state_file()
        try:
            state = json.loads(state_file.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            state = {}
        before = dict(state)
        tokens, exact = last_context_tokens(Path(path))
        if exact:
            state.setdefault("base", first_context_tokens(Path(path)) or 0)
            base = int(state["base"])
        else:
            base = 0  # el transcript no trae el system prompt: su tamaño ya es casi todo trabajo
        work = max(0, tokens - base)
        step = (work - limit) // STEP_TOKENS if work >= limit else None
        warn = step is not None and step > state.get("step", -1)
        if step is None:
            state.pop("step", None)  # bajó del umbral (tras compactar): el próximo cruce vuelve a avisar
        elif warn:
            state["step"] = step
        if state != before:
            try:
                state_file.parent.mkdir(parents=True, exist_ok=True)
                state_file.write_text(json.dumps(state), encoding="utf-8")
            except OSError:
                pass  # sin estado se repite el aviso, pero no se pierde
        if warn:
            how = "" if exact else " (estimado por el tamaño del transcript)"
            rel = self._memory().relative_to(self.root).as_posix()
            print(f"[arnés] El trabajo de esta sesión ya ocupa ~{work // 1000}k tokens{how}, sin contar la base de "
                  f"~{base // 1000}k. El límite es {limit // 1000}k. Antes de seguir: hacé el relevo (skill /relevo "
                  f"o prompts/relevo.md) en {rel} y pedile a la persona que haga /clear. "
                  f"(No se repite hasta los {(limit + (step + 1) * STEP_TOKENS) // 1000}k.)")
        return 0

    def _guard_state_file(self) -> Path:
        base_dir = os.environ.get("HARNESS_STATE_DIR") or str(Path(tempfile.gettempdir()) / "sdd-context-guard")
        key = self.payload.get("session_id") or hashlib.sha1(
            str(self.payload.get("transcript_path")).encode()).hexdigest()
        return Path(base_dir) / (re.sub(r"[^A-Za-z0-9_.-]", "_", str(key))[:120] + ".json")

    # ── PostToolUse ──────────────────────────────────────────────────────────
    def post_edit(self) -> int:
        file_path = (self.payload.get("tool_input") or {}).get("file_path") or ""
        config = load_config(self.root)
        if not file_path or not config:
            return 0
        path = Path(file_path) if Path(file_path).is_absolute() else self.root / file_path
        try:
            rel = path.resolve().relative_to(self.root).as_posix()
        except ValueError:
            return 0
        if not config.lints(rel) or not path.is_file():
            return 0
        cmd, skipped = config.lint_cmd([rel], self.root)
        if skipped:
            print(f"[arnés] lint salteado: {rel} tiene caracteres que cmd.exe interpreta y el linter es un .cmd/.bat.",
                  file=sys.stderr)
            return 1
        # Sin shell: la ruta entra como un argumento y ningún nombre de archivo se interpreta.
        proc = subprocess.run(cmd, cwd=self.root, capture_output=True, timeout=55, stdin=subprocess.DEVNULL)
        if proc.returncode == 0:
            return 0
        out = "\n".join((decode(proc.stdout) + decode(proc.stderr)).strip().splitlines()[-20:])
        print(f"[arnés] lint encontró problemas en {rel}:\n{out}\nSi los causó tu cambio, corregilos ahora. "
              "Si ya estaban y el archivo está fuera de tu tarjeta, no los arregles: anotalos en el handback.",
              file=sys.stderr)
        return 2

    # ── Stop ─────────────────────────────────────────────────────────────────
    def stop(self) -> int:
        if self.payload.get("stop_hook_active"):
            return 0  # ya estamos continuando por este hook: no entrar en bucle
        proc = subprocess.run([sys.executable, str(HARNESS / "verify.py"), "--quick", "--root", str(self.root)],
                              cwd=self.root, capture_output=True, text=True, encoding="utf-8",
                              errors="replace", timeout=110, stdin=subprocess.DEVNULL)
        if proc.returncode == 0:
            return 0
        tail = "\n".join((proc.stdout + proc.stderr).strip().splitlines()[-25:])
        rel = self._memory().relative_to(self.root).as_posix()
        print(f"[arnés] verify.py --quick falló:\n{tail}\n\nNo cierres todavía: arreglalo. Si no es parte de tu "
              f"tarea, anotalo en {rel} y explicáselo a la persona.", file=sys.stderr)
        return 2


def usage_tokens(entry: object) -> int:
    """Tokens de contexto de una respuesta del hilo principal (0 si no aplica)."""
    if not isinstance(entry, dict) or entry.get("type") != "assistant" or entry.get("isSidechain"):
        return 0
    usage = (entry.get("message") or {}).get("usage") or {}
    return sum(int(usage.get(k) or 0) for k in (
        "input_tokens", "cache_read_input_tokens", "cache_creation_input_tokens", "output_tokens"))


def first_context_tokens(transcript: Path) -> int | None:
    with transcript.open("r", encoding="utf-8", errors="replace") as fh:
        for line in fh:
            try:
                total = usage_tokens(json.loads(line))
            except ValueError:
                continue
            if total:
                return total
    return None


def last_context_tokens(transcript: Path) -> tuple[int, bool]:
    size = transcript.stat().st_size
    with transcript.open("rb") as fh:
        fh.seek(max(0, size - 4_000_000))
        lines = fh.read().decode("utf-8", errors="ignore").splitlines()
    for line in reversed(lines):
        try:
            total = usage_tokens(json.loads(line))
        except ValueError:
            continue
        if total:
            return total, True
    return size // 4, False  # estimación gruesa si no hay usage


COMMANDS = {"session-start": "session_start", "context-guard": "context_guard",
            "post-edit": "post_edit", "stop": "stop"}


def main(cmd: str, payload: dict, root: Path | None = None) -> int:
    root = root or project_root()
    try:
        return getattr(Hooks(root, payload), COMMANDS[cmd])()
    except Exception as exc:  # noqa: BLE001 — un hook roto no puede pasar en silencio
        err = f"{type(exc).__name__}: {exc}"
    if cmd == "session-start":
        print(f"\n[arnés] El hook de inicio falló ({err}). Leé sdd/progress/<rama>/current.md a mano antes de seguir.")
        return 0
    if cmd == "stop" and not payload.get("stop_hook_active"):
        print(f"[arnés] El hook 'stop' falló ({err}), así que verify.py --quick no se verificó. Corrélo a mano "
              "antes de cerrar y, si el hook está roto, explicáselo a la persona.", file=sys.stderr)
        return 2
    print(f"[arnés] hook {cmd!r} falló internamente ({err}).", file=sys.stderr)
    return 1


def read_payload() -> dict:
    try:
        data = json.load(sys.stdin)
        return data if isinstance(data, dict) else {}
    except ValueError:
        return {}


if __name__ == "__main__":
    force_utf8()
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "", read_payload()))
