"""Hallazgos de usar el paquete en 4 proyectos reales (v0.32): uno por hallazgo, en rojo primero (R29)."""
from __future__ import annotations

import contextlib
import io
import json
import unittest

from support import HARNESS, PASS_CMD, Project

import verify
from checks import Card, HarnessChecks
from config import HarnessConfig
from report import Report

PACKAGE = HARNESS.parent


class CampoCase(unittest.TestCase):
    def setUp(self) -> None:
        self.p = Project()

    def tearDown(self) -> None:
        self.p.cleanup()

    def checks(self) -> Report:
        report = Report()
        HarnessChecks(self.p.root, HarnessConfig.load(self.p.root), report).run_all()
        return report

    def verify(self, *args: str) -> tuple[int, str]:
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            code = verify.main([*args, "--root", str(self.p.root)])
        return code, out.getvalue()

    def is_lite(self) -> bool:
        """Se mide por lo que hace el arnés, no por cómo lo decide: en LITE no aparece la memoria en disco."""
        self.checks()
        return not (self.p.root / "sdd/progress/main/current.md").exists()

    def fails(self, report: Report, fragment: str) -> list[str]:
        return [f for f in report.messages("FAIL") if fragment in f]


# ── H7 · En modo LITE no hay memoria en disco: verify.py no la crea ni la pide ────────────────────────
class TestModoLite(CampoCase):
    def test_lite_en_custom_no_crea_progress(self):
        self.p.write("sdd/custom.md", "## Mis overrides\n\n```\nMODO=LITE\n```\n")
        report = self.checks()
        self.assertEqual(report.messages("FAIL"), [])
        self.assertFalse((self.p.root / "sdd" / "progress").exists())
        self.assertTrue(any("LITE" in m for m in report.messages("OK")), report.lines)

    def test_quick_en_lite_no_deja_nada_sin_commitear(self):
        # El pre-commit corre --quick: en LITE no puede ensuciar el working tree en cada commit.
        self.p.write("sdd/custom.md", "MODO=LITE\n")
        self.p.commit("lite")
        code, out = self.verify("--quick")
        self.assertEqual(code, 0, out)
        self.assertEqual(self.p.git("status", "--porcelain"), "")

    def test_manda_la_ultima_linea_de_modo(self):
        # El custom.md del paquete trae `MODO=FULL` en el bloque de sintaxis y los overrides después.
        self.p.write("sdd/custom.md", "## Sintaxis\n```\nMODO=FULL  # modo por defecto\n```\n"
                                      "## Mis overrides\n```\nMODO=LITE\n```\n")
        self.assertTrue(self.is_lite())

    def test_lite_declarado_en_la_identidad_del_master(self):
        self.p.write("sdd/SDD-MASTER.md", "## §3\n- **Modo por tamaño (R18):** LITE — **Variante de dominio:** WEB\n")
        self.assertTrue(self.is_lite())

    def test_lite_declarado_en_el_encabezado_de_sdd_lite(self):
        # prompts/sdd-lite.md: en LITE puede no haber custom.md, y el master es la copia del núcleo.
        self.p.write("sdd/sdd-lite.md", "# sdd-lite.md · Turnos\n\n**Versión:** 0.1.0 · **Modo:** LITE (R18) · "
                                        "**Variante:** WEB\n")
        self.assertTrue(self.is_lite())

    def test_plantilla_sdd_lite_del_paquete_es_lite(self):
        template = PACKAGE / "prompts" / "sdd-lite.md"
        if not template.is_file():
            self.skipTest("fuera del paquete SDD Universal")
        block = template.read_text(encoding="utf-8").split("```markdown\n", 1)[1].split("\n```", 1)[0]
        self.p.write("sdd/sdd-lite.md", block)
        self.assertTrue(self.is_lite())

    def test_la_linea_de_plantilla_del_master_no_es_lite(self):
        self.p.write("sdd/SDD-MASTER.md", "- **Modo por tamaño (R18):** FULL / LITE / COMPACT / FEDERADO\n")
        self.assertFalse(self.is_lite())

    def test_custom_pisa_al_master(self):
        self.p.write("sdd/SDD-MASTER.md", "- **Modo por tamaño (R18):** LITE\n")
        self.p.write("sdd/custom.md", "MODO=FULL\n")
        self.assertFalse(self.is_lite())

    def test_full_sigue_creando_current(self):
        self.p.write("sdd/custom.md", "MODO=FULL\n")
        self.checks()
        self.assertTrue((self.p.root / "sdd/progress/main/current.md").is_file())

    def test_custom_del_paquete_es_full(self):
        custom = PACKAGE / "custom.md"
        if not custom.is_file():
            self.skipTest("fuera del paquete SDD Universal")
        self.p.write("sdd/custom.md", custom.read_text(encoding="utf-8"))
        self.assertFalse(self.is_lite())


