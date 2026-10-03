"""Cada check del arnés con su rojo forzado: el caso que tiene que fallar, falla (R29)."""
from __future__ import annotations

import json
import unittest

from support import Project

from checks import HarnessChecks
from config import ConfigError, HarnessConfig
from report import Report
from repo import Repo


class ChecksCase(unittest.TestCase):
    def setUp(self) -> None:
        self.p = Project()

    def tearDown(self) -> None:
        self.p.cleanup()

    def run_checks(self) -> Report:
        report = Report()
        HarnessChecks(self.p.root, HarnessConfig.load(self.p.root), report).run_all()
        return report

    def assertFails(self, report: Report, fragment: str) -> None:
        fails = report.messages("FAIL")
        self.assertTrue(any(fragment in f for f in fails), f"esperaba un FAIL con {fragment!r}; hubo: {fails}")

    def assertWarns(self, report: Report, fragment: str) -> None:
        warns = report.messages("WARN")
        self.assertTrue(any(fragment in w for w in warns), f"esperaba un WARN con {fragment!r}; hubo: {warns}")


class TestBase(ChecksCase):
    def test_proyecto_minimo_en_verde(self):
        report = self.run_checks()
        self.assertEqual(report.messages("FAIL"), [])

    def test_crea_current_md_si_falta(self):
        self.run_checks()
        self.assertTrue((self.p.root / "sdd/progress/main/current.md").is_file())
        self.assertIn("rama `main`", (self.p.root / "sdd/progress/main/current.md").read_text(encoding="utf-8"))

    def test_sin_master_falla(self):
        (self.p.root / "sdd/SDD-MASTER.md").unlink()
        self.assertFails(self.run_checks(), "sdd/SDD-MASTER.md")

    def test_config_sin_test_no_carga(self):
        self.p.write("harness.config.json", json.dumps({"lint": "x"}))
        with self.assertRaisesRegex(ConfigError, "falta 'test'"):
            HarnessConfig.load(self.p.root)

    def test_config_ausente_no_carga(self):
        (self.p.root / "harness.config.json").unlink()
        with self.assertRaisesRegex(ConfigError, "falta harness.config.json"):
            HarnessConfig.load(self.p.root)

    def test_config_json_roto_no_carga(self):
        self.p.write("harness.config.json", "{test:")
        with self.assertRaisesRegex(ConfigError, "no es JSON"):
            HarnessConfig.load(self.p.root)

    def test_clave_desconocida_avisa(self):
        self.p.write("harness.config.json", json.dumps({"test": "x", "tset_quick": "y"}))
        self.assertWarns(self.run_checks(), "tset_quick")


class TestTarjetas(ChecksCase):
    def test_tarjeta_valida(self):
        self.p.card()
        report = self.run_checks()
        self.assertEqual(report.messages("FAIL"), [])
        self.assertIn("Tarjetas válidas (1)", report.messages("OK"))

    def test_id_distinto_del_archivo(self):
        path = self.p.card(id="H-1")
        path.rename(path.with_name("H-2.md"))
        self.assertFails(self.run_checks(), "no coincide con el nombre")

    def test_estado_invalido(self):
        self.p.card(estado="hecho")
        self.assertFails(self.run_checks(), "estado inválido 'hecho'")

    def test_in_progress_sin_rama(self):
        self.p.card(estado="in_progress")
        self.assertFails(self.run_checks(), "in_progress sin 'rama'")

    def test_dos_in_progress_en_la_misma_rama(self):
        self.p.card(id="H-1", estado="in_progress", rama="feat/x")
        self.p.card(id="H-2", estado="in_progress", rama="feat/x")
        self.assertFails(self.run_checks(), "2 tarjetas in_progress")

    def test_pending_sin_criterios_avisa(self):
        self.p.card(criterios="1. <verificable>")
        self.assertWarns(self.run_checks(), "sin criterios de aceptación")

    def test_done_sin_criterios_falla(self):
        self.p.card(estado="done", rama="main", criterios="")
        self.p.review()
        self.assertFails(self.run_checks(), "done sin criterios")

    def test_done_sin_review_falla(self):
        self.p.card(estado="done", rama="main")
        self.assertFails(self.run_checks(), "nadie se aprueba a sí mismo")

    def test_done_con_review_rechazado_falla(self):
        self.p.card(estado="done", rama="main")
        self.p.review(verdict="CHANGES_REQUESTED")
        self.assertFails(self.run_checks(), "no está en APPROVED")

    def test_done_con_review_sin_hash_falla(self):
        self.p.card(estado="done", rama="main")
        self.p.review(title_hash="HEAD")
        self.assertFails(self.run_checks(), "qué hash se revisó")

    def test_done_aprobado_con_hash_pasa(self):
        self.p.card(estado="done", rama="feat/login")
        self.p.review(rama="feat/login")
        self.assertEqual(self.run_checks().messages("FAIL"), [])

    def test_status_al_100_con_tarjeta_abierta_falla(self):
        self.p.card(feature="Login")
        self.p.write("sdd/status.md", "| Login | Complete 100% |\n")
        self.assertFails(self.run_checks(), "marca «Login» al 100%")

    def test_status_al_80_con_tarjeta_abierta_pasa(self):
        self.p.card(feature="Login")
        self.p.write("sdd/status.md", "| Login | In Progress 80% |\n")
        self.assertEqual(self.run_checks().messages("FAIL"), [])


