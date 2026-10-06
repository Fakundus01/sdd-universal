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


class TestMasterConfigurable(ChecksCase):
    """Clave `master` (harness.md §2): el núcleo puede vivir fuera de sdd/ (L-7)."""

    ROOT_MASTER = "# master" + chr(10) * 2 + "- **Modo por tamaño (R18):** LITE — chico" + chr(10)

    def master_en_raiz(self, extra: dict | None = None) -> None:
        (self.p.root / "sdd/SDD-MASTER.md").unlink()
        self.p.write("SDD-MASTER.md", self.ROOT_MASTER)
        cfg = {"test": "x", "master": "SDD-MASTER.md"}
        cfg.update(extra or {})
        self.p.write("harness.config.json", json.dumps(cfg))

    def test_default_es_el_de_siempre(self):
        self.assertEqual(HarnessConfig.load(self.p.root).master, "sdd/SDD-MASTER.md")

    def test_master_en_raiz_da_ok(self):
        self.master_en_raiz()
        report = self.run_checks()
        self.assertEqual([f for f in report.messages("FAIL") if "SDD-MASTER" in f], [])

    def test_modo_se_lee_del_master_configurado(self):
        self.master_en_raiz()
        checks = HarnessChecks(self.p.root, HarnessConfig.load(self.p.root), Report())
        self.assertEqual(checks.mode, "LITE")

    def test_master_inexistente_nombra_la_ruta_configurada(self):
        self.p.write("harness.config.json", json.dumps({"test": "x", "master": "nucleo/MASTER.md"}))
        fails = self.run_checks().messages("FAIL")
        self.assertTrue(any("nucleo/MASTER.md" in f for f in fails), fails)
        self.assertFalse(any("sdd/SDD-MASTER.md" in f for f in fails), fails)

    def test_ruta_invalida_no_carga(self):
        for bad in ("/etc/master.md", r"C:\x\master.md", "../fuera/M.md", "sdd/../../M.md", "", 5, None, ["a"]):
            with self.subTest(master=bad):
                self.p.write("harness.config.json", json.dumps({"test": "x", "master": bad}))
                with self.assertRaisesRegex(ConfigError, "master"):
                    HarnessConfig.load(self.p.root)

    def test_ruta_con_punto_punto_que_no_sale_es_valida(self):
        self.p.write("harness.config.json", json.dumps({"test": "x", "master": "sdd/../SDD-MASTER.md"}))
        self.assertEqual(HarnessConfig.load(self.p.root).master, "sdd/../SDD-MASTER.md")

    def test_master_es_clave_conocida(self):
        self.master_en_raiz()
        self.assertEqual(HarnessConfig.load(self.p.root).unknown_keys, [])
        self.assertEqual([w for w in self.run_checks().messages("WARN") if "master" in w and "desconoc" in w], [])


class TestRepoSinCommits(unittest.TestCase):
    def test_la_rama_se_conoce_antes_del_primer_commit(self):
        p = Project(git=False)
        try:
            p.git("init", "-q", "-b", "trunk")
            self.assertEqual(Repo(p.root).branch, "trunk")
        finally:
            p.cleanup()


