"""Integridad del arnés: lo que corre `verify.py --quick` (harness.md §7)."""
from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from pathlib import Path

from config import HarnessConfig, e2e_record, sdd_mode
from report import Report
from repo import Repo

CARD_STATES = {"pending", "in_progress", "review", "done", "blocked"}
SKIP_CHARS = set("<>{}*$|")
TICK_RE = re.compile(r"`([^`\s]+)`")
LINK_RE = re.compile(r"\]\(([^)\s]+)\)")
HASH_RE = re.compile(r"\b[0-9a-f]{7,40}\b")
MID_TOKEN_TAB = re.compile(r"\S\t\S")  # `tests<TAB>est_x.py`: una ruta de Windows rota al pegarla
PLACEHOLDER_RE = re.compile(r"^<[^>]+>$")
LINE_SUFFIX_RE = re.compile(r"(:\d+(:\d+)?|#L\d+(-L?\d+)?)$")  # `src/x.ts:120`, `src/x.ts#L3`
VERDICT_RE = re.compile(r"^\W*Veredicto\b(.*)$", re.I)
VERDICT_TOKEN_RE = re.compile(r"\b(APPROVED|CHANGES_REQUESTED)\b")
# Celdas de tabla (H13): un nombre de archivo sin carpeta (`consultas.py`) también se revisa, contra cualquier
# carpeta del proyecto. Solo con extensiones de archivo conocidas, para no confundir `os.path` o `req.body`.
FILE_EXTS = ("py|pyi|ipynb|js|mjs|cjs|jsx|ts|mts|cts|tsx|vue|svelte|astro|go|rs|java|kt|kts|swift|rb|php|cs|fs|"
             "scala|dart|lua|ex|exs|erl|c|h|cc|cpp|hpp|sql|prisma|graphql|gql|proto|sh|ps1|bat|cmd|html|htm|"
             "css|scss|sass|less|md|mdx|json|jsonc|yml|yaml|toml|ini|cfg|xml|csv|txt|tf")
BARE_FILE_RE = re.compile(rf"^[A-Za-z0-9_][\w.-]*\.(?:{FILE_EXTS})$")
# Librerías que se escriben como un archivo: `Node.js` en una tabla de stack no es una ruta.
LIBRARY_NAMES = {f"{n}.js" for n in (
    "node", "next", "nuxt", "vue", "react", "express", "chart", "three", "d3", "p5", "alpine", "ember", "backbone",
    "moment", "day", "anime", "socket", "angular", "nest", "solid", "preact", "fastify", "koa", "hapi", "electron",
    "pixi", "phaser", "babylon", "matter", "tone", "paper", "fabric", "leaflet", "highcharts", "plotly", "video",
    "howler", "lodash", "jquery", "require", "handlebars", "mustache", "mithril", "polymer", "htmx", "deno",
    "transformers", "pdf", "tensorflow", "highlight", "swiper", "brain", "ml5", "onnxruntime-web", "mermaid")}
WALK_SKIP = {".git", "node_modules", "__pycache__", ".venv", "venv", ".next", ".nuxt", "dist", "build"}


def _clean_value(raw: str) -> str:
    """Como YAML: comillas que envuelven el valor, y ` #` abre un comentario salvo dentro de las comillas."""
    raw = raw.strip()
    if raw[:1] in ("'", '"') and raw[0] in raw[1:]:
        return raw[1:raw.index(raw[0], 1)]
    return re.split(r"\s#", raw, maxsplit=1)[0].strip()


def _verdict(text: str) -> str | None:
    """El último veredicto del review (una re-review pisa a la anterior); la línea de plantilla sin elegir no cuenta."""
    found = []
    for line in text.splitlines():
        match = VERDICT_RE.match(line.strip())
        if not match:
            continue
        tokens = set(VERDICT_TOKEN_RE.findall(match.group(1)))
        if len(tokens) == 1:
            found.append(tokens.pop())
        elif tokens:
            found.append("SIN_ELEGIR")  # `APPROVED | CHANGES_REQUESTED`: la línea de la plantilla
        # sin token es prosa («Veredicto final: ver arriba»): no pisa al anterior
    return found[-1] if found else None


