#!/usr/bin/env python3
"""Sincronía entre los nodos de graph/ y el código que describen, para que el Cerebro (Obsidian) no
se desfase de lo que el código hace de verdad.

  python graph/_meta/sync_graph.py --check              falla (exit 1) si algún nodo quedó desactualizado
  python graph/_meta/sync_graph.py --update              muestra qué nodos cambiarían, sin escribir nada
  python graph/_meta/sync_graph.py --update --accept     escribe el hash nuevo (ya revisaste el drift a mano)

Sin dependencias: Python 3.10+. Un nodo es cualquier `.md` en `graph/` (menos `graph/_meta/`, que es
este script) con frontmatter:

  ---
  id: cerebro
  rutas: [cerebro/**]
  hash:
  ---

  # cerebro

  Prosa libre: qué hace esta parte del repo, decisiones, por qué. Esto es lo que lee un humano o el
  Cerebro; `sync_graph.py` nunca la toca.

`rutas` son rutas relativas a la raíz del repo, entre corchetes. `carpeta/**` recorre la carpeta
entera (archivos nuevos o borrados también cuentan); una ruta sin `**` es un archivo puntual o una
carpeta completa (equivalente a agregarle `/**`). El hash cubre el contenido Y la lista de archivos
resueltos: cualquier cambio bajo esas rutas lo desactualiza. `--update --accept` lo pisa después de
que revisaste (o escribiste) la prosa del nodo — igual que `verify.py --e2e` registra un verde.
"""
from __future__ import annotations

import argparse
import hashlib
import os
import re
import sys
from pathlib import Path

HASH_LINE_RE = re.compile(r"^hash:.*$", re.M)
SKIP_DIRS = {".git", "__pycache__", "node_modules", ".venv", "venv", ".next", ".nuxt", "dist", "build", ".data"}


class NodeError(Exception):
    """Un nodo con frontmatter roto: se informa aparte y no cuenta como sincronizado ni desincronizado."""


def _clean_value(raw: str) -> str:
    """Como YAML liviano: comillas que envuelven el valor, y ` #` abre un comentario salvo entre comillas."""
    raw = raw.strip()
    if raw[:1] in ("'", '"') and raw[0] in raw[1:]:
        return raw[1:raw.index(raw[0], 1)]
    return re.split(r"\s#", raw, maxsplit=1)[0].strip()


def _parse_rutas(value: str, path: Path) -> list[str]:
    value = _clean_value(value)
    match = re.match(r"^\[([^\[\]]*)\]$", value)
    if not match:
        raise NodeError(f"{path}: 'rutas' no está entre corchetes ({value!r}); escribí rutas: [a, b]")
    items = (item.strip().strip("'\"").strip() for item in match.group(1).split(","))
    rutas = [i for i in items if i]
    if not rutas:
        raise NodeError(f"{path}: 'rutas' está vacío — qué código describe este nodo")
    return rutas


class Node:
    def __init__(self, path: Path, meta: dict[str, str], rutas: list[str]) -> None:
        self.path = path
        self.meta = meta
        self.rutas = rutas

    @property
    def id(self) -> str:
        return self.meta.get("id", self.path.stem)

    @property
    def hash(self) -> str:
        return self.meta.get("hash", "")

    @classmethod
    def parse(cls, path: Path) -> "Node | None":
        """`None` si el archivo no tiene frontmatter: no es un nodo (p.ej. `graph/README.md`), no un error."""
        text = path.read_text(encoding="utf-8-sig", errors="replace")
        if not text.startswith("---"):
            return None
        head, sep, _ = text[3:].partition("\n---")
        if not sep:
            raise NodeError(f"{path}: frontmatter sin cerrar (falta el '---' final)")
        meta: dict[str, str] = {}
        rutas: list[str] = []
        for line in head.splitlines():
            key, colon, value = line.partition(":")
            if not colon or not key.strip():
                continue
            key = key.strip()
            if key == "rutas":
                rutas = _parse_rutas(value, path)
            else:
                meta[key] = _clean_value(value)
        if not rutas:
            raise NodeError(f"{path}: sin 'rutas' (qué código describe este nodo)")
        return cls(path, meta, rutas)


def _walk(base: Path) -> list[Path]:
    files = []
    for dirpath, dirnames, filenames in os.walk(base):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        files.extend(Path(dirpath) / name for name in filenames)
    return files


def resolve_ruta(root: Path, ruta: str) -> list[Path]:
    """`carpeta/**` recorre la carpeta entera; sin `**`, un archivo puntual o una carpeta completa."""
    base = root / (ruta[:-3] if ruta.endswith("/**") else ruta)
    if base.is_dir():
        return _walk(base)
    if base.is_file():
        return [base]
    return []


