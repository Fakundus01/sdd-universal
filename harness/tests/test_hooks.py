"""Hooks de Claude Code: cada uno con el caso que tiene que bloquear o avisar (R29)."""
from __future__ import annotations

import contextlib
import io
import json
import os
import sys
import tempfile
import unittest
from unittest import mock
from pathlib import Path

from support import HARNESS, PASS_CMD, PY, Project

sys.path.insert(0, str(HARNESS / "hooks"))
import claude  # noqa: E402


def call(cmd: str, payload: dict, root: Path) -> tuple[int, str, str]:
    out, err = io.StringIO(), io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        code = claude.main(cmd, payload, root)
    return code, out.getvalue(), err.getvalue()


def transcript(path: Path, usages: list[int]) -> Path:
    lines = [json.dumps({"type": "user"})]
    for n in usages:
        lines.append(json.dumps({"type": "assistant", "message": {"usage": {"input_tokens": n}}}))
    lines.append(json.dumps({"type": "assistant", "isSidechain": True, "message": {"usage": {"input_tokens": 10**9}}}))
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path


class HooksCase(unittest.TestCase):
    def setUp(self) -> None:
        self.p = Project()
        self.state = tempfile.TemporaryDirectory()
        os.environ["HARNESS_STATE_DIR"] = self.state.name
        os.environ.pop("HARNESS_CONTEXT_WORK_TOKENS", None)

    def tearDown(self) -> None:
        self.p.cleanup()
        self.state.cleanup()
        os.environ.pop("HARNESS_STATE_DIR", None)


class TestSessionStart(HooksCase):
    def test_muestra_current_y_tarjeta_en_curso(self):
        self.p.write("sdd/progress/main/current.md", "## Próximo paso\nCorrer la migración 0042\n")
        self.p.card(estado="in_progress", rama="main")
        code, out, _ = call("session-start", {}, self.p.root)
        self.assertEqual(code, 0)
        self.assertIn("Correr la migración 0042", out)
        self.assertIn("Tarjeta en curso en esta rama: H-1", out)

    def test_nombra_el_master_configurado(self):
        self.p.write("harness.config.json", json.dumps({"test": PASS_CMD, "master": "SDD-MASTER.md"}))
        _, out, _ = call("session-start", {}, self.p.root)
        self.assertIn("Leé SDD-MASTER.md y", out)
        self.assertNotIn("sdd/SDD-MASTER.md", out)

    def test_modo_lite_se_lee_del_master_configurado(self):
        self.p.write("harness.config.json", json.dumps({"test": PASS_CMD, "master": "SDD-MASTER.md"}))
        (self.p.root / "sdd/SDD-MASTER.md").unlink()
        self.p.write("SDD-MASTER.md", "# master\n\n- **Modo por tamaño (R18):** LITE — chico\n")
        self.p.write("sdd/sdd-lite.md", "estado lite\n")
        _, out, _ = call("session-start", {}, self.p.root)
        self.assertIn("sdd/sdd-lite.md", out)
        self.assertNotIn("progress/main/current.md", out)

    def test_sin_master_configurado_nombra_el_de_siempre(self):
        _, out, _ = call("session-start", {}, self.p.root)
        self.assertIn("Leé sdd/SDD-MASTER.md y", out)

    def test_sin_current_dice_como_crearlo(self):
        code, out, _ = call("session-start", {}, self.p.root)
        self.assertEqual(code, 0)
        self.assertIn("verify.py --quick` lo crea", out)

    def test_en_lite_muestra_sdd_lite_y_no_promete_current(self):
        # H7: en LITE no hay progress/; el estado vive en sdd/sdd-lite.md.
        self.p.write("sdd/custom.md", "MODO=LITE\n")
        self.p.write("sdd/sdd-lite.md", "## Próximo paso\nSumar el export a CSV\n")
        code, out, _ = call("session-start", {}, self.p.root)
        self.assertEqual(code, 0)
        self.assertIn("Sumar el export a CSV", out)
        self.assertNotIn("current.md", out)