def _cells(line: str) -> set[str]:
    """Nombres candidatos de feature en una línea de status.md: celdas de tabla, o el texto antes de `:`/`—`."""
    if line.strip().startswith("|"):
        parts = line.strip().strip("|").split("|")
    else:
        parts = [re.split(r"[:—]", re.sub(r"^\s*[-*]\s*", "", line), maxsplit=1)[0]]
    return {p.strip().strip("*_ ") for p in parts}


@dataclass
class Card:
    path: Path
    meta: dict[str, str]
    body: str
    criteria: list[str] = field(default_factory=list)
    deps: list[str] = field(default_factory=list)
    deps_error: str = ""  # `depende_de` en un formato que no se sabe leer (vacío si está bien)

    @property
    def id(self) -> str:
        return self.meta.get("id", "")

    @property
    def state(self) -> str:
        return self.meta.get("estado", "")

    @classmethod
    def parse(cls, path: Path) -> "Card":
        text = path.read_text(encoding="utf-8-sig", errors="replace")
        meta: dict[str, str] = {}
        body = text
        deps: list[str] = []
        deps_error = ""
        if text.startswith("---"):
            head, sep, rest = text[3:].partition("\n---")
            if sep:
                body = rest
                lines = head.splitlines()
                for n, line in enumerate(lines):
                    key, colon, value = line.partition(":")
                    if colon and key.strip():
                        meta[key.strip()] = _clean_value(value)
                        if key.strip() == "depende_de":
                            deps, deps_error = cls._parse_deps(value, lines[n + 1:])
        card = cls(path, meta, body, cls._criteria(body))
        card.deps, card.deps_error = deps, deps_error
        return card

    @staticmethod
    def _parse_deps(value: str, following: list[str]) -> tuple[list[str], str]:
        """`depende_de: [A, B]` (o `[A,B]`, con comillas). Ausente o `[]` es sin dependencias; cualquier otra
        forma (lista YAML en varias líneas, valores sin corchetes) se rechaza en vez de perderse en silencio."""
        value = value.strip()
        if value[:1] == "#":
            value = ""  # `depende_de: # nada`: solo un comentario
        if value[:1] in ("'", '"') and len(value) > 1 and value[-1] == value[0]:
            value = value[1:-1].strip()  # `depende_de: "[A]"`, YAML válido
        if not value:
            if following and re.match(r"\s*-\s", following[0]):
                return [], "lista en varias líneas; escribila en una línea, `depende_de: [A, B]`"
            return [], ""
        match = re.match(r"^\[([^\[\]]*)\]\s*(?:#.*)?$", value)
        if not match:
            return [], f"{value!r} no está entre corchetes; escribí `depende_de: [A, B]`"
        items = (item.strip().strip("'\"").strip() for item in match.group(1).split(","))
        return list(dict.fromkeys(i for i in items if i and not PLACEHOLDER_RE.match(i))), ""

    @staticmethod
    def _criteria(body: str) -> list[str]:
        match = re.search(r"^##\s+Criterios de aceptaci[oó]n\s*$(.*?)(?=^##\s|\Z)", body, re.M | re.S | re.I)
        if not match:
            return []
        items = re.findall(r"^\s*(?:\d+[.)]|[-*])\s+(.+)$", match.group(1), re.M)
        return [i.strip() for i in items if i.strip() and not PLACEHOLDER_RE.match(i.strip())]


