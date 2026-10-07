"""El arranque liviano (P-1): AGENTS.md/CLAUDE.md + lo que mandan a leer pesan <= 10 KB y no pierden ninguna regla."""
from __future__ import annotations

import unittest
from pathlib import Path

from support import Project

from checks import HarnessChecks, STARTUP_MAX_BYTES
from config import HarnessConfig
from report import Report

MASTER = "# master\n\n**R01 · GIT-OK — [ON]**\ntexto\n\n**R02 · GIT-LOG — [ON]**\ntexto\n\n**R03 · AUTONOMIA — [ON]**\ntexto\n"
COMPACT = "# compacto\nR01 git-ok: x\nR02 git-log: y\nR03 autonomia: z\n"
ENTRY = "Leé [`sdd/SDD-COMPACT.md`](sdd/SDD-COMPACT.md) y obedecé sus reglas.\n"


def lf_size(path: Path) -> int:
    return len(path.read_bytes().replace(b"\r\n", b"\n"))


class ArranqueCase(unittest.TestCase):
    def setUp(self) -> None:
        self.p = Project()
        self.p.write("sdd/SDD-MASTER.md", MASTER)
        self.p.write("sdd/SDD-COMPACT.md", COMPACT)
        self.p.write("AGENTS.md", ENTRY)
        self.p.write("CLAUDE.md", ENTRY)

    def tearDown(self) -> None:
        self.p.cleanup()

    def fails(self) -> list[str]:
        report = Report()
        HarnessChecks(self.p.root, HarnessConfig.load(self.p.root), report).check_startup()
        return report.messages("FAIL")

    def assertFails(self, fragment: str) -> None:
        fails = self.fails()
        self.assertTrue(any(fragment in f for f in fails), f"esperaba un FAIL con {fragment!r}; hubo: {fails}")


