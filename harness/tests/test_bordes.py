"""Bordes que encontró el review independiente del arnés (review_harness @ 11ba31a): uno por bug, en rojo primero."""
from __future__ import annotations

import contextlib
import io
import json
import os
import shutil
import sys
import unittest
from unittest import mock

from support import HARNESS, PASS_CMD, PY, Project

import verify
from checks import Card, HarnessChecks
from config import ConfigError, HarnessConfig
from report import Report
from repo import Repo, run_captured

PACKAGE = HARNESS.parent
ECHO_LINT = f'{PY} -c "import sys; print(\'LINT\', sys.argv[1:])" {{file}}'


class BordesCase(unittest.TestCase):
    def setUp(self) -> None:
        self.p = Project()

    def tearDown(self) -> None:
        self.p.cleanup()

    def config(self, **keys: object) -> None:
        self.p.write("harness.config.json", json.dumps({"test": PASS_CMD, **keys}))
        self.p.commit("config")

    def checks(self, **flags: object) -> Report:
        report = Report()
        HarnessChecks(self.p.root, HarnessConfig.load(self.p.root), report, **flags).run_all()
        return report

    def verify(self, *args: str) -> tuple[int, str]:
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            code = verify.main([*args, "--root", str(self.p.root)])
        return code, out.getvalue()


class TestInyeccion(BordesCase):
    def test_ruta_hostil_llega_literal_como_un_solo_argumento(self):
        self.config(lint_file=ECHO_LINT, lint_ext=[".py"])
        self.p.write("src/$(touch PWNED) y `x`.py", "x = 1\n")
        _, out = self.verify("--quick")
        self.assertIn("LINT ['./src/$(touch PWNED) y `x`.py']", out)

    def test_nombre_hostil_no_ejecuta_nada(self):
        self.config(lint_file=ECHO_LINT, lint_ext=[".py"])
        self.p.write("src/$(touch PWNED).py", "x = 1\n")
        self.verify("--quick")
        self.assertFalse((self.p.root / "PWNED").exists())
        self.assertFalse((self.p.root / "src" / "PWNED").exists())

    def test_lote_con_files_corre_una_sola_vez(self):
        self.config(lint_file=f'{PY} -c "import sys; print(\'LOTE\', len(sys.argv) - 1)" {{files}}', lint_ext=[".py"])
        self.p.write("src/a.py", "")
        self.p.write("src/b.py", "")
        code, out = self.verify("--quick")
        self.assertEqual(code, 0, out)
        self.assertEqual(out.count("LOTE 2"), 1)
        self.assertIn("lint (2 archivos)", out)


class TestCambios(BordesCase):
    def test_archivo_con_tilde_cuenta_como_cambio(self):
        self.p.write("src/canción.py", "x = 2\n")
        self.assertIn("src/canción.py", Repo(self.p.root).changed_files())

    def test_renombre_trae_la_ruta_nueva(self):
        self.p.write("src/viejo.py", "x = 1\n")
        self.p.commit("viejo")
        self.p.git("mv", "src/viejo.py", "src/nuevo.py")
        self.assertEqual(Repo(self.p.root).changed_files(), ["src/nuevo.py"])

    def test_raiz_dentro_de_un_monorepo(self):
        sub = self.p.root / "apps" / "web"
        sub.mkdir(parents=True)
        (sub / "app.py").write_text("x = 1\n", encoding="utf-8")
        self.assertEqual(Repo(sub).changed_files(), ["app.py"])

    def test_el_arnes_no_se_ve_a_si_mismo(self):
        shutil.copytree(HARNESS, self.p.root / "harness", ignore=shutil.ignore_patterns("__pycache__", "tests"))
        self.config(lint_file=ECHO_LINT)
        self.p.commit("arnés")
        script = str(self.p.root / "harness" / "verify.py")
        for _ in range(2):
            proc = run_captured([sys.executable, script, "--quick"], cwd=self.p.root, text=True, encoding="utf-8",
                                errors="replace")
        self.assertNotIn("__pycache__", proc.stdout)
        self.assertFalse((self.p.root / "harness" / "__pycache__").exists())

    def test_rama_en_ci_con_head_detached(self):
        self.p.commit("dos")
        self.p.git("checkout", "-q", "--detach")
        with mock.patch.dict(os.environ, {"GITHUB_HEAD_REF": "feat/stock"}):
            self.assertEqual(Repo(self.p.root).branch, "feat/stock")


class TestLecturas(BordesCase):
    def test_tarjeta_con_bom_y_crlf(self):
        path = self.p.root / "sdd" / "cards" / "H-3.md"
        path.parent.mkdir(parents=True)
        path.write_bytes(b"\xef\xbb\xbf---\r\nid: H-3\r\nestado: pending\r\n---\r\n")
        card = Card.parse(path)
        self.assertEqual((card.id, card.state), ("H-3", "pending"))

    def test_config_con_bom(self):
        (self.p.root / "harness.config.json").write_bytes(b'\xef\xbb\xbf{"test": "x"}')
        self.assertEqual(HarnessConfig.load(self.p.root).test, "x")

    def test_frontmatter_con_comillas_y_numeral(self):
        # Como en YAML: ` #` abre un comentario salvo entre comillas; `issue#42` (sin espacio) no es comentario.
        path = self.p.write("sdd/cards/H-4.md", '---\nid: "H-4"\nestado: \'pending\'  # cola\n'
                            'titulo: "Arreglar #42"\nfeature: issue#42\n---\n')
        card = Card.parse(path)
        self.assertEqual((card.id, card.state, card.meta["titulo"], card.meta["feature"]),
                         ("H-4", "pending", "Arreglar #42", "issue#42"))

    def test_criterio_que_empieza_con_menor(self):
        self.p.card(criterios="1. <200 ms por request\n2. <verificable>")
        self.assertEqual(Card.parse(self.p.root / "sdd/cards/H-1.md").criteria, ["<200 ms por request"])

    def test_plantilla_literal_del_paquete(self):
        template = PACKAGE / "prompts" / "task-card.md"
        if not template.is_file():
            self.skipTest("fuera del paquete SDD Universal")
        block = template.read_text(encoding="utf-8").split("```markdown\n", 1)[1].split("\n```", 1)[0]
        card = Card.parse(self.p.write("sdd/cards/H-1.md", block))
        self.assertEqual((card.id, card.state, card.criteria), ("H-1", "pending", []))


