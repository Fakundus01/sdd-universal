"""Genera web/og.png (la imagen para compartir el link). Cierra la deuda D5.

    python web/og.py

Necesita Pillow (`pip install pillow`). El número de reglas sale de
SDD-MASTER.md, así que la imagen no vuelve a quedar vieja cuando entra una
regla: alcanza con correr esto de nuevo.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

RAIZ = Path(__file__).resolve().parent.parent
ANCHO, ALTO, MARGEN = 1200, 630, 85

FONDO, ACENTO, TITULO = "#101527", "#817aff", "#ffffff"
TEXTO, CHIP_BORDE, CHIP_TEXTO = "#8f9bb8", "#2b3352", "#a3aecb"

# Segoe UI en Windows; DejaVu como respaldo en Linux/macOS (el resultado cambia un poco).
FUENTES = {
    "bold": ["C:/Windows/Fonts/segoeuib.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"],
    "semi": ["C:/Windows/Fonts/seguisb.ttf", "C:/Windows/Fonts/segoeuib.ttf",
             "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"],
    "normal": ["C:/Windows/Fonts/segoeui.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"],
}


def fuente(peso: str, tam: int) -> ImageFont.FreeTypeFont:
    for ruta in FUENTES[peso]:
        if Path(ruta).exists():
            return ImageFont.truetype(ruta, tam)
    sys.exit(f"No encontré una fuente para «{peso}»: probé {FUENTES[peso]}")


def cantidad_de_reglas() -> int:
    master = (RAIZ / "SDD-MASTER.md").read_text(encoding="utf-8")
    return len(re.findall(r"^\*\*R\d\d · ", master, re.M))


def main() -> None:
    img = Image.new("RGB", (ANCHO, ALTO), FONDO)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, ANCHO, 7], fill=ACENTO)

    d.text((MARGEN, 100), "SDD UNIVERSAL", font=fuente("bold", 32), fill=ACENTO)
    titulo = fuente("bold", 84)
    d.text((MARGEN, 170), "Spec-Driven Development", font=titulo, fill=TITULO)
    d.text((MARGEN, 268), "para construir con IA", font=titulo, fill=TITULO)

    texto = fuente("normal", 30)
    for i, linea in enumerate(["La especificación va antes que el código.",
                               "Funciona con Claude, Codex, Cursor, Copilot y Gemini —",
                               "sepas programar o no."]):
        d.text((MARGEN, 392 + i * 43), linea, font=texto, fill=TEXTO)

    chip, x = fuente("bold", 23), MARGEN
    for etiqueta in [f"{cantidad_de_reglas()} reglas", "Playbooks", "Catálogo + combinador", "MIT"]:
        ancho = int(d.textlength(etiqueta, font=chip)) + 46
        d.rounded_rectangle([x, 524, x + ancho, 577], radius=27, outline=CHIP_BORDE, width=2)
        d.text((x + 23, 551), etiqueta, font=chip, fill=CHIP_TEXTO, anchor="lm")
        x += ancho + 14

    destino = RAIZ / "web" / "og.png"
    img.save(destino, optimize=True)
    print(f"{destino.relative_to(RAIZ)} · {cantidad_de_reglas()} reglas")


if __name__ == "__main__":
    main()