class HarnessChecks:
    def __init__(self, root: Path, config: HarnessConfig, report: Report, repo: Repo | None = None,
                 e2e_running: bool = False) -> None:
        self.root = root
        self.e2e_running = e2e_running
        self.config = config
        self.report = report
        self.repo = repo or Repo(root)
        self.cards: list[Card] = []
        self.mode = sdd_mode(root, config.master)
        self._names: set[str] | None = None

    def run_all(self) -> None:
        self.check_required()
        self.check_config()
        self.load_cards()
        self.check_cards()
        self.check_status_coherence()
        self.check_cited_paths()
        self.check_handbacks()
        self.check_e2e_registered()

    # ── archivos base ────────────────────────────────────────────────────────
    def check_required(self) -> None:
        if not (self.root / self.config.master).is_file():
            self.report.fail(f"Falta {self.config.master}: el arnés se apoya en el SDD (R30)")
        if self.mode == "LITE":
            # harness.md §10: en LITE no hay cards/ ni progress/. El pre-commit corre --quick en cada commit:
            # crear current.md acá ensuciaría el working tree para nada.
            self.report.ok("Modo LITE (R18): sin memoria en disco; el estado vive en sdd/sdd-lite.md")
            return
        current = self.repo.progress_dir / "current.md"
        if current.is_file():
            self.report.ok(f"Memoria en disco: {self._rel(current)}")
            return
        template = Path(__file__).resolve().parent / "templates" / "current.md"
        current.parent.mkdir(parents=True, exist_ok=True)
        text = template.read_text(encoding="utf-8") if template.is_file() else "# Sesión actual\n"
        current.write_text(text.replace("{{BRANCH}}", self.repo.branch), encoding="utf-8")
        self.report.ok(f"Creado {self._rel(current)} desde la plantilla")

    def check_config(self) -> None:
        for key in self.config.unknown_keys:
            self.report.warn(f"harness.config.json: clave desconocida '{key}' (¿un typo?)")

    # ── tarjetas (la cola) ───────────────────────────────────────────────────
    def load_cards(self) -> None:
        folder = self.root / "sdd" / "cards"
        self.cards = [Card.parse(p) for p in sorted(folder.glob("*.md"))] if folder.is_dir() else []

    def check_cards(self) -> None:
        errors = 0
        in_progress: dict[str, list[str]] = {}
        for card in self.cards:
            rel = self._rel(card.path)
            if card.id != card.path.stem:
                self.report.fail(f"{rel}: el id del frontmatter ({card.id or 'vacío'}) no coincide con el nombre del archivo")
                errors += 1
            if card.state not in CARD_STATES:
                self.report.fail(f"{rel}: estado inválido {card.state!r} (válidos: {', '.join(sorted(CARD_STATES))})")
                errors += 1
                continue
            branch = card.meta.get("rama", "")
            if PLACEHOLDER_RE.match(branch):
                branch = ""  # `rama: <rama>` copiado de una plantilla sin completar
            if card.state == "in_progress":
                if not branch:
                    self.report.fail(f"{rel}: in_progress sin 'rama' — agregá `rama: {self.repo.branch}` "
                                     "(la rama donde se trabaja) al frontmatter")
                    errors += 1
                else:
                    in_progress.setdefault(branch, []).append(card.id)
            if card.state == "review" and not branch:
                self.report.warn(f"{rel}: review sin 'rama' — al pasar a done va a fallar. {self._branch_hint(card)}")
            if card.state == "done":
                errors += self._check_done(card, rel, branch)
            elif not card.criteria:
                self.report.warn(f"{rel}: sin criterios de aceptación — no puede salir de pending")
        for branch, ids in in_progress.items():
            if len(ids) > 1:
                self.report.fail(f"rama {branch}: {len(ids)} tarjetas in_progress ({', '.join(ids)}); máximo 1 por rama")
                errors += 1
        errors += self._check_graph()
        if self.cards and not errors:
            self.report.ok(f"Tarjetas válidas ({len(self.cards)})")

    def _check_graph(self) -> int:
        """orchestration.md §10: cada `depende_de` existe, el grafo no tiene ciclos y no se despacha fuera de orden."""
        by_id = {c.id: c for c in self.cards if c.id}
        errors = 0
        for card in self.cards:
            if not card.id:
                continue  # ya falla por id vacío; sus dependencias no se juzgan
            rel = self._rel(card.path)
            if card.deps_error:
                self.report.fail(f"{rel}: depende_de con formato no reconocido: {card.deps_error}")
                errors += 1
            for dep in card.deps:
                if dep not in by_id:
                    self.report.fail(f"{rel}: depende_de {dep} y esa tarjeta no existe (sdd/cards/{dep}.md)")
                    errors += 1
                elif card.state in ("in_progress", "review", "done") and by_id[dep].state != "done":
                    self.report.fail(f"{rel}: {card.state} pero depende de {dep}, que está {by_id[dep].state or 'sin estado'} "
                                     "(despacho fuera de orden: esperá a que sea done)")
                    errors += 1
        return errors + self._check_cycles(by_id)

    def _check_cycles(self, by_id: dict[str, Card]) -> int:
        """DFS iterativo (una cadena larga no tira RecursionError); cada ciclo se informa una vez."""
        errors = 0
        done: set[str] = set()
        steps = 0
        limit = 2 * (len(by_id) + sum(len(c.deps) for c in by_id.values())) + 10  # tope: nunca cuelga
        for start in sorted(by_id):
            if start in done:
                continue
            path = [start]
            on_path = {start}
            stack = [iter([d for d in by_id[start].deps if d in by_id])]
            while stack:
                steps += 1
                if steps > limit:
                    self.report.fail("depende_de: el recorrido del grafo no termina (error del arnés; avisá al leader)")
                    return errors + 1
                dep = next(stack[-1], None)
                if dep is None:
                    node = path.pop()
                    done.add(node)
                    on_path.discard(node)
                    stack.pop()
                    continue
                if dep in on_path:
                    cycle = path[path.index(dep):] + [dep]
                    shown = cycle if len(cycle) <= 12 else cycle[:5] + ["…"] + cycle[-4:] + [f"({len(cycle) - 1} tarjetas)"]
                    self.report.fail(f"ciclo en depende_de: {' -> '.join(shown)} (tarjeta mal partida: re-partila)")
                    errors += 1
                elif dep not in done:
                    path.append(dep)
                    on_path.add(dep)
                    stack.append(iter([d for d in by_id[dep].deps if d in by_id]))
        return errors

    def _check_done(self, card: Card, rel: str, branch: str) -> int:
        if not card.criteria:
            self.report.fail(f"{rel}: done sin criterios de aceptación")
            return 1
        if not branch:
            self.report.fail(f"{rel}: done sin 'rama' — no se puede ubicar su review. {self._branch_hint(card)}")
            return 1
        review = self.root / "sdd" / "progress" / Repo.slug(branch) / f"review_{card.id}.md"
        if not review.is_file():
            self.report.fail(f"{rel}: done sin {self._rel(review)} (R30: nadie se aprueba a sí mismo)")
            return 1
        text = review.read_text(encoding="utf-8-sig", errors="replace")
        if _verdict(text) != "APPROVED":
            self.report.fail(f"{rel}: done pero {self._rel(review)} no está en APPROVED")
            return 1
        first = text.strip().splitlines()[0] if text.strip() else ""
        if not HASH_RE.search(first):
            self.report.fail(f"{self._rel(review)}: el título no dice qué hash se revisó (`# Review {card.id} @ <hash>`)")
            return 1
        return 0

    def _branch_hint(self, card: Card) -> str:
        """Cómo arreglar una tarjeta sin `rama`: si su review ya existe en una sola carpeta, esa es la rama."""
        progress = self.root / "sdd" / "progress"
        found = sorted(p.parent.name for p in progress.glob(f"*/review_{card.id}.md")) if progress.is_dir() else []
        if len(found) == 1:
            return f"Agregá `rama: {found[0]}` al frontmatter (ahí está su review)."
        return (f"Agregá `rama: <rama>` al frontmatter: la rama donde se trabajó, la de "
                f"sdd/progress/<rama>/review_{card.id}.md.")

    def check_status_coherence(self) -> None:
        status = self.root / "sdd" / "status.md"
        if not status.is_file() or not self.cards:
            return
        lines = status.read_text(encoding="utf-8-sig", errors="replace").splitlines()
        complete = [_cells(ln) for ln in lines if re.search(r"100\s*%|Complete", ln)]
        for card in self.cards:
            feature = card.meta.get("feature", "")
            if not feature or card.state == "done":
                continue
            if any(feature in cells for cells in complete):
                self.report.fail(
                    f"sdd/status.md marca «{feature}» al 100% pero {self._rel(card.path)} está {card.state}")

    # ── rutas citadas ────────────────────────────────────────────────────────
    def check_cited_paths(self) -> None:
        docs = [self.root / d for d in self.config.cited_paths_docs]
        docs += [c.path for c in self.cards if c.state == "done"]
        top_dirs = {p.name for p in self.root.iterdir() if p.is_dir() and not p.name.startswith(".git")}
        broken, checked = [], 0
        for doc in docs:
            if not doc.is_file():
                continue
            text = doc.read_text(encoding="utf-8-sig", errors="replace")
            for target in LINK_RE.findall(text):
                target = target.split("#", 1)[0]
                if not target or target.startswith(("http:", "https:", "mailto:")) or SKIP_CHARS & set(target):
                    continue
                checked += 1
                if not (doc.parent / target).exists():
                    broken.append(f"{self._rel(doc)} → ({target})")
            for token in TICK_RE.findall(text):
                token = LINE_SUFFIX_RE.sub("", token.rstrip(".,:;"))
                if "/" not in token or SKIP_CHARS & set(token) or "..." in token or token.split("/")[0] not in top_dirs:
                    continue
                checked += 1
                if not (self.root / token).exists():
                    broken.append(f"{self._rel(doc)} → `{token}`")
            for token in self._bare_names_in_tables(text):
                checked += 1
                if token not in self._file_names():
                    broken.append(f"{self._rel(doc)} → `{token}` (en una tabla: no hay ningún archivo con ese nombre)")
        for item in broken:
            self.report.fail(f"Ruta citada que no existe: {item}")
        if not broken:
            self.report.ok(f"Rutas citadas existen ({checked} revisadas)")

    @staticmethod
    def _bare_names_in_tables(text: str) -> list[str]:
        """`consultas.py` (sin carpeta, entre backticks) en una fila de tabla. Con carpeta ya lo cubre la regla
        general; en prosa no se revisa, porque ahí suele ser genérico («tu `index.js`»)."""
        names = []
        for line in text.splitlines():
            if not line.lstrip().startswith("|"):
                continue
            for token in TICK_RE.findall(line):
                token = LINE_SUFFIX_RE.sub("", token.rstrip(".,:;"))
                if BARE_FILE_RE.match(token) and token.lower() not in LIBRARY_NAMES:
                    names.append(token)
        return names

    def _file_names(self) -> set[str]:
        """Nombres de los archivos del proyecto, en disco como la regla general. Se arma una vez y solo si hace falta."""
        if self._names is None:
            self._names = set()
            for _, dirs, files in os.walk(self.root):
                dirs[:] = [d for d in dirs if d not in WALK_SKIP]
                self._names.update(files)
        return self._names

    # ── handbacks de la rama actual ──────────────────────────────────────────
    def check_handbacks(self) -> None:
        folder = self.repo.progress_dir
        loose = [p for p in self.repo.uncommitted(self._rel(folder)) if Path(p).name.startswith("handback_")]
        if loose:
            self.report.warn("Handback sin commitear (commitealo antes de responder `done`): " + ", ".join(loose))
        for path in sorted(folder.glob("handback_*.md")):
            text = path.read_text(encoding="utf-8-sig", errors="replace")
            rel = self._rel(path)
            header = [ln for ln in text.splitlines()[:12] if "commit" in ln.lower()]
            if not any(HASH_RE.search(ln) for ln in header) or "ver git log" in text or "ver `git log" in text:
                self.report.warn(f"{rel}: la línea de commit no tiene el hash (`rama @ a942c177`, no «ver git log»)")
            tabs = [n for n, ln in enumerate(text.splitlines(), 1) if MID_TOKEN_TAB.search(ln)]
            if tabs:
                self.report.warn(f"{rel}: TAB literal en la(s) línea(s) {', '.join(map(str, tabs[:5]))} (¿una ruta `tests\\t…` pegada?)")

    # ── drift: un E2E declarado que nunca corrió (S29) ───────────────────────
    def check_e2e_registered(self) -> None:
        if not self.config.e2e or self.e2e_running:
            return
        record = e2e_record(self.root, self.config.master)
        if not record.is_file() or not record.read_text(encoding="utf-8").strip():
            self.report.warn(f"e2e declarado pero sin ninguna corrida verde registrada en {self._rel(record)} "
                             "(corré `verify.py --e2e`): un E2E que nunca corrió no prueba nada")

    def _rel(self, path: Path) -> str:
        try:
            return path.resolve().relative_to(self.root.resolve()).as_posix()
        except ValueError:
            return path.as_posix()
