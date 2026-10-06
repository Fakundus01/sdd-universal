"""importar-sdd: escenarios, hallazgos y lecciones de un repo SDD -> notas del Cerebro."""
from __future__ import annotations

import shutil
import unittest
from pathlib import Path

from soporte import ConCerebro

import importar  # noqa: E402
import notas  # noqa: E402
from test_notas import crear_enlace  # noqa: E402

ESCENARIOS = """# scenarios.md

**Versión:** 0.19 · 2026-03-15 · motor de crecimiento

## 1 · Matriz de situaciones

| # | Situación | ¿Funciona hoy? | Problema detectado | Adaptación |
|---|---|---|---|---|
| S01 | Web app `full-stack`, 1 dev | ✅ Perfecto | — (es el caso base) | — |
| S02 | Repo con \\| pipe en la situación | ⚠️ Parcial | Ver [el master](SDD-MASTER.md#0) y `a\\|b` en código | Usar `R15` y [la regla](x.md) |
| S03 | Script chico | ❌ No | Overhead | **Modo LITE (R18)** |
| S04 | Fila rota | solo dos celdas |

## 2 · Otra tabla

| S99 | Otra fila con id de la matriz | x | y | z |
"""

HALLAZGOS = """# hallazgos-2026-10.md

| # | Ejemplo | Dónde | Qué pasó | Propuesta |
|---|---|---|---|---|
| H1 | landing | Combinador → Stack | No hay `py-react` \\| ni otro | Sumar `py-react` a `STACKS` |
| H2 | ecommerce | Catálogo | Faltan [Vite](https://vitejs.dev) y Vitest | Sumarlas |
"""

LOOP_CUMPLIDO = """---
loop: uno
estado: cumplido
---

# Loop uno

## Después
Algo.

## Resumen al cortar
**Cumplido el 2026-09-30** en 3 de 3 vueltas.

| Objetivo | Al cortar |
|---|---|
| 1 | ok |

- **Un DRIFT, resuelto:** el arnés tenía la ruta fija
  y se cambió por una clave.
- **Lo que atajaron los reviewers:** texto viejo en el espejo.
- **Pendiente fuera del loop:** ver el job smoke.

## Otra sección
- **No es lección:** nada.
"""


def armar(repo: Path, escenarios=ESCENARIOS, hallazgos=HALLAZGOS, loops=None) -> None:
    (repo / "examples").mkdir(parents=True, exist_ok=True)
    (repo / "sdd" / "loops").mkdir(parents=True, exist_ok=True)
    if escenarios is not None:
        (repo / "scenarios.md").write_text(escenarios, encoding="utf-8")
    if hallazgos is not None:
        (repo / "examples" / "hallazgos-2026-10.md").write_text(hallazgos, encoding="utf-8")
    for nombre, texto in (loops if loops is not None else {"uno.md": LOOP_CUMPLIDO}).items():
        (repo / "sdd" / "loops" / nombre).write_text(texto, encoding="utf-8")


class Base(ConCerebro):
    def setUp(self) -> None:
        super().setUp()
        self.repo = self.afuera / "repo"
        self.repo.mkdir()
        notas.inicializar(self.base)

    def importar(self, repo=None):
        return importar.importar(repo or self.repo, self.base)

    def notas(self, tipo=None):
        out = []
        for a in notas.listar(self.base):
            n, errores = notas.parsear(a.read_text(encoding="utf-8"), a.name)
            self.assertEqual(errores, [])
            if tipo is None or n.tipo == tipo:
                out.append((a, n))
        return out