class TestTipos(BordesCase):
    def test_tipos_invalidos_son_config_error(self):
        for bad in ({"test": "x", "context_threshold": "400k"}, {"test": "x", "lint_ext": ".py"},
                    {"test": ["npm", "test"]}, {"test": "x", "cited_paths_docs": "AGENTS.md"}):
            self.p.write("harness.config.json", json.dumps(bad))
            with self.assertRaises(ConfigError, msg=str(bad)):
                HarnessConfig.load(self.p.root)


class TestCoherencia(BordesCase):
    def test_feature_prefijo_de_otra_no_confunde(self):
        self.p.card(feature="Stock", estado="in_progress", rama="main")
        self.p.write("sdd/status.md", "| Stock | 40% |\n| Stock mínimo por sucursal | 100% |\n")
        self.assertEqual(self.checks().messages("FAIL"), [])

    def test_ruta_con_linea(self):
        self.p.write("src/orders.py", "")
        self.p.card(estado="done", rama="main", criterios="1. ver `src/orders.py:12` y `src/orders.py#L3`")
        self.p.review()
        self.assertEqual(self.checks().messages("FAIL"), [])


class TestVeredicto(BordesCase):
    def review_text(self, body: str) -> Report:
        self.p.card(estado="done", rama="main")
        self.p.write("sdd/progress/main/review_H-1.md", f"# Review H-1 @ a942c177\n{body}\n")
        return self.checks()

    def test_linea_de_plantilla_sin_elegir_no_aprueba(self):
        fails = self.review_text("**Veredicto:** APPROVED | CHANGES_REQUESTED").messages("FAIL")
        self.assertTrue(any("no está en APPROVED" in f for f in fails), fails)

    def test_dos_puntos_fuera_del_negrita_aprueba(self):
        self.assertEqual(self.review_text("**Veredicto**: APPROVED").messages("FAIL"), [])

    def test_puntuacion_y_emoji_aprueban(self):
        self.assertEqual(self.review_text("**Veredicto:** ✅ APPROVED.").messages("FAIL"), [])

    def test_prosa_con_la_palabra_veredicto_no_pisa(self):
        report = self.review_text("**Veredicto:** APPROVED\n- Veredicto final: ver arriba")
        self.assertEqual(report.messages("FAIL"), [])

    def test_manda_el_ultimo_veredicto(self):
        fails = self.review_text("**Veredicto:** CHANGES_REQUESTED\n\n## Vuelta 2\n**Veredicto:** APPROVED")
        self.assertEqual(fails.messages("FAIL"), [])


class TestHandbackStaged(BordesCase):
    def test_handback_en_el_indice_sin_commitear_avisa(self):
        self.p.write("sdd/progress/main/handback_H-1.md", "- **Rama / commit:** `main` @ `a942c177`\n")
        self.p.git("add", "-A")
        warns = self.checks().messages("WARN")
        self.assertTrue(any("sin commitear" in w for w in warns), warns)


class TestVerifyCli(BordesCase):
    def test_primera_linea_es_el_comando_real(self):
        _, out = self.verify("--changed")
        self.assertTrue(out.startswith("verify.py --changed @ "), out)
        _, out = self.verify()
        self.assertTrue(out.startswith("verify.py @ "), out)

    def test_full_es_alias_valido(self):
        code, out = self.verify("--full")
        self.assertEqual(code, 0, out)

    def test_e2e_no_avisa_en_la_misma_corrida_que_lo_registra(self):
        self.config(e2e=PASS_CMD)
        code, out = self.verify("--quick", "--e2e")
        self.assertEqual(code, 0, out)
        self.assertNotIn("nunca corrió", out)

    def test_root_con_igual_se_oculta(self):
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            verify.main(["--quick", f"--root={self.p.root}"])
        self.assertTrue(out.getvalue().startswith("verify.py --quick @ "), out.getvalue()[:80])

    def test_changed_sin_git_corre_los_tests_y_avisa(self):
        p = Project(git=False, config={"test": PASS_CMD})
        try:
            p.write("src/app.py", "x = 1\n")
            out = io.StringIO()
            with contextlib.redirect_stdout(out):
                verify.main(["--changed", "--root", str(p.root)])
            self.assertIn("sin git", out.getvalue())
            self.assertIn("3 passed", out.getvalue())
        finally:
            p.cleanup()

    def test_salida_no_utf8_se_decodifica_con_la_codepage(self):
        self.config(test=f'{PY} -c "import sys; sys.stdout.buffer.write(\'canci\\xf3n\'.encode(\'cp1252\'))"')
        _, out = self.verify()
        if sys.platform == "win32":
            self.assertIn("canción", out)
        else:
            # Linux/macOS: la codepage es UTF-8 y el byte suelto no se adivina; se marca, no se pierde la línea.
            self.assertIn("canci�n", out)

    def test_comando_que_pide_input_no_cuelga(self):
        self.config(test=f'{PY} -c "input()"')
        code, out = self.verify()
        self.assertEqual(code, 1, out)


if __name__ == "__main__":
    unittest.main()
