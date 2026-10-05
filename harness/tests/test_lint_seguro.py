"""Seguridad de lint_file: ningún nombre de archivo se interpreta como shell, código ni opción (review vueltas 1–4)."""
from __future__ import annotations

import json
import os
import sys
import unittest
from pathlib import Path
from unittest import mock

from support import HARNESS, PASS_CMD, PY, run_captured
from test_bordes import BordesCase

from config import ConfigError, HarnessConfig, resolve_exe


class TestPlantillaSinShell(BordesCase):
    """lint_file no pasa por un shell: el placeholder es un argumento entero, nunca un pedazo de código (vueltas 1–3)."""

    HOSTILES = ("src/$(touch PWNED).py", "src/`touch PWNED`.py", "src/a'b$(touch PWNED).py", "src/a b.py",
                'src/a";touch PWNED;".py', "src/a&touch PWNED.py", "--config=evil.py", "-rf", "@opts.java", "+x.py")

    def test_invariante_toda_ruta_entra_con_punto_barra(self):
        # Quién más interpreta el string: el shell ($(…)), cmd (%), y el parser del linter (-opción, @response
        # file, +opción…). En vez de enumerar prefijos, la ruta nunca empieza con algo que no sea `./`.
        paths = ["src/ok.py", "--config=evil.py", "@opts.java", "+x.py", "-rf", "src/a b.py"]
        argv, _ = self.load("eslint --fix {files}").lint_cmd(paths)
        self.assertEqual(argv[2:], [f"./{p}" for p in paths])
        for path in paths:
            argv, _ = self.load("eslint {file}").lint_cmd([path])
            self.assertEqual(argv[1:], [f"./{path}"])

    def test_ruta_que_empieza_con_guion_no_es_una_opcion(self):
        argv, _ = self.load("eslint {files}").lint_cmd(["--config=evil.py", "-rf", "src/ok.py"])
        self.assertEqual(argv[1:], ["./--config=evil.py", "./-rf", "./src/ok.py"])
        argv, _ = self.load("eslint {file}").lint_cmd(["--output-file=src/app.py"])
        self.assertEqual(argv[1:], ["./--output-file=src/app.py"])

    def test_valor_de_opcion_no_se_toca(self):
        argv, _ = self.load("eslint --stdin-filename={file}").lint_cmd(["src/a.py"])
        self.assertEqual(argv[1:], ["--stdin-filename=src/a.py"])

    def test_placeholder_como_ejecutable_es_config_error(self):
        with self.assertRaisesRegex(ConfigError, "ejecutable"):
            self.load("{file} --check")

    def load(self, template: str) -> HarnessConfig:
        self.p.write("harness.config.json", json.dumps({"test": "x", "lint_file": template}))
        return HarnessConfig.load(self.p.root)

    def test_placeholder_dentro_de_codigo_o_script_es_config_error(self):
        for template in ('sh -c "eslint {file} && prettier --check {file}"', "python -c \"print('{file}')\"",
                         'node -e "lint({file})"', "eslint x{file}y", "eslint {files}.bak", "eslint --a={files}"):
            with self.assertRaisesRegex(ConfigError, "argumento entero", msg=template):
                self.load(template)

    def test_plantilla_mal_cerrada_es_config_error(self):
        with self.assertRaisesRegex(ConfigError, "no se puede partir"):
            self.load('eslint "{file}')

    def test_formas_validas_del_placeholder(self):
        for template in ("eslint {file}", 'eslint "{file}"', "eslint '{file}'", "eslint --stdin-filename={file}",
                         'eslint --x="{file}"', "eslint {files}", "sh scripts/lint.sh {file}"):
            self.load(template)

    def test_lint_cmd_es_una_lista_con_la_ruta_literal(self):
        argv, skipped = self.load("eslint --fix {file}").lint_cmd(["src/$(touch X).py"])
        self.assertEqual((argv[1:], skipped), (["--fix", "./src/$(touch X).py"], []))
        argv, _ = self.load("eslint --stdin-filename={file}").lint_cmd(["src/a b.py"])
        self.assertEqual(argv[1:], ["--stdin-filename=src/a b.py"])

    def test_matriz_plantillas_por_nombres_hostiles(self):
        sentinel = self.p.root / "PWNED"
        echo = f'{PY} -c "import sys; print(sys.argv[1:])"'
        for template in (f"{echo} {{file}}", f'{echo} "{{file}}"', f"{echo} --x={{file}}", f"{echo} {{files}}"):
            cfg = self.load(template)
            for name in self.HOSTILES:
                with mock.patch("config.os.name", "posix"):
                    argv, skipped = cfg.lint_cmd([name])
                self.assertEqual(skipped, [], f"{template} × {name}")
                out = run_captured(argv, cwd=self.p.root, text=True).stdout
                self.assertIn(name, out.replace("\\\\", "\\"), f"{template} × {name}")
                if "--x=" not in template:
                    self.assertIn(f"./{name}", argv, f"{template} × {name}")
                self.assertFalse(sentinel.exists(), f"{template} × {name}")

    def test_windows_con_batch_rechaza_metacaracteres_de_cmd(self):
        cfg = self.load("npx eslint {file}")
        with mock.patch("config.os.name", "nt"), mock.patch("config.resolve_exe", return_value=r"C:\n\npx.CMD"):
            for name in ("src/a%PATH%.py", "src/a!x!.py", "src/a^b.py", 'src/a"b.py', "src/a&b.py", "src/a|b.py"):
                self.assertEqual(cfg.lint_cmd([name]), (None, [name]), name)

    def test_windows_con_exe_acepta_esos_nombres(self):
        cfg = self.load("eslint {file}")
        with mock.patch("config.os.name", "nt"), mock.patch("config.resolve_exe", return_value=r"C:\n\eslint.exe"):
            argv, skipped = cfg.lint_cmd(["src/a&b.py"])
        self.assertEqual((argv, skipped), ([r"C:\n\eslint.exe", "./src/a&b.py"], []))

    @unittest.skipUnless(os.name == "nt", "la búsqueda en el directorio actual es de Windows")
    def test_windows_no_ejecuta_un_cmd_plantado_en_el_directorio_actual(self):
        (self.p.root / "fakelinter.cmd").write_text("@echo PWNED\n", encoding="utf-8")
        real_dir = self.p.root / "bin"
        real_dir.mkdir()
        cwd = os.getcwd()
        os.chdir(self.p.root)
        try:
            with mock.patch.dict(os.environ, {"PATH": str(real_dir)}):
                self.assertIsNone(resolve_exe("fakelinter"))
                (real_dir / "fakelinter.cmd").write_text("@echo ok\n", encoding="utf-8")
                self.assertEqual(Path(resolve_exe("fakelinter")).parent, real_dir)
        finally:
            os.chdir(cwd)


