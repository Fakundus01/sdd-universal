"""Salida perdida (review R30 de v0.33.1, R3): en Windows bajo carga, el hilo que lee la salida de un subproceso
falla con `OSError: [WinError 1]` y `subprocess.run` devuelve `stdout=None` con returncode 0. Se reintenta una
vez; si vuelve a pasar, se dice claro («salida no disponible»), nunca un traceback."""
from __future__ import annotations

import contextlib
import io
import subprocess
import sys
import unittest
from pathlib import Path
from unittest import mock

from support import HARNESS, Project

sys.path.insert(0, str(HARNESS / "hooks"))
import claude  # noqa: E402
import verify  # noqa: E402
from repo import Repo  # noqa: E402

REAL_RUN = subprocess.run


class LoseOutput:
    """Reemplaza a subprocess.run: a las llamadas que cumplen `match` les pierde la salida las primeras `times`
    veces (como el hilo lector muerto: stdout y stderr en None, returncode del proceso real)."""

    def __init__(self, match, times: int, pipes: tuple[str, ...] = ("stdout", "stderr")) -> None:
        self.match = match
        self.left = times
        self.lost = 0
        self.pipes = pipes      # en la práctica se suele perder uno solo (review de v0.33.2, R3c)

    def __call__(self, args, *a, **kw):
        proc = REAL_RUN(args, *a, **kw)
        if self.left > 0 and self.match(args, kw):
            self.left -= 1
            self.lost += 1
            return subprocess.CompletedProcess(args, proc.returncode,
                                               None if "stdout" in self.pipes else proc.stdout,
                                               None if "stderr" in self.pipes else proc.stderr)
        return proc


def is_git(args, kw) -> bool:
    return isinstance(args, list) and args[:1] == ["git"]


def is_shell(args, kw) -> bool:
    return bool(kw.get("shell"))


def is_verify(args, kw) -> bool:
    return isinstance(args, list) and any(str(x).endswith("verify.py") for x in args)


class SalidaPerdidaCase(unittest.TestCase):
    def setUp(self) -> None:
        self.p = Project()

    def tearDown(self) -> None:
        self.p.cleanup()

    def verify(self, *args: str) -> tuple[int, str]:
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            code = verify.main([*args, "--root", str(self.p.root)])
        return code, out.getvalue()


class TestRepo(SalidaPerdidaCase):
    def test_git_reintenta_una_vez(self):
        fake = LoseOutput(is_git, times=1)
        with mock.patch("subprocess.run", fake):
            self.assertEqual(Repo(self.p.root).branch, "main")
        self.assertEqual(fake.lost, 1)

    def test_git_sin_salida_dos_veces_no_revienta_y_lo_anota(self):
        repo = Repo(self.p.root)
        with mock.patch("subprocess.run", LoseOutput(is_git, times=10**6)):
            self.assertIsNone(repo.git("rev-parse", "--short", "HEAD"))
        self.assertTrue(any("salida no disponible" in e for e in repo.errors), repo.errors)


class TestUnSoloPipe(SalidaPerdidaCase):
    """R3c: una implementación que mira solo `stdout` pasaba la suite, y perder solo `stderr` es lo que se vio."""

    def test_perder_solo_un_pipe_tambien_se_reintenta(self):
        for pipe in ("stdout", "stderr"):
            with self.subTest(pipe=pipe):
                fake = LoseOutput(is_shell, times=1, pipes=(pipe,))
                with mock.patch("subprocess.run", fake):
                    code, out = self.verify()
                self.assertEqual(code, 0, out)
                self.assertIn("3 passed", out)
                self.assertEqual(fake.lost, 1)

    def test_perder_solo_un_pipe_dos_veces_es_fail_claro(self):
        for pipe in ("stdout", "stderr"):
            with self.subTest(pipe=pipe):
                with mock.patch("subprocess.run", LoseOutput(is_shell, times=10**6, pipes=(pipe,))):
                    code, out = self.verify()
                self.assertNotEqual(code, 0, out)
                self.assertIn("salida no disponible", out)


class TestVerify(SalidaPerdidaCase):
    def test_tests_reintentan_y_la_evidencia_sale_entera(self):
        fake = LoseOutput(is_shell, times=1)
        with mock.patch("subprocess.run", fake):
            code, out = self.verify()
        self.assertEqual(code, 0, out)
        self.assertIn("3 passed", out)
        self.assertEqual(fake.lost, 1)

    def test_tests_sin_salida_dos_veces_es_fail_claro(self):
        with mock.patch("subprocess.run", LoseOutput(is_shell, times=10**6)):
            code, out = self.verify()
        self.assertEqual(code, 1, out)
        self.assertIn("salida no disponible", out)
        self.assertIn("ROJO", out)

    def test_git_sin_salida_dos_veces_es_fail_claro(self):
        with mock.patch("subprocess.run", LoseOutput(is_git, times=10**6)):
            code, out = self.verify("--quick")
        self.assertEqual(code, 1, out)
        self.assertIn("git: salida no disponible", out)


class TestHooks(SalidaPerdidaCase):
    def test_stop_en_rojo_sin_salida_dos_veces_bloquea_y_lo_dice(self):
        (self.p.root / "sdd/SDD-MASTER.md").unlink()  # verify --quick sale con 1
        err = io.StringIO()
        with mock.patch("subprocess.run", LoseOutput(is_verify, times=10**6)), contextlib.redirect_stderr(err), \
                contextlib.redirect_stdout(io.StringIO()):
            code = claude.main("stop", {}, self.p.root)
        self.assertEqual(code, 2)
        self.assertIn("salida no disponible", err.getvalue())

    def test_stop_en_verde_sin_salida_deja_cerrar(self):
        # Con exit 0 la salida no hace falta: perderla no puede trabar el cierre.
        with mock.patch("subprocess.run", LoseOutput(is_verify, times=10**6)), \
                contextlib.redirect_stderr(io.StringIO()), contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(claude.main("stop", {}, self.p.root), 0)

    def test_post_edit_sin_salida_avisa_sin_reventar(self):
        lint = f'"{sys.executable}" -c "import sys; sys.exit(1)" {{file}}'
        self.p.write("harness.config.json", '{"test": "x", "lint_file": %s}' % __import__("json").dumps(lint))
        self.p.write("src/a.py", "x = 1\n")
        err = io.StringIO()
        with mock.patch("subprocess.run", LoseOutput(lambda a, k: isinstance(a, list) and "-c" in a, times=10**6)), \
                contextlib.redirect_stderr(err), contextlib.redirect_stdout(io.StringIO()):
            code = claude.main("post-edit", {"tool_input": {"file_path": "src/a.py"}}, self.p.root)
        self.assertEqual(code, 2)
        self.assertIn("salida no disponible", err.getvalue())


class TestSoporte(unittest.TestCase):
    def test_project_arma_el_repo_aunque_git_pierda_la_salida(self):
        # El flaky de la suite: support.Project.git hacía `.strip()` sobre None dentro del setUp.
        with mock.patch("subprocess.run", LoseOutput(is_git, times=1)):
            p = Project()
        try:
            self.assertTrue((Path(p.root) / ".git").is_dir())
        finally:
            p.cleanup()


if __name__ == "__main__":
    unittest.main()
