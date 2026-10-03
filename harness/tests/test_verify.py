"""verify.py de punta a punta: niveles, exit code, hash en la primera línea y registro del e2e."""
from __future__ import annotations

import contextlib
import io
import json
import unittest

from support import FAIL_CMD, PASS_CMD, PY, Project

import verify


def run(project: Project, *args: str) -> tuple[int, str]:
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        code = verify.main([*args, "--root", str(project.root)])
    return code, out.getvalue()


class TestVerify(unittest.TestCase):
    def setUp(self) -> None:
        self.p = Project()

    def tearDown(self) -> None:
        self.p.cleanup()

    def config(self, **keys: object) -> None:
        self.p.write("harness.config.json", json.dumps({"test": PASS_CMD, **keys}))
        self.p.commit("config")

    def test_completo_en_verde_dice_hash_y_sale_0(self):
        code, out = run(self.p)
        head = self.p.git("rev-parse", "--short", "HEAD")
        self.assertEqual(code, 0, out)
        self.assertTrue(out.startswith(f"verify.py @ {head}"), out)
        self.assertIn("3 passed", out)
        self.assertIn("VERDE — 0 FAIL", out)

    def test_tests_en_rojo_salen_1_con_la_cola(self):
        self.config(test=FAIL_CMD)
        code, out = run(self.p)
        self.assertEqual(code, 1)
        self.assertIn("[FAIL]  test", out)
        self.assertIn("1 failed: test_x", out)
        self.assertIn("ROJO — 1 FAIL", out)

    def test_sin_config_sale_1(self):
        (self.p.root / "harness.config.json").unlink()
        code, out = run(self.p, "--quick")
        self.assertEqual(code, 1)
        self.assertIn("falta harness.config.json", out)

    def test_quick_no_corre_tests(self):
        self.config(test=FAIL_CMD)
        code, out = run(self.p, "--quick")
        self.assertEqual(code, 0, out)
        self.assertNotIn("1 failed", out)

    def test_changed_sin_cambios_no_corre_tests(self):
        self.config(test=FAIL_CMD)
        code, out = run(self.p, "--changed")
        self.assertEqual(code, 0, out)
        self.assertIn("nada que testear", out)

    def test_changed_con_cambios_corre_test_quick(self):
        self.config(test=PASS_CMD, test_quick=FAIL_CMD)
        self.p.write("src/app.py", "x = 1\n")
        code, out = run(self.p, "--changed")
        self.assertEqual(code, 1)
        self.assertIn("[FAIL]  test_quick", out)

    def test_cambios_solo_en_sdd_no_cuentan_como_codigo(self):
        self.config(test=FAIL_CMD)
        self.p.write("sdd/spec.md", "# spec\n")
        code, out = run(self.p, "--changed")
        self.assertEqual(code, 0, out)

    def test_lint_file_solo_sobre_extensiones_declaradas(self):
        lint = f'{PY} -c "import sys; print(\'lint\', sys.argv[1]); sys.exit(1)" {{file}}'
        self.config(lint_file=lint, lint_ext=[".py"])
        self.p.write("src/app.py", "x = 1\n")
        self.p.write("src/notas.txt", "hola\n")
        code, out = run(self.p, "--quick")
        self.assertEqual(code, 1)
        self.assertIn("lint src/app.py", out)
        self.assertNotIn("lint src/notas.txt", out)

    def test_e2e_verde_queda_registrado_con_hash(self):
        self.config(e2e=PASS_CMD)
        code, out = run(self.p, "--quick", "--e2e")
        record = (self.p.root / "sdd/progress/e2e.md").read_text(encoding="utf-8")
        self.assertEqual(code, 0, out)
        self.assertIn(f"@ {self.p.git('rev-parse', '--short', 'HEAD')} — e2e verde", record)

    def test_e2e_rojo_no_se_registra(self):
        self.config(e2e=FAIL_CMD)
        code, _ = run(self.p, "--quick", "--e2e")
        self.assertEqual(code, 1)
        self.assertFalse((self.p.root / "sdd/progress/e2e.md").exists())

    def test_e2e_pedido_sin_declarar_falla(self):
        code, out = run(self.p, "--quick", "--e2e")
        self.assertEqual(code, 1)
        self.assertIn("no hay 'e2e'", out)


if __name__ == "__main__":
    unittest.main()