class TestFormasDocumentadas(BordesCase):
    """Lo que el README dice que funciona, ejecutado de verdad (la matriz prueba lo que NO tiene que pasar)."""

    def assert_runs(self, *templates: str) -> None:
        for n, template in enumerate(templates):
            self.config(lint_file=template, lint_ext=[".py"])
            for cwd in (self.p.root, self.p.root / "src"):
                self.p.write("src/a.py", f"x = {n}  # {cwd.name}\n")  # siempre un cambio sin commitear
                out = run_captured(
                    [sys.executable, str(HARNESS / "verify.py"), "--quick", "--root", str(self.p.root)],
                    cwd=cwd, text=True, encoding="utf-8", errors="replace").stdout
                self.assertIn("ARGS ./src/a.py", out, f"{template} desde {cwd.name}:\n{out}")

    @unittest.skipUnless(os.name == "nt", "shims .cmd de Windows")
    def test_windows_linter_con_ruta_relativa(self):
        self.p.write("tools/fl.cmd", "@echo off\r\necho ARGS %*\r\n")
        self.p.write("node_modules/.bin/eslint.cmd", "@echo off\r\necho ARGS %*\r\n")
        self.p.write("node_modules/.bin/eslint", "#!/bin/sh\n")  # el shim sin extensión que deja npm
        self.assert_runs("tools/fl.cmd {file}", "./tools/fl.cmd {file}", "tools/fl {file}",
                         "node_modules/.bin/eslint {file}", '"tools\\fl.cmd" {file}')

    @unittest.skipIf(os.name == "nt", "scripts POSIX")
    def test_posix_linter_con_ruta_relativa_y_script(self):
        script = self.p.write("scripts/lint.sh", 'echo "ARGS $1"\n')
        tool = self.p.write("tools/fl", '#!/bin/sh\necho "ARGS $1"\n')
        tool.chmod(0o755)
        script.chmod(0o755)
        self.assert_runs("tools/fl {file}", "./tools/fl {file}", "sh scripts/lint.sh {file}")


class TestR32(BordesCase):
    def test_deploy_y_prod_readonly_query_nunca_se_ejecutan(self):
        touch = f'{PY} -c "open(\'{{}}\', \'w\').close()"'
        self.config(deploy=touch.format("DEPLOYED"), prod_readonly_query=touch.format("PRODQ"), e2e=PASS_CMD)
        self.p.write("src/app.py", "x = 1\n")
        for args in (["--quick"], ["--changed"], [], ["--e2e"]):
            self.verify(*args)
        self.assertFalse((self.p.root / "DEPLOYED").exists())
        self.assertFalse((self.p.root / "PRODQ").exists())


if __name__ == "__main__":
    unittest.main()