class TestRutasCitadas(ChecksCase):
    def test_ruta_inexistente_falla(self):
        self.p.write("src/app.py", "")
        self.p.write("AGENTS.md", "Ver `src/no_existe.py` y [guía](docs/guia.md).\n")
        report = self.run_checks()
        self.assertFails(report, "`src/no_existe.py`")
        self.assertFails(report, "(docs/guia.md)")

    def test_rutas_existentes_y_placeholders_pasan(self):
        self.p.write("src/app.py", "")
        self.p.write("AGENTS.md", "Ver `src/app.py`, `src/<modulo>.py`, `npm/test` y [web](https://x.y).\n")
        report = self.run_checks()
        self.assertEqual(report.messages("FAIL"), [])
        self.assertIn("Rutas citadas existen (1 revisadas)", report.messages("OK"))

    def test_tarjeta_done_con_ruta_rota_falla(self):
        self.p.write("src/a.py", "")
        self.p.card(estado="done", rama="main", criterios="1. lo prueba `src/test_borrado.py`")
        self.p.review()
        self.assertFails(self.run_checks(), "`src/test_borrado.py`")

    def test_tarjeta_pending_puede_citar_archivos_a_crear(self):
        self.p.write("src/a.py", "")
        self.p.card(criterios="1. existe `src/nuevo.py`")
        self.assertEqual(self.run_checks().messages("FAIL"), [])


class TestHandbacks(ChecksCase):
    def handback(self, text: str) -> None:
        self.p.write("sdd/progress/main/handback_H-1.md", text)

    def test_handback_sin_commitear_avisa(self):
        self.handback("- **Rama / commit:** `main` @ `a942c177`\n")
        self.assertWarns(self.run_checks(), "Handback sin commitear")

    def test_handback_commiteado_con_hash_no_avisa(self):
        self.handback("- **Rama / commit:** `main` @ `a942c177`\n")
        self.p.commit("handback")
        self.assertEqual(self.run_checks().messages("WARN"), [])

    def test_handback_sin_hash_avisa(self):
        self.handback("- **Rama / commit:** `main` @ ver git log\n")
        self.assertWarns(self.run_checks(), "no tiene el hash")

    def test_handback_con_tab_avisa(self):
        self.handback("- **Rama / commit:** `main` @ `a942c177`\nToqué tests\test_x.py\n".replace("\\t", "\t"))
        self.assertWarns(self.run_checks(), "TAB literal en la(s) línea(s) 2")


class TestE2E(ChecksCase):
    def test_e2e_declarado_sin_corrida_avisa(self):
        self.p.write("harness.config.json", json.dumps({"test": "x", "e2e": "y"}))
        self.assertWarns(self.run_checks(), "nunca corrió")

    def test_e2e_con_corrida_registrada_no_avisa(self):
        self.p.write("harness.config.json", json.dumps({"test": "x", "e2e": "y"}))
        self.p.write("sdd/progress/e2e.md", "- 2026-10-02 @ a942c177 — e2e verde\n")
        self.assertEqual(self.run_checks().messages("WARN"), [])


class TestRepoSinCommits(unittest.TestCase):
    def test_la_rama_se_conoce_antes_del_primer_commit(self):
        p = Project(git=False)
        try:
            p.git("init", "-q", "-b", "trunk")
            self.assertEqual(Repo(p.root).branch, "trunk")
        finally:
            p.cleanup()


if __name__ == "__main__":
    unittest.main()