class TestContenido(Base):
    def test_cada_fila_de_la_matriz_es_una_nota_escenario(self):
        armar(self.repo)
        self.importar()
        esc = {n.fuente: n for _, n in self.notas("escenario")}
        self.assertEqual(sorted(esc), ["sdd-universal/scenarios.md#S01", "sdd-universal/scenarios.md#S02",
                                       "sdd-universal/scenarios.md#S03", "sdd-universal/scenarios.md#S99"])
        n = esc["sdd-universal/scenarios.md#S01"]
        self.assertEqual(n.proyecto, "sdd-universal")
        self.assertEqual(n.titulo, "Web app `full-stack`, 1 dev")
        self.assertIn("Problema", n.cuerpo)
        self.assertIn("es el caso base", n.cuerpo)
        self.assertIn("Adaptación", n.cuerpo)
        self.assertEqual(n.fecha, "2026-03-15")

    def test_celdas_con_pipe_escapado_backticks_y_links(self):
        armar(self.repo)
        self.importar()
        n = next(n for _, n in self.notas("escenario") if n.fuente.endswith("#S02"))
        self.assertEqual(n.titulo, "Repo con | pipe en la situación")
        self.assertIn("[el master](SDD-MASTER.md#0)", n.cuerpo)
        self.assertIn("`a|b`", n.cuerpo)
        self.assertIn("[la regla](x.md)", n.cuerpo)
        self.assertIn("Parcial", n.cuerpo)

    def test_fila_con_celdas_de_menos_se_avisa_y_se_saltea(self):
        armar(self.repo)
        r = self.importar()
        self.assertTrue(any("S04" in a for a in r.avisos), r.avisos)
        self.assertFalse(any(n.fuente.endswith("#S04") for _, n in self.notas()))

    def test_cada_fila_de_hallazgos_es_una_nota_hallazgo(self):
        armar(self.repo)
        self.importar()
        h = {n.fuente: n for _, n in self.notas("hallazgo")}
        self.assertEqual(sorted(h), ["sdd-universal/examples/hallazgos-2026-10.md#H1",
                                     "sdd-universal/examples/hallazgos-2026-10.md#H2"])
        n = h["sdd-universal/examples/hallazgos-2026-10.md#H1"]
        self.assertIn("`py-react` | ni otro", n.cuerpo)
        self.assertIn("Sumar `py-react` a `STACKS`", n.cuerpo)
        self.assertIn("H1", n.titulo)
        self.assertIn("Combinador", n.titulo)
        self.assertEqual(n.fecha, "2026-10-01")
        self.assertIn("[Vite](https://vitejs.dev)", h["sdd-universal/examples/hallazgos-2026-10.md#H2"].cuerpo)

    def test_lecciones_del_resumen_al_cortar_de_un_loop_cumplido(self):
        armar(self.repo)
        self.importar()
        lec = sorted(self.notas("leccion"), key=lambda x: x[1].fuente)
        self.assertEqual([n.titulo for _, n in lec], ["Un DRIFT, resuelto", "Lo que atajaron los reviewers"])
        self.assertEqual(lec[0][1].fuente, "sdd-universal/sdd/loops/uno.md#resumen-al-cortar")
        self.assertIn("y se cambió por una clave", lec[0][1].cuerpo)
        self.assertEqual(lec[0][1].fecha, "2026-09-30")
        self.assertFalse(any("Pendiente" in n.titulo for _, n in lec))
        self.assertFalse(any("No es lección" in n.titulo for _, n in lec))

    def test_lecciones_ignora_loops_no_cumplidos_y_resumen_vacio(self):
        armar(self.repo, loops={
            "corre.md": LOOP_CUMPLIDO.replace("estado: cumplido", "estado: corriendo"),
            "vacio.md": "---\nestado: cumplido\n---\n## Resumen al cortar\n(vacío)\n",
            "sin.md": "---\nestado: cumplido\n---\n# nada\n",
        })
        r = self.importar()
        self.assertEqual(self.notas("leccion"), [])
        self.assertEqual(r.invalidas, [])

    def test_sin_loops_ni_fuentes_no_falla(self):
        armar(self.repo, escenarios=None, hallazgos=None, loops={})
        r = self.importar()
        self.assertEqual(self.notas(), [])
        self.assertTrue(any("scenarios.md" in a for a in r.avisos), r.avisos)

    def test_repo_inexistente_es_error(self):
        with self.assertRaises(importar.ErrorImportar):
            self.importar(self.afuera / "no-existe")

    def test_proyectos_como_enlace_hacia_afuera_no_escribe_afuera(self):
        armar(self.repo)
        (self.base / "proyectos").rmdir()
        ajeno = self.afuera / "ajeno"
        ajeno.mkdir()
        crear_enlace(self, self.base / "proyectos", ajeno)
        with self.assertRaises((importar.ErrorImportar, notas.ErrorNota)):
            self.importar()
        self.assertEqual(list(ajeno.rglob("*")), [])