class TestContextGuard(HooksCase):
    def guard(self, usages: list[int], threshold: int = 100_000) -> str:
        os.environ["HARNESS_CONTEXT_WORK_TOKENS"] = str(threshold)
        path = transcript(self.p.root / "t.jsonl", usages)
        _, out, _ = call("context-guard", {"session_id": "s1", "transcript_path": str(path)}, self.p.root)
        return out

    def test_bajo_el_umbral_no_avisa(self):
        self.assertEqual(self.guard([30_000, 120_000]), "")  # trabajo = 90k: la base de 30k no cuenta

    def test_al_cruzar_avisa_una_sola_vez_por_tramo(self):
        first = self.guard([30_000, 140_000])
        self.assertIn("~110k tokens", first)
        self.assertIn("relevo", first)
        self.assertEqual(self.guard([30_000, 150_000]), "")  # mismo tramo de 50k: no repite
        self.assertIn("~160k", self.guard([30_000, 190_000]))  # tramo siguiente: re-avisa

    def test_ignora_subagentes(self):
        self.assertEqual(self.guard([30_000, 40_000]), "")  # la línea isSidechain de 10^9 no cuenta


class TestPostEdit(HooksCase):
    def config_lint(self, exit_code: int) -> None:
        lint = f'{PY} -c "import sys; print(\'E1 mal\'); sys.exit({exit_code})" {{file}}'
        self.p.write("harness.config.json", json.dumps({"test": PASS_CMD, "lint_file": lint, "lint_ext": [".py"]}))

    def test_lint_en_rojo_bloquea_con_feedback(self):
        self.config_lint(1)
        path = self.p.write("src/app.py", "x = 1\n")
        code, _, err = call("post-edit", {"tool_input": {"file_path": str(path)}}, self.p.root)
        self.assertEqual(code, 2)
        self.assertIn("E1 mal", err)

    def test_lint_en_verde_no_bloquea(self):
        self.config_lint(0)
        path = self.p.write("src/app.py", "x = 1\n")
        self.assertEqual(call("post-edit", {"tool_input": {"file_path": str(path)}}, self.p.root)[0], 0)

    def test_extension_no_declarada_no_se_lintea(self):
        self.config_lint(1)
        path = self.p.write("src/notas.md", "# x\n")
        self.assertEqual(call("post-edit", {"tool_input": {"file_path": str(path)}}, self.p.root)[0], 0)

    def test_archivo_fuera_del_proyecto_no_se_lintea(self):
        self.config_lint(1)
        outside = Path(self.state.name) / "ajeno.py"
        outside.write_text("x = 1\n", encoding="utf-8")
        self.assertEqual(call("post-edit", {"tool_input": {"file_path": str(outside)}}, self.p.root)[0], 0)


class TestStop(HooksCase):
    def test_quick_en_rojo_no_deja_cerrar(self):
        (self.p.root / "sdd/SDD-MASTER.md").unlink()
        code, _, err = call("stop", {}, self.p.root)
        self.assertEqual(code, 2)
        self.assertIn("verify.py --quick falló", err)
        self.assertIn("sdd/SDD-MASTER.md", err)

    def test_quick_en_verde_deja_cerrar(self):
        self.assertEqual(call("stop", {}, self.p.root)[0], 0)

    def test_stop_hook_active_no_arma_bucle(self):
        (self.p.root / "sdd/SDD-MASTER.md").unlink()
        self.assertEqual(call("stop", {"stop_hook_active": True}, self.p.root)[0], 0)


class TestErroresInternos(HooksCase):
    def test_comando_desconocido_no_pasa_en_silencio(self):
        code, _, err = call("no-existe", {}, self.p.root)
        self.assertEqual(code, 1)
        self.assertIn("falló internamente", err)

    def test_session_start_roto_avisa_y_no_bloquea(self):
        with mock.patch.object(claude.Hooks, "session_start", side_effect=RuntimeError("roto")):
            code, out, _ = call("session-start", {}, self.p.root)
        self.assertEqual(code, 0)
        self.assertIn("Leé sdd/progress/<rama>/current.md a mano", out)


if __name__ == "__main__":
    unittest.main()