# ── H13 · Rutas citadas dentro de celdas de tabla ─────────────────────────────────────────────────────
class TestRutasEnTablas(CampoCase):
    TABLA = "| Capa | Archivo |\n|---|---|\n| datos | {celda} |\n"

    def test_nombre_suelto_en_tabla_que_no_existe_falla(self):
        self.p.write("src/app.py", "")
        self.p.write("AGENTS.md", self.TABLA.format(celda="`consultas.py`"))
        self.assertTrue(self.fails(self.checks(), "`consultas.py`"))

    def test_nombre_suelto_en_tabla_que_existe_en_alguna_carpeta_pasa(self):
        self.p.write("backend/db/consultas.py", "")
        self.p.write("AGENTS.md", self.TABLA.format(celda="`consultas.py`"))
        report = self.checks()
        self.assertEqual(report.messages("FAIL"), [])
        self.assertIn("Rutas citadas existen (1 revisadas)", report.messages("OK"))

    def test_tarjeta_done_con_tabla_rota_falla(self):
        self.p.card(estado="done", rama="main",
                    criterios="1. ver la tabla\n\n| Qué | Dónde |\n|---|---|\n| queries | `consultas.py` |")
        self.p.review()
        self.assertTrue(self.fails(self.checks(), "`consultas.py`"))

    def test_tabla_sin_falsos_positivos(self):
        celdas = ["`os.path`", "`HarnessConfig.load`", "`v0.32`", "`1.5`", "`README`", "`*.py`", "`<modulo>.py`",
                  "`Node.js`", "`Next.js`", "`chart.js`", "`npm test`", "`e.g.`", "consultas.py sin backticks",
                  "`.env`", "`req.body`"]
        filas = "".join(f"| x | {c} |\n" for c in celdas)
        self.p.write("AGENTS.md", "| Capa | Archivo |\n|---|---|\n" + filas)
        self.assertEqual(self.checks().messages("FAIL"), [])

    def test_nombre_suelto_fuera_de_tabla_no_se_revisa(self):
        # En prosa, `index.js` suele ser genérico («tu index.js»): la regla vieja sigue igual.
        self.p.write("AGENTS.md", "Si tu proyecto tiene un `index.js`, empezá por ahí.\n")
        self.assertEqual(self.checks().messages("FAIL"), [])


# ── H23 · La plantilla de tarjeta trae `rama` y el FAIL dice cómo arreglarlo ──────────────────────────
class TestRamaDeLaTarjeta(CampoCase):
    def test_plantilla_del_paquete_trae_rama(self):
        template = PACKAGE / "prompts" / "task-card.md"
        if not template.is_file():
            self.skipTest("fuera del paquete SDD Universal")
        block = template.read_text(encoding="utf-8").split("```markdown\n", 1)[1].split("\n```", 1)[0]
        card = Card.parse(self.p.write("sdd/cards/H-1.md", block))
        self.assertEqual(card.meta.get("rama"), "main")

    def test_done_sin_rama_dice_como_arreglarlo(self):
        self.p.card(estado="done", rama="")
        fails = self.fails(self.checks(), "done sin 'rama'")
        self.assertTrue(fails)
        self.assertIn("rama:", fails[0].split("done sin 'rama'", 1)[1])

    def test_done_sin_rama_sugiere_la_carpeta_de_su_review(self):
        self.p.card(estado="done", rama="")
        self.p.review(rama="feat/login")
        fails = self.fails(self.checks(), "done sin 'rama'")
        self.assertTrue(fails)
        self.assertIn("`rama: feat-login`", fails[0])

    def test_rama_placeholder_cuenta_como_vacia(self):
        self.p.card(estado="done", rama="<rama>")
        self.assertTrue(self.fails(self.checks(), "done sin 'rama'"))

    def test_review_sin_rama_avisa_antes_del_done(self):
        self.p.card(estado="review", rama="")
        warns = self.checks().messages("WARN")
        self.assertTrue(any("review sin 'rama'" in w for w in warns), warns)


if __name__ == "__main__":
    unittest.main()
