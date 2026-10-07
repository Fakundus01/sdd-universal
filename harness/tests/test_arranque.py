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
        base = (self.p.root / "AGENTS.md").stat().st_size + (self.p.root / "sdd/SDD-COMPACT.md").stat().st_size
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
        self.p.write("AGENTS.md", ENTRY + "El texto completo está en [`sdd/SDD-MASTER.md`](sdd/SDD-MASTER.md).\n")
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


if __name__ == "__main__":
    unittest.main()
