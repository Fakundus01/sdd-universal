"""Lee harness.config.json: lo único del arnés que depende del stack del proyecto (harness.md §2)."""
from __future__ import annotations

import json
import os
import re
import shlex
from dataclasses import dataclass, field
from pathlib import Path

CONFIG_NAME = "harness.config.json"
# La spec también (H13 nació en una `sdd-lite.md`); los que no existen se saltean. El master y orchestration.md no:
# citan archivos opcionales (`GEMINI.md`, `metrics.md`) y darían falsos positivos.
DEFAULT_CITED_DOCS = ["AGENTS.md", "CLAUDE.md", "sdd/testing.md", "sdd/spec.md", "sdd/sdd-lite.md"]
STR_KEYS = {"test", "test_quick", "lint", "lint_file", "e2e", "prod_readonly_query", "deploy",
            "base_branch", "prod_branch"}
LIST_KEYS = {"lint_ext", "cited_paths_docs"}
INT_KEYS = {"context_threshold"}
KNOWN_KEYS = STR_KEYS | LIST_KEYS | INT_KEYS
# lint_file no pasa por un shell: se parte en argumentos y la ruta entra como UN argumento. Así ningún nombre de
# archivo se interpreta. Por eso el placeholder tiene que ser un argumento entero (`{file}`) o el valor de una
# opción (`--x={file}`): metido en un `sh -c "…"` o un `python -c "…"` volvería a ser código.
PLACEHOLDER_TOKEN_RE = re.compile(r"^(?:\{file\}|\{files\}|-[\w-]*=\{file\})$")
# cmd.exe sí interpreta los argumentos cuando el ejecutable es un .cmd/.bat (npx, yarn…): ahí no hay forma segura.
CMD_UNSAFE = set('%!^"&|<>()')
BATCH_EXT = (".cmd", ".bat")


MODES = ("FULL", "LITE", "COMPACT", "FEDERADO")
CUSTOM_MODE_RE = re.compile(r"^\s*MODO\s*=\s*([A-Za-z]+)", re.M)
# `**Modo:** LITE (R18) ·` (encabezado de sdd-lite.md) o `- **Modo por tamaño (R18):** LITE — …` (§3 del master).
# La línea de plantilla del master trae los cuatro separados por `/`: ahí no se eligió nada todavía.
DOC_MODE_RE = re.compile(r"\bModo\b[^:\n]{0,30}:\**\s*\**([A-Za-z]+)\**(?=[ \t]*(?:$|[—–·(-]))", re.M)
MODE_SOURCES = (("sdd/custom.md", CUSTOM_MODE_RE), ("sdd/sdd-lite.md", DOC_MODE_RE), ("sdd/SDD-MASTER.md", DOC_MODE_RE))


class ConfigError(Exception):
    pass


def sdd_mode(root: Path) -> str:
    """El modo por tamaño del proyecto (R18). Manda `MODO=` de `sdd/custom.md` (la última línea: el bloque de
    sintaxis va antes que los overrides); si no hay, el `**Modo:**` de `sdd/sdd-lite.md`; si no, el §3 de
    `sdd/SDD-MASTER.md`; si no, FULL."""
    for rel, regex in MODE_SOURCES:
        path = root / rel
        if not path.is_file():
            continue
        found = [m.upper() for m in regex.findall(path.read_text(encoding="utf-8-sig", errors="replace"))]
        found = [m for m in found if m in MODES]
        if found:
            return found[-1]
    return "FULL"


def e2e_record(root: Path) -> Path:
    """Dónde se anota cada e2e verde: `sdd/progress/e2e.md`, o `sdd/e2e.md` en LITE, que no tiene progress/."""
    return root / "sdd" / ("e2e.md" if sdd_mode(root) == "LITE" else "progress/e2e.md")


def split_template(template: str) -> list[str]:
    try:
        return shlex.split(template)
    except ValueError as exc:
        raise ConfigError(f"{CONFIG_NAME}: 'lint_file' no se puede partir en argumentos ({exc}): ¿una comilla sin cerrar?") from exc


