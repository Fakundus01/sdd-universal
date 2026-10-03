"""Integridad del arnés: lo que corre `verify.py --quick` (harness.md §7)."""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from config import HarnessConfig
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
        if text.startswith("---"):
            head, sep, rest = text[3:].partition("\n---")
            if sep:
                body = rest
                for line in head.splitlines():
                    key, colon, value = line.partition(":")
                    if colon and key.strip():
                        meta[key.strip()] = _clean_value(value)
        return cls(path, meta, body, cls._criteria(body))

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
        if not (self.root / "sdd" / "SDD-MASTER.md").is_file():
            self.report.fail("Falta sdd/SDD-MASTER.md: el arnés se apoya en el SDD (R30)")
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
            if card.state == "in_progress":
                if not branch:
                    self.report.fail(f"{rel}: in_progress sin 'rama'")
                    errors += 1
                else:
                    in_progress.setdefault(branch, []).append(card.id)
            if card.state == "done":
                errors += self._check_done(card, rel, branch)
            elif not card.criteria:
                self.report.warn(f"{rel}: sin criterios de aceptación — no puede salir de pending")
        for branch, ids in in_progress.items():
            if len(ids) > 1:
                self.report.fail(f"rama {branch}: {len(ids)} tarjetas in_progress ({', '.join(ids)}); máximo 1 por rama")
                errors += 1
        if self.cards and not errors:
            self.report.ok(f"Tarjetas válidas ({len(self.cards)})")

    def _check_done(self, card: Card, rel: str, branch: str) -> int:
        if not card.criteria:
            self.report.fail(f"{rel}: done sin criterios de aceptación")
            return 1
        if not branch:
            self.report.fail(f"{rel}: done sin 'rama' — no se puede ubicar su review")
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
        for item in broken:
            self.report.fail(f"Ruta citada que no existe: {item}")
        if not broken:
            self.report.ok(f"Rutas citadas existen ({checked} revisadas)")

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
        record = self.root / "sdd" / "progress" / "e2e.md"
        if not record.is_file() or not record.read_text(encoding="utf-8").strip():
            self.report.warn("e2e declarado pero sin ninguna corrida verde registrada en sdd/progress/e2e.md "
                             "(corré `verify.py --e2e`): un E2E que nunca corrió no prueba nada")

    def _rel(self, path: Path) -> str:
        try:
            return path.resolve().relative_to(self.root.resolve()).as_posix()
        except ValueError:
            return path.as_posix()