class TestIdempotencia(Base):
    def snapshot(self):
        return {a.relative_to(self.base).as_posix(): a.read_text(encoding="utf-8") for a in notas.listar(self.base)}

    def test_segunda_corrida_no_duplica_ni_cambia_nada(self):
        armar(self.repo)
        r1 = self.importar()
        antes = self.snapshot()
        r2 = self.importar()
        self.assertEqual(self.snapshot(), antes)
        self.assertEqual((r1.nuevas, r1.actualizadas), (len(antes), 0))
        self.assertEqual((r2.nuevas, r2.actualizadas, r2.sin_cambios), (0, 0, len(antes)))
        self.assertEqual(r2.editadas, [])

    def test_fila_que_cambio_actualiza_la_nota_en_el_mismo_archivo(self):
        armar(self.repo)
        self.importar()
        antes = self.snapshot()
        armar(self.repo, escenarios=ESCENARIOS.replace("Overhead", "Overhead enorme"))
        r = self.importar()
        despues = self.snapshot()
        self.assertEqual(sorted(despues), sorted(antes))
        self.assertEqual((r.nuevas, r.actualizadas), (0, 1))
        cambiadas = [k for k in despues if despues[k] != antes[k]]
        self.assertEqual(len(cambiadas), 1)
        self.assertIn("Overhead enorme", despues[cambiadas[0]])

    def test_nota_editada_a_mano_no_se_pisa_y_se_avisa(self):
        armar(self.repo)
        self.importar()
        ruta = next(a for a in notas.listar(self.base) if a.name.endswith("-s03.md"))
        editado = ruta.read_text(encoding="utf-8") + "\nMi comentario propio.\n"
        ruta.write_text(editado, encoding="utf-8")
        armar(self.repo, escenarios=ESCENARIOS.replace("Overhead", "Overhead enorme"))
        r = self.importar()
        self.assertEqual(ruta.read_text(encoding="utf-8"), editado)
        self.assertEqual((r.actualizadas, len(r.editadas)), (0, 1))
        self.assertIn("S03", r.editadas[0])

    def test_nota_editada_sin_cambio_en_la_fila_se_informa_igual(self):
        armar(self.repo)
        self.importar()
        ruta = next(a for a in notas.listar(self.base) if a.name.endswith("-h1.md"))
        ruta.write_text(ruta.read_text(encoding="utf-8").replace("No hay", "No existe"), encoding="utf-8")
        r = self.importar()
        self.assertIn("No existe", ruta.read_text(encoding="utf-8"))
        self.assertEqual(len(r.editadas), 1)
        self.assertEqual(r.sin_cambios, len(self.snapshot()) - 1)

    def test_nota_a_la_que_se_le_borro_la_marca_cuenta_como_editada(self):
        armar(self.repo)
        self.importar()
        ruta = next(a for a in notas.listar(self.base) if a.name.endswith("-h2.md"))
        sin = "\n".join(l for l in ruta.read_text(encoding="utf-8").split("\n") if not l.startswith("importado:"))
        ruta.write_text(sin, encoding="utf-8")
        armar(self.repo, hallazgos=HALLAZGOS.replace("Sumarlas", "Sumarlas ya"))
        r = self.importar()
        self.assertEqual(ruta.read_text(encoding="utf-8"), sin)
        self.assertEqual(len(r.editadas), 1)

    def test_el_nombre_no_depende_del_titulo(self):
        armar(self.repo)
        self.importar()
        antes = sorted(self.snapshot())
        armar(self.repo, escenarios=ESCENARIOS.replace("Script chico", "Script mediano"))
        self.importar()
        self.assertEqual(sorted(self.snapshot()), antes)


class TestCLI(Base):
    def test_importar_sdd_imprime_resumen_y_las_notas_pasan_revisar(self):
        armar(self.repo)
        code, out, err = self.cli("importar-sdd", str(self.repo))
        self.assertEqual(code, 0, err)
        self.assertIn("4 escenario", out)
        self.assertIn("2 hallazgo", out)
        self.assertIn("2 leccion", out)
        self.assertIn("8 nuevas", out)
        code, out, err = self.cli("revisar")
        self.assertEqual(code, 0, out + err)
        code, out, err = self.cli("importar-sdd", str(self.repo))
        self.assertIn("0 nuevas", out)
        self.assertIn("8 sin cambios", out)

    def test_una_nota_invalida_se_informa_importa_el_resto_y_sale_con_1(self):
        armar(self.repo, loops={"mala.md": LOOP_CUMPLIDO.replace("2026-09-30", "2026-13-45")})
        code, out, err = self.cli("importar-sdd", str(self.repo))
        self.assertEqual(code, 1)
        self.assertIn("saltada (formato)", err)
        self.assertIn("fecha", err)
        self.assertIn("2 con errores de formato", out)
        self.assertEqual(len(notas.listar(self.base)), 6)

    def test_editada_a_mano_sale_por_stderr(self):
        armar(self.repo)
        self.cli("importar-sdd", str(self.repo))
        ruta = next(a for a in notas.listar(self.base) if a.name.endswith("-s03.md"))
        ruta.write_text(ruta.read_text(encoding="utf-8") + "\nmía\n", encoding="utf-8")
        code, out, err = self.cli("importar-sdd", str(self.repo))
        self.assertEqual(code, 0)
        self.assertIn("S03", err)
        self.assertIn("1 editadas a mano", out)

    def test_repo_inexistente_da_error_en_espanol_rc_2(self):
        code, out, err = self.cli("importar-sdd", str(self.afuera / "nada"))
        self.assertEqual(code, 2)
        self.assertTrue(err.startswith("error:"), err)

    def test_sin_cerebro_dir_pide_init(self):
        armar(self.repo)
        shutil.rmtree(self.base)
        code, out, err = self.cli("importar-sdd", str(self.repo))
        self.assertEqual(code, 2)
        self.assertIn("init", err)

    def test_no_escribe_fuera_de_cerebro_dir(self):
        armar(self.repo)
        antes = sorted(p for p in self.afuera.rglob("*") if self.base not in p.parents and p != self.base)
        self.cli("importar-sdd", str(self.repo))
        despues = sorted(p for p in self.afuera.rglob("*") if self.base not in p.parents and p != self.base)
        self.assertEqual(antes, despues)


if __name__ == "__main__":
    unittest.main()