class TestTamano(ArranqueCase):
    def test_arranque_liviano_en_verde(self):
        self.assertEqual(self.fails(), [])

    def test_sin_agents_ni_claude_no_hay_nada_que_medir(self):
        (self.p.root / "AGENTS.md").unlink()
        (self.p.root / "CLAUDE.md").unlink()
        self.assertEqual(self.fails(), [])

    def test_compacto_inflado_falla(self):
        self.p.write("sdd/SDD-COMPACT.md", COMPACT + "x" * STARTUP_MAX_BYTES)
        self.assertFails("Arranque")

    def test_el_limite_es_inclusivo(self):
        base = lf_size(self.p.root / "AGENTS.md") + lf_size(self.p.root / "sdd/SDD-COMPACT.md")
        self.p.write("sdd/SDD-COMPACT.md", COMPACT + "x" * (STARTUP_MAX_BYTES - base))
        self.assertEqual(self.fails(), [])
        self.p.write("sdd/SDD-COMPACT.md", COMPACT + "x" * (STARTUP_MAX_BYTES - base + 1))
        self.assertFails("Arranque")

    def test_mover_texto_a_un_archivo_que_el_arranque_manda_a_leer_no_burla_el_limite(self):
        self.p.write("sdd/SDD-COMPACT.md", COMPACT + "Leé también `sdd/extra.md`.\n")
        self.p.write("sdd/extra.md", "x" * STARTUP_MAX_BYTES)
        self.assertFails("Arranque")

    def test_el_seguimiento_es_transitivo(self):
        self.p.write("sdd/SDD-COMPACT.md", COMPACT + "Leé [extra](extra.md).\n")
        self.p.write("sdd/extra.md", "Leé `sdd/mas.md`\n")
        self.p.write("sdd/mas.md", "x" * STARTUP_MAX_BYTES)
        self.assertFails("Arranque")

    def test_un_link_sin_verbo_de_lectura_es_bajo_demanda(self):
        self.p.write("AGENTS.md", ENTRY + "El texto completo está en [`sdd/SDD-MASTER.md`](sdd/SDD-MASTER.md): abrilo solo si la tarea lo pide.\n")
        self.p.write("sdd/SDD-MASTER.md", MASTER + "x" * STARTUP_MAX_BYTES)
        self.assertEqual(self.fails(), [])

    def test_mandar_a_leer_el_master_entero_falla(self):
        self.p.write("AGENTS.md", "Leé [`sdd/SDD-MASTER.md`](sdd/SDD-MASTER.md) y obedecé sus reglas.\n")
        self.p.write("sdd/SDD-MASTER.md", MASTER + "x" * STARTUP_MAX_BYTES)
        self.assertFails("Arranque")

    def test_cuenta_el_entry_mas_pesado(self):
        self.p.write("CLAUDE.md", ENTRY + "x" * STARTUP_MAX_BYTES)
        self.assertFails("CLAUDE.md")

    def test_mide_bytes_no_caracteres(self):
        self.p.write("sdd/SDD-COMPACT.md", COMPACT + "⇒" * (STARTUP_MAX_BYTES // 3 + 10))  # ~3400 chars, > 10 KB
        self.assertFails("Arranque")


class TestBurlas(ArranqueCase):
    def entry_con(self, linea: str) -> None:
        self.p.write("AGENTS.md", ENTRY + linea + "\n")
        self.p.write("CLAUDE.md", ENTRY + linea + "\n")
        self.p.write("sdd/extra.md", "x" * STARTUP_MAX_BYTES)

    def test_otros_verbos_de_lectura_tambien_mandan_a_leer(self):
        for verbo in ("Seguí", "Seguir", "Respetá", "Consultá", "Follow", "See", "Aplicá", "Lée", "LEÉ"):
            with self.subTest(verbo=verbo):
                self.entry_con(f"{verbo} `sdd/extra.md`.")
                self.assertFails("Arranque")

    def test_ruta_suelta_sin_backticks_ni_link_cuenta(self):
        self.entry_con("Leé sdd/extra.md y obedecé sus reglas.")
        self.assertFails("Arranque")

    def test_ruta_suelta_con_dos_puntos_o_punto_final(self):
        self.entry_con("Leé: sdd/extra.md.")
        self.assertFails("Arranque")

    def test_citar_el_master_cuenta_aunque_la_linea_no_tenga_verbo(self):
        self.p.write("sdd/SDD-MASTER.md", MASTER + "x" * STARTUP_MAX_BYTES)
        for linea in ("Reglas completas: sdd/SDD-MASTER.md", "Todo en [master](sdd/SDD-MASTER.md)", "<sdd/SDD-MASTER.md>"):
            with self.subTest(linea=linea):
                self.p.write("AGENTS.md", ENTRY + linea + "\n")
                self.assertFails("Arranque")

    def test_el_master_bajo_demanda_explicito_no_cuenta(self):
        self.p.write("sdd/SDD-MASTER.md", MASTER + "x" * STARTUP_MAX_BYTES)
        for linea in ("`sdd/SDD-MASTER.md`: abrilo solo si la tarea lo pide.", "Open sdd/SDD-MASTER.md only if the task asks.",
                      "sdd/SDD-MASTER.md, bajo demanda."):
            with self.subTest(linea=linea):
                self.p.write("AGENTS.md", ENTRY + linea + "\n")
                self.assertEqual(self.fails(), [])

    def test_ancla_en_la_cita(self):
        self.entry_con("Leé [x](sdd/extra.md#seccion) y `sdd/extra.md#otra`.")
        self.assertFails("Arranque")

    def test_txt_se_sigue_y_otras_extensiones_no(self):
        self.p.write("AGENTS.md", ENTRY + "Leé `sdd/extra.txt`.\n")
        self.p.write("sdd/extra.txt", "x" * STARTUP_MAX_BYTES)
        self.assertFails("Arranque")
        self.p.write("AGENTS.md", ENTRY + "Leé `sdd/extra.py`.\n")
        self.p.write("sdd/extra.py", "x" * STARTUP_MAX_BYTES)
        self.assertEqual(self.fails(), [])

    def test_el_verbo_va_con_borde_de_palabra(self):
        self.entry_con("Se leerá `sdd/extra.md` si hace falta.")
        self.assertEqual(self.fails(), [])
        self.entry_con("Nadie puede foresee `sdd/extra.md` ni subleer `sdd/extra.md`.")
        self.assertEqual(self.fails(), [])

    def test_crlf_cuenta_como_lf(self):
        # un clon de Windows con autocrlf no puede pesar mas que el mismo repo en Linux
        agents = lf_size(self.p.root / "AGENTS.md")
        regla = b"R01 a: b\nR02 a: b\nR03 a: b\n"
        lineas = b"123456789\n" * 100
        relleno = STARTUP_MAX_BYTES - agents - len(regla) - len(lineas)
        self.p.write("sdd/SDD-COMPACT.md", "")
        (self.p.root / "sdd/SDD-COMPACT.md").write_bytes((regla + lineas + b"y" * relleno).replace(b"\n", b"\r\n"))
        self.assertEqual(self.fails(), [])


class TestCustom(ArranqueCase):
    def test_custom_md_del_proyecto_cuenta_aunque_el_arranque_no_lo_cite(self):
        self.p.write("sdd/custom.md", "x" * STARTUP_MAX_BYTES)
        self.assertFails("custom.md")

    def test_custom_md_de_la_raiz_cuenta(self):
        self.p.write("custom.md", "x" * STARTUP_MAX_BYTES)
        self.assertFails("custom.md")

    def test_custom_chico_en_el_limite(self):
        base = lf_size(self.p.root / "AGENTS.md") + lf_size(self.p.root / "sdd/SDD-COMPACT.md")
        self.p.write("sdd/custom.md", "x" * (STARTUP_MAX_BYTES - base))
        self.assertEqual(self.fails(), [])
        self.p.write("sdd/custom.md", "x" * (STARTUP_MAX_BYTES - base + 1))
        self.assertFails("Arranque")

    def test_custom_md_es_una_hoja_sus_citas_no_se_siguen(self):
        # el custom.md de la plantilla nombra al master («el agente lee el master primero»): es documentación, no arranque
        self.p.write("sdd/SDD-MASTER.md", MASTER + "x" * STARTUP_MAX_BYTES)
        self.p.write("sdd/custom.md", "Leé [master](SDD-MASTER.md) y `extra.md`. El master: SDD-MASTER.md\n")
        self.p.write("AGENTS.md", ENTRY + "Leé tambien `sdd/custom.md`.\n")
        self.assertEqual(self.fails(), [])

    def test_sin_custom_no_pasa_nada(self):
        self.assertEqual(self.fails(), [])


class TestReglasBorde(ArranqueCase):
    def test_master_con_reglas_de_dos_digitos_distintos_de_cero(self):
        self.p.write("sdd/SDD-MASTER.md", MASTER + "\n**R10 · X — [ON]**\n\n**R33 · Y — [ON]**\n")
        fails = self.fails()
        self.assertTrue(any("R10" in f and "R33" in f for f in fails), fails)

    def test_regla_nombrada_a_mitad_de_linea_no_define(self):
        self.p.write("sdd/SDD-COMPACT.md", "# c\nR01 a: x\nR02 a: y\nver R03 autonomia: z\n")
        self.assertFails("R03")

    def test_regla_sin_nombre_no_define(self):
        self.p.write("sdd/SDD-COMPACT.md", "# c\nR01 a: x\nR02 a: y\nR03: z\n")
        self.assertFails("R03")


class TestCableado(ArranqueCase):
    def test_el_tope_es_el_que_fijo_el_owner(self):
        self.assertEqual(STARTUP_MAX_BYTES, 10 * 1024)

    def test_verify_quick_corre_el_check(self):
        self.p.write("sdd/SDD-COMPACT.md", COMPACT + "x" * STARTUP_MAX_BYTES)
        report = Report()
        HarnessChecks(self.p.root, HarnessConfig.load(self.p.root), report).run_all()
        self.assertTrue(any("Arranque" in f for f in report.messages("FAIL")), report.messages("FAIL"))


class TestReglas(ArranqueCase):
    def test_regla_sacada_del_compacto_falla(self):
        self.p.write("sdd/SDD-COMPACT.md", "# compacto\nR01 git-ok: x\nR02 git-log: y\n")
        self.assertFails("R03")

    def test_mencionar_la_regla_no_alcanza_hay_que_definirla(self):
        self.p.write("sdd/SDD-COMPACT.md", "# compacto\nR01 git-ok: x\nR02 git-log: y\nindice: autonomia (R03)\n")
        self.assertFails("R03")

    def test_la_regla_puede_vivir_en_el_indice_si_el_arranque_lo_lee(self):
        self.p.write("sdd/SDD-COMPACT.md", "# compacto\nR01 git-ok: x\nR02 git-log: y\nLeé `sdd/indice.md`\n")
        self.p.write("sdd/indice.md", "R03 autonomia: z\n")
        self.assertEqual(self.fails(), [])

    def test_regla_en_un_archivo_que_el_arranque_no_lee_no_cuenta(self):
        self.p.write("sdd/SDD-COMPACT.md", "# compacto\nR01 git-ok: x\nR02 git-log: y\n")
        self.p.write("sdd/otro.md", "R03 autonomia: z\n")
        self.assertFails("R03")

    def test_lista_todas_las_que_faltan(self):
        self.p.write("sdd/SDD-COMPACT.md", "# compacto\nR02 git-log: y\n")
        fails = self.fails()
        self.assertTrue(any("R01" in f and "R03" in f for f in fails), fails)

    def test_arranque_sin_ningun_compacto_falla(self):
        self.p.write("AGENTS.md", "Sin ruta a ningun lado.\n")
        self.assertFails("R01")


class TestRepoReal(unittest.TestCase):
    def test_este_repo_cumple(self):
        root = Path(__file__).resolve().parents[2]
        report = Report()
        HarnessChecks(root, HarnessConfig.load(root), report).check_startup()
        self.assertEqual(report.messages("FAIL"), [])
        self.assertTrue(any("33 reglas definidas" in m for m in report.messages("OK")), report.messages("OK"))


if __name__ == "__main__":
    unittest.main()