class TestGrafoDeTarjetas(ChecksCase):
    """orchestration.md §10: `depende_de` existe, sin ciclos, y no se despacha antes de tiempo."""

    def test_dependencia_inexistente_falla(self):
        self.p.card(id="H-1", depende_de="[X-9]")
        report = self.run_checks()
        self.assertFails(report, "H-1")
        self.assertFails(report, "X-9")
        self.assertFails(report, "no existe")

    def test_ciclo_entre_dos_falla_y_lo_muestra(self):
        self.p.card(id="H-1", depende_de="[H-2]")
        self.p.card(id="H-2", depende_de="[H-1]")
        self.assertFails(self.run_checks(), "ciclo")
        report = self.run_checks()
        self.assertFails(report, "H-1 -> H-2 -> H-1")
        self.assertEqual(len([f for f in report.messages("FAIL") if "ciclo" in f]), 1)

    def test_autodependencia_es_ciclo(self):
        self.p.card(id="H-1", depende_de="[H-1]")
        self.assertFails(self.run_checks(), "H-1 -> H-1")

    def test_in_progress_con_dependencia_sin_done_falla(self):
        self.p.card(id="H-1", estado="pending")
        self.p.card(id="H-2", estado="in_progress", rama="feat/x", depende_de="[H-1]")
        report = self.run_checks()
        self.assertFails(report, "H-2")
        self.assertFails(report, "fuera de orden")
        self.assertEqual([m for m in report.messages("OK") if "Tarjetas válidas" in m], [])

    def test_review_con_dependencia_sin_done_falla(self):
        self.p.card(id="H-1", estado="in_progress", rama="feat/a")
        self.p.card(id="H-2", estado="review", rama="feat/b", depende_de="[H-1]")
        self.assertFails(self.run_checks(), "fuera de orden")

    def test_sin_depende_de_o_vacio_es_valido(self):
        self.p.card(id="H-1")
        self.p.card(id="H-2", depende_de="[]")
        report = self.run_checks()
        self.assertEqual(report.messages("FAIL"), [])

    def test_formas_de_la_lista_y_dependencia_done_es_valida(self):
        self.p.card(id="H-1", estado="done", rama="main")
        self.p.review("H-1")
        self.p.card(id="H-2")
        for forma in ("[H-1, H-2]", "[H-1,H-2]", '["H-1", \'H-2\']', "[H-1, H-1]", "[H-1]  # comentario"):
            self.p.card(id="H-3", depende_de=forma)
            fails = [f for f in self.run_checks().messages("FAIL") if "H-3" in f]
            self.assertEqual(fails, [], f"forma {forma!r}")

    def test_pending_con_dependencia_sin_done_es_valida(self):
        self.p.card(id="H-1")
        self.p.card(id="H-2", depende_de="[H-1]")
        self.assertEqual(self.run_checks().messages("FAIL"), [])

    def test_done_con_dependencia_sin_done_falla(self):
        self.p.card(id="H-1", estado="pending")
        self.p.card(id="H-2", estado="done", rama="main", depende_de="[H-1]")
        self.p.review("H-2")
        report = self.run_checks()
        self.assertFails(report, "fuera de orden")
        self.assertFails(report, "H-2")

    def test_fallo_del_grafo_apaga_el_ok_de_tarjetas(self):
        self.p.card(id="H-1", depende_de="[H-2]")
        self.p.card(id="H-2", depende_de="[H-1]")
        self.assertEqual(self.run_checks().messages("OK").count("Tarjetas válidas (2)"), 0)
        self.p.card(id="H-2", depende_de="[X-9]")
        self.assertEqual([m for m in self.run_checks().messages("OK") if "Tarjetas válidas" in m], [])

    def test_diamante_no_es_ciclo(self):
        self.p.card(id="H-1", depende_de="[H-2, H-3]")
        self.p.card(id="H-2", depende_de="[H-4]")
        self.p.card(id="H-3", depende_de="[H-4]")
        self.p.card(id="H-4")
        self.assertEqual(self.run_checks().messages("FAIL"), [])

    def test_cadena_larga_sin_traceback(self):
        for n in range(1, 1501):
            self.p.card(id=f"C-{n}", depende_de=f"[C-{n + 1}]" if n < 1200 else None)
        self.assertEqual(self.run_checks().messages("FAIL"), [])

    def test_ciclo_en_cadena_larga_se_encuentra(self):
        for n in range(1, 1501):
            self.p.card(id=f"C-{n}", depende_de=f"[C-{n % 1200 + 1}]")
        self.assertFails(self.run_checks(), "ciclo en depende_de")

    def test_lista_yaml_en_varias_lineas_falla(self):
        self.p.card(id="H-1", depende_de="\n  - H-2")
        self.p.card(id="H-2")
        self.assertFails(self.run_checks(), "formato no reconocido")

    def test_valores_sin_corchetes_fallan(self):
        for forma in ('"H-2", "H-3"', "H-2, H-3", "H-2"):
            self.p.card(id="H-1", depende_de=forma)
            report = self.run_checks()
            self.assertFails(report, "formato no reconocido")
            self.assertEqual([m for m in report.messages("OK") if "Tarjetas válidas" in m], [])

    def test_dependencia_repetida_falla_una_sola_vez(self):
        self.p.card(id="H-1", estado="pending")
        self.p.card(id="H-2", estado="in_progress", rama="feat/x", depende_de="[H-1, H-1]")
        fails = [f for f in self.run_checks().messages("FAIL") if "fuera de orden" in f]
        self.assertEqual(len(fails), 1)

    def test_id_vacio_no_inventa_dependencia_inexistente(self):
        self.p.write("sdd/cards/H-1.md", "---\nid:\nestado: pending\ndepende_de: [H-1]\n---\n# x\n")
        fails = self.run_checks().messages("FAIL")
        self.assertTrue(any("id del frontmatter" in f for f in fails), fails)
        self.assertFalse(any("no existe" in f for f in fails), fails)

    def test_formas_raras_de_archivo_en_cards_dan_fail_nunca_excepcion(self):
        casos = {
            "sin frontmatter": b"# Notas, no una tarjeta",
            "frontmatter sin cierre": b"---" + bytes([10]) + b"id: README" + bytes([10]) + b"estado: pending",
            "vacio": b"",
            "binario": bytes(range(256)) * 4,
        }
        for nombre, contenido in casos.items():
            ruta = self.p.root / "sdd/cards/README.md"
            ruta.parent.mkdir(parents=True, exist_ok=True)
            ruta.write_bytes(contenido)
            report = self.run_checks()
            self.assertTrue(any("README.md" in f for f in report.messages("FAIL")), f"{nombre}: {report.messages('FAIL')}")
        ruta.write_bytes(casos["sin frontmatter"])
        self.assertFails(self.run_checks(), "id del frontmatter (vacío)")

    def test_ciclo_largo_se_informa_recortado(self):
        for n in range(1, 31):
            self.p.card(id=f"C-{n}", depende_de=f"[C-{n % 30 + 1}]")
        fails = [f for f in self.run_checks().messages("FAIL") if "ciclo" in f]
        self.assertEqual(len(fails), 1)
        self.assertIn("(30 tarjetas)", fails[0])
        self.assertLess(len(fails[0]), 300)

    def test_lista_entre_comillas_y_comentario_solo_son_validos(self):
        self.p.card(id="H-2")
        self.p.card(id="H-1", depende_de='"[H-2]"')
        self.assertEqual(self.run_checks().messages("FAIL"), [])
        self.p.card(id="H-1", depende_de="# nada por ahora")
        self.assertEqual(self.run_checks().messages("FAIL"), [])


if __name__ == "__main__":
    unittest.main()