@dataclass
class HarnessConfig:
    test: str
    test_quick: str | None = None
    lint: str | None = None
    lint_file: str | None = None
    lint_ext: list[str] = field(default_factory=list)
    e2e: str | None = None
    prod_readonly_query: str | None = None
    deploy: str | None = None  # documental: el arnés nunca lo ejecuta (R32)
    base_branch: str = "main"
    prod_branch: str = "main"
    context_threshold: int = 400_000
    cited_paths_docs: list[str] = field(default_factory=lambda: list(DEFAULT_CITED_DOCS))
    unknown_keys: list[str] = field(default_factory=list)

    @classmethod
    def load(cls, root: Path) -> "HarnessConfig":
        path = root / CONFIG_NAME
        if not path.is_file():
            raise ConfigError(f"falta {CONFIG_NAME} en la raíz (plantilla: harness/harness.config.example.json)")
        try:
            data = json.loads(path.read_text(encoding="utf-8-sig"))  # -sig: PowerShell 5.1 escribe BOM
        except json.JSONDecodeError as exc:
            raise ConfigError(f"{CONFIG_NAME} no es JSON válido: {exc}") from exc
        if not isinstance(data, dict):
            raise ConfigError(f"{CONFIG_NAME} tiene que ser un objeto JSON")
        known = {k: v for k, v in data.items() if k in KNOWN_KEYS}
        cls._validate(known)
        if not (known.get("test") or "").strip():
            raise ConfigError(f"{CONFIG_NAME}: falta 'test' — sin la suite que define «verde» no hay R30")
        cfg = cls(**known)
        cfg.unknown_keys = sorted(k for k in data if k not in KNOWN_KEYS and not k.startswith("$"))
        return cfg

    @staticmethod
    def _validate(data: dict) -> None:
        for key, value in data.items():
            if key in STR_KEYS and value is not None and not isinstance(value, str):
                raise ConfigError(f"{CONFIG_NAME}: '{key}' tiene que ser un texto (un comando), no {type(value).__name__}")
            if key in LIST_KEYS and not (isinstance(value, list) and all(isinstance(v, str) for v in value)):
                raise ConfigError(f"{CONFIG_NAME}: '{key}' tiene que ser una lista de textos, ej. [\".py\"]")
            if key in INT_KEYS and (isinstance(value, bool) or not isinstance(value, int)):
                raise ConfigError(f"{CONFIG_NAME}: '{key}' tiene que ser un número entero, ej. 400000")
        tokens = split_template(data.get("lint_file") or "")
        if tokens and "{file" in tokens[0]:
            raise ConfigError(f"{CONFIG_NAME}: 'lint_file' arranca con {{file}}: el ejecutable sería el archivo "
                              "cambiado. Poné primero el linter (ej. \"npx eslint {file}\")")
        for token in tokens:
            if "{file" in token and not PLACEHOLDER_TOKEN_RE.match(token):
                raise ConfigError(
                    f"{CONFIG_NAME}: 'lint_file': {{file}}/{{files}} tiene que ser un argumento entero "
                    f"(o --opcion={{file}}), no parte de «{token}». Para encadenar linters usá un script: "
                    "\"sh scripts/lint.sh {file}\"")

    def lints(self, rel_path: str) -> bool:
        """¿Corresponde pasarle lint_file a este archivo?"""
        if not self.lint_file:
            return False
        if self.lint_ext:
            return any(rel_path.endswith(ext) for ext in self.lint_ext)
        return not rel_path.endswith((".md", ".json"))

    @property
    def lint_batches(self) -> bool:
        return "{files}" in split_template(self.lint_file or "")

    def lint_cmd(self, rel_paths: list[str], root: Path | None = None) -> tuple[list[str] | None, list[str]]:
        """argv del lint (sin shell) para estas rutas + las que se saltean por no poder pasarse seguras.
        `root` es la raíz del proyecto, que es el cwd con el que corre el lint."""
        argv = split_template(self.lint_file or "")
        if not argv:
            return None, list(rel_paths)
        if os.name == "nt":
            argv[0] = resolve_exe(argv[0], root) or argv[0]  # `npx` → `…\npx.cmd`: CreateProcess no busca PATHEXT
        batch = os.name == "nt" and argv[0].lower().endswith(BATCH_EXT)
        safe = [r for r in rel_paths if not (batch and CMD_UNSAFE & set(r))]
        skipped = [r for r in rel_paths if r not in safe]
        if not safe:
            return None, skipped
        # Invariante: toda ruta entra como `./…`. Sin shell, el que interpreta el primer carácter es el parser del
        # linter: `-` opción, `@` response file (javac, gcc, clang, MSVC), `+` en otras. Las rutas son relativas a
        # la raíz, así que `./` no cambia a qué archivo apuntan; y no hay lista de prefijos que mantener.
        as_arg = [f"./{r}" for r in safe]
        out: list[str] = []
        for token in argv:
            if token == "{files}":
                out.extend(as_arg)
            elif token == "{file}":
                out.append(as_arg[0])
            else:
                out.append(token.replace("{file}", safe[0]))  # `--opcion={file}`: ahí es un valor, no una opción
        return out, skipped


def resolve_exe(name: str, root: Path | None = None) -> str | None:
    """Ruta absoluta de un ejecutable de Windows, o None.

    Sin separador (`npx`): SOLO en las carpetas absolutas del PATH. shutil.which (hasta 3.11) y cmd.exe miran
    primero el directorio actual, y un `npx.cmd` sin trackear en la raíz reemplazaría al real.
    Con separador (`tools/lint.cmd`, `node_modules/.bin/eslint`): contra la raíz del proyecto, que es el cwd del
    lint. Lo escribió el usuario en la config, así que ahí no hay nada plantado. CreateProcess no encuentra una
    ruta relativa con `/`, y cmd.exe lee `./tools/x.cmd` como `.` + el switch `/tools`: se devuelve absoluta.
    """
    exts = [e.lower() for e in os.environ.get("PATHEXT", ".COM;.EXE;.BAT;.CMD").split(";") if e]
    if Path(name).suffix:
        exts = [""] + exts
    if "/" in name or "\\" in name:
        folders = [Path(root or Path.cwd())]
    else:
        folders = [Path(f) for f in os.environ.get("PATH", "").split(os.pathsep) if f and Path(f).is_absolute()]
    for folder in folders:
        for ext in exts:
            candidate = folder / f"{name}{ext}"
            if candidate.is_file():
                return str(candidate.resolve())
    return None