def compute_hash(root: Path, rutas: list[str]) -> tuple[str, list[str]]:
    files: list[Path] = []
    missing: list[str] = []
    for ruta in rutas:
        found = resolve_ruta(root, ruta)
        if found:
            files.extend(found)
        else:
            missing.append(ruta)
    ordered = sorted(set(files), key=lambda p: p.relative_to(root).as_posix())
    digest = hashlib.sha256()
    for p in ordered:
        digest.update(p.relative_to(root).as_posix().encode("utf-8"))
        digest.update(b"\0")
        digest.update(p.read_bytes())
        digest.update(b"\0")
    return digest.hexdigest(), missing


def load_nodes(root: Path) -> tuple[list[Node], list[str]]:
    graph_dir = root / "graph"
    nodes: list[Node] = []
    errors: list[str] = []
    if not graph_dir.is_dir():
        return nodes, errors
    for path in sorted(graph_dir.rglob("*.md")):
        if path.relative_to(graph_dir).parts[0] == "_meta":
            continue
        try:
            node = Node.parse(path)
        except NodeError as exc:
            errors.append(str(exc))
            continue
        if node is not None:
            nodes.append(node)
    return nodes, errors


def rel(root: Path, path: Path) -> str:
    try:
        return path.resolve().relative_to(root.resolve()).as_posix()
    except ValueError:
        return path.as_posix()


def write_hash(path: Path, new_hash: str) -> None:
    """Pisa (o agrega) la línea `hash:` del frontmatter, preservando el resto del archivo tal cual
    (incluido CRLF si lo tenía: los git hooks de este repo son sensibles al fin de línea)."""
    raw = path.read_bytes()
    eol = b"\r\n" if b"\r\n" in raw else b"\n"
    text = raw.decode("utf-8-sig").replace("\r\n", "\n")
    if HASH_LINE_RE.search(text):
        text = HASH_LINE_RE.sub(f"hash: {new_hash}", text, count=1)
    else:
        text = text.replace("\n---", f"\nhash: {new_hash}\n---", 1)
    data = text.encode("utf-8")
    if eol == b"\r\n":
        data = data.replace(b"\n", b"\r\n")
    path.write_bytes(data)


def cmd_check(root: Path) -> int:
    nodes, errors = load_nodes(root)
    stale: list[str] = []
    for node in nodes:
        new_hash, missing = compute_hash(root, node.rutas)
        for ruta in missing:
            errors.append(f"{rel(root, node.path)}: la ruta {ruta!r} no encuentra ningún archivo")
        if not node.hash:
            stale.append(f"{rel(root, node.path)}: nunca sincronizado (sin 'hash')")
        elif new_hash != node.hash:
            stale.append(f"{rel(root, node.path)}: desactualizado respecto de {', '.join(node.rutas)}")
    for msg in errors + stale:
        print(f"[graph] {msg}", file=sys.stderr)
    if errors or stale:
        print("", file=sys.stderr)
        print("[graph] El grafo de contexto está desactualizado respecto del código.", file=sys.stderr)
        print("[graph] Actualizá la prosa de los nodos afectados en graph/ y luego:", file=sys.stderr)
        print("[graph]   python graph/_meta/sync_graph.py --update --accept", file=sys.stderr)
        return 1
    print(f"[graph] {len(nodes)} nodo(s) al día")
    return 0


def cmd_update(root: Path, accept: bool) -> int:
    nodes, errors = load_nodes(root)
    for msg in errors:
        print(f"[graph] {msg}", file=sys.stderr)
    changed = 0
    for node in nodes:
        new_hash, missing = compute_hash(root, node.rutas)
        for ruta in missing:
            print(f"[graph] {rel(root, node.path)}: la ruta {ruta!r} no encuentra ningún archivo", file=sys.stderr)
        if new_hash == node.hash:
            continue
        changed += 1
        old = node.hash[:12] if node.hash else "(nunca sincronizado)"
        print(f"[graph] {rel(root, node.path)}: {old} -> {new_hash[:12]}")
        if accept:
            write_hash(node.path, new_hash)
    if not changed:
        print(f"[graph] {len(nodes)} nodo(s) al día, nada para actualizar")
    elif accept:
        print(f"\n[graph] {changed} nodo(s) actualizados.")
    else:
        print(f"\n[graph] {changed} nodo(s) cambiarían. Sumá --accept para escribirlo.")
    return 1 if errors else 0


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sincronía entre graph/ y el código que describe")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true", help="falla si algún nodo quedó desactualizado")
    mode.add_argument("--update", action="store_true", help="recalcula los hashes (con --accept, los escribe)")
    parser.add_argument("--accept", action="store_true", help="con --update, escribe el hash nuevo")
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parent.parent.parent,
                        help="raíz del proyecto (default: la carpeta que contiene graph/)")
    args = parser.parse_args(argv)
    if args.accept and not args.update:
        parser.error("--accept solo tiene sentido junto con --update")
    return args


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    args = parse_args(argv)
    root = args.root.resolve()
    if args.check:
        return cmd_check(root)
    return cmd_update(root, args.accept)


if __name__ == "__main__":
    sys.exit(main())
