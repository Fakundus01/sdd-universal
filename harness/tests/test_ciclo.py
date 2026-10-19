"""ciclo.py de punta a punta: sincroniza, verifica, no commitea en rojo, y nunca despliega."""
from __future__ import annotations

import io
import sys
import unittest
from contextlib import redirect_stdout
from pathlib import Path

from support import FAIL_CMD, PASS_CMD, PY, Project

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import ciclo  # noqa: E402
from repo import run_captured  # noqa: E402

TOCA = f'{PY} -c "open(\'derivado.txt\',\'w\').write(\'al dia\')"'
SYNC_ROTO = f'{PY} -c "import sys; print(\'el fixer explotó\'); sys.exit(2)"'


class TestCiclo(unittest.TestCase):
    def tearDown(self) -> None:
        if getattr(self, "proy", None):
            self.proy.cleanup()

    def correr(self, *args: str, config: dict | None = None) -> tuple[int, str]:
        self.proy = Project(config=config if config is not None else {"test": PASS_CMD})
        salida = io.StringIO()
        with redirect_stdout(salida):
            codigo = ciclo.main([*args, "--root", str(self.proy.root)])
        return codigo, salida.getvalue()

    def test_sin_sync_no_explota_y_verifica_igual(self):
        codigo, salida = self.correr("--quick")
        self.assertEqual(codigo, 0, salida)
        self.assertIn("sin 'sync'", salida)
        self.assertIn("EVIDENCIA", salida)

    def test_los_fixers_corren_y_quedan_en_la_evidencia(self):
        codigo, salida = self.correr("--quick", config={"test": PASS_CMD, "sync": [TOCA]})
        self.assertEqual(codigo, 0, salida)
        self.assertIn("derivado.txt", salida, "no dice qué movieron los fixers")
        self.assertTrue((self.proy.root / "derivado.txt").is_file())

    def test_un_fixer_en_rojo_frena_antes_de_verificar(self):
        codigo, salida = self.correr("--quick", config={"test": PASS_CMD, "sync": [SYNC_ROTO]})
        self.assertEqual(codigo, 1)
        self.assertIn("el fixer explotó", salida)
        self.assertNotIn("EVIDENCIA", salida, "siguió como si nada con lo derivado a medias")

    def test_no_commitea_en_rojo(self):
        # Con algo para commitear (el sync deja derivado.txt): si el guardián de rojo faltara, commitearia.
        self.proy = Project(config={"test": FAIL_CMD, "sync": [TOCA]})
        antes = self.proy.git("rev-parse", "HEAD")
        salida = io.StringIO()
        with redirect_stdout(salida):
            codigo = ciclo.main(["--full", "--commit", "no deberia entrar", "--root", str(self.proy.root)])
        salida = salida.getvalue()
        self.assertEqual(codigo, 1)
        self.assertIn("no commiteo", salida)
        self.assertNotIn("[ciclo] commiteando", salida, "intentó commitear con la verificación en rojo")
        self.assertNotIn("el commit falló", salida, "el 1 vino de un commit roto, no del rojo de la verificación")
        self.assertEqual(self.proy.git("rev-parse", "HEAD"), antes, "se creó un commit en rojo")
        self.assertNotIn("no deberia entrar", self.proy.git("log", "--oneline"))

    def test_un_commit_que_falla_muestra_lo_que_dijo_git_sin_adivinar_la_causa(self):
        self.proy = Project(config={"test": PASS_CMD, "sync": [TOCA]})
        hook = self.proy.write(".git/hooks/pre-commit",
                               "#!/bin/sh\necho 'RECHAZO-DEL-HOOK-XYZ' >&2\nexit 1\n")
        hook.chmod(0o755)
        salida = io.StringIO()
        with redirect_stdout(salida):
            codigo = ciclo.main(["--full", "--commit", "m", "--root", str(self.proy.root)])
        salida = salida.getvalue()
        self.assertEqual(codigo, 1, salida)
        self.assertIn("el commit falló", salida)
        self.assertIn("RECHAZO-DEL-HOOK-XYZ", salida, "no muestra lo que devolvió git")
        self.assertNotIn("¿hook", salida, "propone una causa en vez de nombrar lo que pasó")

    def test_en_verde_commitea_con_la_evidencia_pegada(self):
        codigo, salida = self.correr("--full", "--commit", "mensaje del ciclo",
                                     config={"test": PASS_CMD, "sync": [TOCA]})
        self.assertEqual(codigo, 0, salida)
        mensaje = self.proy.git("log", "-1", "--format=%B")
        self.assertIn("mensaje del ciclo", mensaje)
        self.assertIn("EVIDENCIA", mensaje, "el commit quedó sin la evidencia (R30)")
        self.assertIn("3 passed", mensaje, "la evidencia no trae la salida literal de la suite")
        self.assertIn("derivado.txt", self.proy.git("show", "--stat", "--format=", "HEAD"))

    def test_push_a_prod_branch_pide_el_ok_humano(self):
        codigo, salida = self.correr("--quick", "--push",
                                     config={"test": PASS_CMD, "prod_branch": "main"})
        self.assertEqual(codigo, 1)
        self.assertIn("--a-prod", salida)
        self.assertIn("R32", salida)

    def test_nunca_ejecuta_deploy(self):
        """`deploy` es documental: el arnés no lo corre ni con --push (R32)."""
        bomba = f'{PY} -c "open(\'DESPLEGUE.txt\',\'w\').write(\'ups\')"'
        codigo, salida = self.correr("--quick", "--commit", "m",
                                     config={"test": PASS_CMD, "deploy": bomba})
        self.assertEqual(codigo, 0, salida)
        self.assertIn('EVIDENCIA', self.proy.git('log', '-1', '--format=%B'),
                      'la vuelta no hizo nada: el guardián del deploy pasaría igual')
        self.assertFalse((self.proy.root / 'DESPLEGUE.txt').exists(),
                         'corrió el comando de deploy de la config')

    def test_una_salida_con_caracteres_de_caja_no_revienta(self):
        """La salida real de verify.py trae `── Arnés ──`, y la consola de Windows arranca en cp1252:
        el primer uso real murió con UnicodeEncodeError al imprimir la evidencia."""
        # Escribe los bytes UTF-8 directo, como hace verify.py: una suite real no depende de la
        # codepage de la consola, y así el comando de prueba no tiene un solo caracter no-ASCII.
        cajas = (PY + ' -c "import sys; sys.stdout.buffer.write('
                 + r"b'\xe2\x94\x80\xe2\x94\x80 Arn\xc3\xa9s\n3 passed\n'" + ')"')
        codigo, salida = self.correr("--full", "--commit", "con cajas",
                                     config={"test": cajas})
        self.assertEqual(codigo, 0, salida)
        # En UTF-8 explícito: Project.git decodifica con la codepage local y mostraría mojibake.
        crudo = run_captured(["git", "log", "-1", "--format=%B"], cwd=self.proy.root).stdout
        self.assertIn("Arnés", crudo.decode("utf-8"), "el mensaje no quedó en UTF-8")

    def test_la_evidencia_trae_comando_salida_y_hash(self):
        codigo, salida = self.correr("--full", config={"test": PASS_CMD})
        self.assertEqual(codigo, 0, salida)
        bloque = salida[salida.index("=== EVIDENCIA"):]
        # En un repo real es `python harness/verify.py`; acá el arnés vive afuera del proyecto
        # temporal, así que el comando mostrado trae la ruta y el --root.
        self.assertIn("verify.py", bloque)
        self.assertIn("--root", bloque)
        self.assertIn("3 passed", bloque)
        self.assertRegex(bloque, r"@ [0-9a-f]{7,}", "sin hash no es evidencia (R30)")
        self.assertIn("rama main", bloque)


if __name__ == "__main__":
    unittest.main()
