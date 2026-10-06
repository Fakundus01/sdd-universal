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


# ── Review R30 de v0.33 (B1, M1, M2, N9): el arnés LITE contra el caso real ─────────────────────────
LITE_REAL = ("# sdd-lite.md · Landing — captar consultas\n\n"
             "**Versión:** 0.3.0 · **Fecha:** 2026-10-01 · **Owner:** Facu · **Modo:** LITE (R18) · **Variante:** WEB\n\n"
             "## §3 · Identidad del proyecto\n- **Problema:** consultas que se pierden\n"
             "- **Modo de autonomía:** CONFIANZA (R01=OFF: commitea y pushea solo)\n")


class TestReviewV033(CampoCase):
    def lite(self, extra: str = "") -> None:
        self.p.write("sdd/sdd-lite.md", LITE_REAL + extra)

    # B1 · H13 tal cual: LITE, config por defecto, la fila rota en sdd-lite.md
    def test_h13_tal_cual_en_lite_con_config_por_defecto(self):
        self.lite("\n## 7 · Contratos\n| Qué | Dónde |\n|---|---|\n| Consulta | `consultas_inexistente.py` |\n")
        fails = self.fails(self.checks(), "`consultas_inexistente.py`")
        self.assertTrue(fails)
        self.assertIn("sdd/sdd-lite.md", fails[0])

    def test_spec_md_se_revisa_por_defecto(self):
        self.p.write("sdd/spec.md", "| Capa | Archivo |\n|---|---|\n| datos | `consultas.py` |\n")
        self.assertTrue(self.fails(self.checks(), "sdd/spec.md → `consultas.py`"))

    def test_master_y_orchestration_no_se_revisan_por_defecto(self):
        # Citan archivos opcionales (`GEMINI.md`, `metrics.md`): serían falsos positivos.
        fila = "| x | `GEMINI.md` | `metrics.md` |\n"
        self.p.write("sdd/SDD-MASTER.md", "# master\n" + fila)
        self.p.write("sdd/orchestration.md", fila)
        self.assertEqual(self.checks().messages("FAIL"), [])

    # M1 · en LITE el registro del e2e no crea progress/
    def test_e2e_en_lite_registra_en_sdd_e2e(self):
        self.lite()
        self.p.write("harness.config.json", json.dumps({"test": PASS_CMD, "e2e": PASS_CMD}))
        self.p.commit("lite con e2e")
        code, out = self.verify("--quick", "--e2e")
        self.assertEqual(code, 0, out)
        self.assertFalse((self.p.root / "sdd" / "progress").exists())
        self.assertIn("e2e verde", (self.p.root / "sdd" / "e2e.md").read_text(encoding="utf-8"))

    def test_e2e_sin_registro_en_lite_avisa_con_sdd_e2e(self):
        self.lite()
        self.p.write("harness.config.json", json.dumps({"test": PASS_CMD, "e2e": PASS_CMD}))
        warns = self.checks().messages("WARN")
        self.assertTrue(any("sdd/e2e.md" in w for w in warns), warns)
        self.p.write("sdd/e2e.md", "- 2026-10-05 @ a942c177 — e2e verde\n")
        self.assertEqual(self.checks().messages("WARN"), [])

    def test_relevo_en_lite_va_a_sdd_lite(self):
        for rel in ("prompts/relevo.md", "skills/relevo/SKILL.md"):
            path = PACKAGE / rel
            if not path.is_file():
                self.skipTest("fuera del paquete SDD Universal")
            self.assertIn("sdd/sdd-lite.md", path.read_text(encoding="utf-8"), rel)

    # M2 · el encabezado real trae `**Modo:** LITE` y también `**Modo de autonomía:** CONFIANZA`
    def test_encabezado_real_con_modo_de_autonomia_sigue_siendo_lite(self):
        self.lite()
        self.assertTrue(self.is_lite())

    # N9
    def test_node_modules_no_tapa_una_cita_rota(self):
        self.p.write("node_modules/paquete/index.js", "")
        self.p.write("AGENTS.md", "| Entrada | `index.js` |\n|---|---|\n")
        self.assertTrue(self.fails(self.checks(), "`index.js`"))

    def test_modo_comentado_o_en_prosa_no_cuenta(self):
        self.p.write("sdd/custom.md", "# MODO=LITE\nSi es chico, poné MODO=LITE en tus overrides.\n")
        self.assertFalse(self.is_lite())

    def test_md_suelto_en_tabla_se_revisa(self):
        self.p.write("AGENTS.md", "| Doc | `notas-de-diseno.md` |\n|---|---|\n")
        self.assertTrue(self.fails(self.checks(), "`notas-de-diseno.md`"))

    def test_librerias_de_ia_y_documentos_no_son_rutas(self):
        filas = "".join(f"| x | `{n}` |\n" for n in ("Transformers.js", "PDF.js", "TensorFlow.js", "Highlight.js",
                                                     "Swiper.js"))
        self.p.write("AGENTS.md", "| Capa | Librería |\n|---|---|\n" + filas)
        self.assertEqual(self.checks().messages("FAIL"), [])


if __name__ == "__main__":
    unittest.main()
