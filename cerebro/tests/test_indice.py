"""indice.py: fragmentos, incremental, búsqueda híbrida con RRF y guardia de modelo (criterios 3, 4 y 5)."""
from __future__ import annotations

import sqlite3
import unittest

from soporte import ConCerebro, Constante, Contador

import indice
from embedders import Falso
from indice import ErrorIndice, ErrorModelo, Indice, fragmentar, rrf

SINONIMOS = {"parar": "detener", "detiene": "detener", "frena": "detener", "bucle": "ciclo"}


class TestFragmentar(unittest.TestCase):
    def test_tope_por_defecto_es_1500(self):
        partes = fragmentar("# T" + chr(10) * 2 + "x" * 4000)
        self.assertGreater(len(partes), 1)
        self.assertTrue(all(len(x) <= 1500 for x in partes), [len(x) for x in partes])

    def test_por_encabezado(self):
        cuerpo = "# Título\n\nIntro.\n\n## Contexto\n\nAlgo.\n\n### Detalle\n\nMás.\n\n## Qué pasó\n\nOtra."
        partes = fragmentar(cuerpo)
        self.assertEqual(len(partes), 3)
        self.assertTrue(partes[0].startswith("# Título"))
        self.assertTrue(partes[1].startswith("## Contexto"))
        self.assertIn("### Detalle", partes[1])
        self.assertTrue(partes[2].startswith("## Qué pasó"))
        self.assertEqual(fragmentar("\n\n  \n"), [])

    def test_almohadilla_dentro_de_un_bloque_de_codigo_no_corta(self):
        partes = fragmentar("# T\n\n```bash\n# comentario\nls\n```\n")
        self.assertEqual(len(partes), 1)

    def test_maximo_de_caracteres(self):
        parrafos = "\n\n".join(f"Párrafo {i} " + "x" * 300 for i in range(20))
        partes = fragmentar("# T\n\n" + parrafos + "\n\n" + "y" * 4000, maximo=1500)
        self.assertGreater(len(partes), 4)
        self.assertTrue(all(0 < len(p) <= 1500 for p in partes), [len(p) for p in partes])
        junto = "".join(partes)
        self.assertEqual(junto.count("Párrafo"), 20)
        self.assertEqual(junto.count("y"), 4000)


class TestRRF(unittest.TestCase):
    def test_suma_de_rangos_reciprocos_con_k_60(self):
        puntos = rrf([["a", "b"], ["b", "c"]])
        self.assertAlmostEqual(puntos["a"], 1 / 61)
        self.assertAlmostEqual(puntos["b"], 1 / 62 + 1 / 61)
        self.assertAlmostEqual(puntos["c"], 1 / 62)
        self.assertEqual(rrf([["a"]], k=0)["a"], 1.0)


class TestEmbedderFalso(unittest.TestCase):
    def test_determinista_normalizado_y_con_sinonimos(self):
        f = Falso(dim=32, sinonimos=SINONIMOS)
        a, b, c = f.embed(["el bucle no se detiene", "el ciclo no se detiene", "otra cosa distinta"])
        self.assertEqual(len(a), 32)
        self.assertEqual(a, Falso(dim=32, sinonimos=SINONIMOS).embed(["el bucle no se detiene"])[0])
        self.assertEqual(a, b)
        self.assertNotEqual(a, c)
        self.assertAlmostEqual(sum(x * x for x in a), 1.0, places=5)
        self.assertEqual(f.embed([""])[0], [0.0] * 32)


class ConIndice(ConCerebro):
    def setUp(self) -> None:
        super().setUp()
        self.db = self.base / ".cerebro" / "indice.sqlite"
        self.nota("sdd-universal", "2026-10-06-variable.md", "Python tira UnboundLocalError en el hook",
                  "## Contexto\n\nEl hook asignaba la variable dentro de un if y Python tiró UnboundLocalError.")
        self.nota("sdd-universal", "2026-10-06-corte.md", "El ciclo sin regla de corte",
                  "## Qué pasó\n\nEl ciclo nunca se detiene si nadie fija un tope de vueltas.")
        self.nota("turnos", "2026-10-06-css.md", "Los estilos de la grilla",
                  "## Contexto\n\nLa grilla de turnos usa flexbox y colores del tema.", tipo="decision")

    def abrir(self, embedder=None) -> Indice:
        ind = Indice(self.db, embedder or Falso(sinonimos=SINONIMOS))
        self.addCleanup(ind.close)
        return ind

    def rutas(self, resultados) -> list[str]:
        return [r["ruta"] for r in resultados]


class TestIndexar(ConIndice):
    def test_incremental_cuenta_las_llamadas_al_embedder(self):
        emb = Contador()
        ind = self.abrir(emb)
        r = ind.indexar(self.base)
        self.assertEqual((r.nuevas, r.actualizadas, r.sin_cambios, r.borradas), (3, 0, 0, 0))
        primera = emb.textos
        self.assertEqual(primera, 3, "una nota corta = un fragmento (el título solo se une al siguiente)")
        r = ind.indexar(self.base)
        self.assertEqual(emb.textos, primera, "una nota sin cambios no se re-embebe")
        self.assertEqual((r.nuevas, r.actualizadas, r.sin_cambios), (0, 0, 3))
        self.nota("turnos", "2026-10-06-css.md", "Los estilos de la grilla", "Ahora con grid.", tipo="decision")
        r = ind.indexar(self.base)
        self.assertEqual((r.nuevas, r.actualizadas, r.sin_cambios), (0, 1, 2))
        self.assertEqual(emb.textos, primera + 1)
        r = ind.indexar(self.base, todo=True)
        self.assertEqual(r.nuevas, 3)
        self.assertEqual(emb.textos, primera + 1 + 3)

    def test_todo_reembebe_todo(self):
        emb = Contador()
        ind = self.abrir(emb)
        ind.indexar(self.base)
        antes = emb.textos
        ind.indexar(self.base, todo=True)
        self.assertEqual(emb.textos, 2 * antes)
        con = sqlite3.connect(self.db)
        self.addCleanup(con.close)
        self.assertEqual(con.execute("SELECT count(*) FROM notas").fetchone()[0], 3)

    def test_nota_borrada_sale_del_indice(self):
        ind = self.abrir()
        ind.indexar(self.base)
        self.assertIn("proyectos/sdd-universal/2026-10-06-variable.md", self.rutas(ind.buscar("UnboundLocalError")))
        (self.base / "proyectos" / "sdd-universal" / "2026-10-06-variable.md").unlink()
        r = ind.indexar(self.base)
        self.assertEqual(r.borradas, 1)
        self.assertNotIn("proyectos/sdd-universal/2026-10-06-variable.md", self.rutas(ind.buscar("UnboundLocalError")))
        con = sqlite3.connect(self.db)
        self.addCleanup(con.close)
        self.assertEqual(con.execute("SELECT count(*) FROM fts WHERE fts MATCH 'UnboundLocalError'").fetchone()[0], 0)
        self.assertEqual(con.execute("SELECT count(*) FROM notas").fetchone()[0], 2)

    def test_nota_invalida_no_entra_y_se_informa(self):
        mala = self.base / "proyectos" / "p" / "mala.md"
        mala.parent.mkdir(parents=True)
        mala.write_text("# sin frontmatter\n", encoding="utf-8")
        r = self.abrir().indexar(self.base)
        self.assertEqual(r.nuevas, 3)
        self.assertEqual(len(r.invalidas), 1)
        self.assertIn("proyectos/p/mala.md: frontmatter:", r.invalidas[0])

    def test_nota_que_se_vuelve_invalida_sale_del_indice(self):
        ind = self.abrir()
        ind.indexar(self.base)
        ruta = self.base / "proyectos" / "sdd-universal" / "2026-10-06-variable.md"
        ruta.write_text(ruta.read_text(encoding="utf-8").replace("tipo: leccion", "tipo: x"), encoding="utf-8")
        r = ind.indexar(self.base)
        self.assertEqual(len(r.invalidas), 1)
        self.assertNotIn("proyectos/sdd-universal/2026-10-06-variable.md", self.rutas(ind.buscar("UnboundLocalError")))

    def test_el_frontmatter_no_se_indexa_como_texto(self):
        self.abrir().indexar(self.base)
        con = sqlite3.connect(self.db)
        self.addCleanup(con.close)
        for palabra in ("arnés", "fuente", "loops", "tipo"):
            with self.subTest(palabra=palabra):
                n = con.execute("SELECT count(*) FROM fts WHERE fts MATCH ?", (f'"{palabra}"',)).fetchone()[0]
                self.assertEqual(n, 0)
        self.assertGreater(con.execute("SELECT count(*) FROM fts WHERE fts MATCH 'grilla'").fetchone()[0], 0)

    def test_vectores_float32_y_meta(self):
        self.abrir(Falso(dim=16)).indexar(self.base)
        con = sqlite3.connect(self.db)
        self.addCleanup(con.close)
        meta = dict(con.execute("SELECT clave, valor FROM meta"))
        self.assertEqual((meta["modelo"], meta["dim"]), ("falso", "16"))
        largos = {n for (n,) in con.execute("SELECT length(vector) FROM fragmentos")}
        self.assertEqual(largos, {16 * 4})


class TestBuscar(ConIndice):
    def test_palabra_exacta_primero(self):
        ind = self.abrir()
        ind.indexar(self.base)
        res = ind.buscar("UnboundLocalError")
        self.assertEqual(res[0]["ruta"], "proyectos/sdd-universal/2026-10-06-variable.md")

    def test_palabra_exacta_la_encuentra_fts_aunque_los_vectores_no_distingan(self):
        ind = self.abrir(Constante())
        ind.indexar(self.base)
        for _ in range(2):
            self.assertEqual(ind.buscar("UnboundLocalError")[0]["ruta"],
                             "proyectos/sdd-universal/2026-10-06-variable.md")
        self.assertEqual(ind.buscar("flexbox")[0]["ruta"], "proyectos/turnos/2026-10-06-css.md")

    def test_sinonimos_los_encuentran_los_vectores(self):
        ind = self.abrir()
        ind.indexar(self.base)
        consulta = "parar bucle"
        self.assertEqual(self.rutas(ind.buscar(consulta, k=5))[0], "proyectos/sdd-universal/2026-10-06-corte.md")
        con = sqlite3.connect(self.db)
        self.addCleanup(con.close)
        self.assertEqual(con.execute("SELECT count(*) FROM fts WHERE fts MATCH 'parar OR bucle'").fetchone()[0], 0,
                         "ninguna nota dice «parar» ni «bucle»: la encontró el coseno")

    def test_una_nota_aparece_una_sola_vez(self):
        self.nota("p", "larga.md", "Larga", "## Uno\n\nUnboundLocalError uno.\n\n## Dos\n\nUnboundLocalError dos.")
        ind = self.abrir()
        ind.indexar(self.base)
        rutas = self.rutas(ind.buscar("UnboundLocalError", k=10))
        self.assertEqual(len(rutas), len(set(rutas)))
        self.assertEqual(rutas.count("proyectos/p/larga.md"), 1)

    def test_k_limita(self):
        ind = self.abrir()
        ind.indexar(self.base)
        self.assertEqual(len(ind.buscar("el", k=2)), 2)
        self.assertEqual(len(ind.buscar("el", k=1)), 1)
        self.assertEqual(len(ind.buscar("el", k=10)), 3)

    def test_filtros_antes_de_puntuar(self):
        self.nota("turnos", "2026-10-06-otro.md", "Otro UnboundLocalError", "En turnos también hubo uno.",
                  tipo="hallazgo")
        ind = self.abrir()
        ind.indexar(self.base)
        res = ind.buscar("UnboundLocalError hook", proyecto="turnos", k=1)
        self.assertEqual(self.rutas(res), ["proyectos/turnos/2026-10-06-otro.md"])
        res = ind.buscar("UnboundLocalError hook", tipo="hallazgo", k=1)
        self.assertEqual(self.rutas(res), ["proyectos/turnos/2026-10-06-otro.md"])
        res = ind.buscar("UnboundLocalError", proyecto="sdd-universal", tipo="leccion", k=10)
        self.assertTrue(res)
        self.assertTrue(all(r["proyecto"] == "sdd-universal" and r["tipo"] == "leccion" for r in res), res)
        self.assertEqual(ind.buscar("UnboundLocalError", proyecto="nadie"), [])

    def test_campos_del_resultado(self):
        ind = self.abrir()
        ind.indexar(self.base)
        r = ind.buscar("UnboundLocalError")[0]
        self.assertEqual(set(r), {"titulo", "ruta", "proyecto", "tipo", "fuente", "fragmento", "puntaje"})
        self.assertEqual(r["titulo"], "Python tira UnboundLocalError en el hook")
        self.assertEqual(r["proyecto"], "sdd-universal")
        self.assertEqual(r["tipo"], "leccion")
        self.assertEqual(r["fuente"], "sdd-universal/sdd/loops/x.md")
        self.assertIn("UnboundLocalError", r["fragmento"])
        self.assertIsInstance(r["puntaje"], float)
        puntajes = [x["puntaje"] for x in ind.buscar("el", k=10)]
        self.assertEqual(puntajes, sorted(puntajes, reverse=True))

    def test_consultas_con_sintaxis_de_fts5_no_rompen(self):
        ind = self.abrir()
        ind.indexar(self.base)
        for consulta in ('"', "NEAR(", "a AND", "*", "col:x", "-", "UnboundLocalError)", "   ", "¿?"):
            with self.subTest(consulta=consulta):
                self.assertIsInstance(ind.buscar(consulta), list)
        self.assertEqual(ind.buscar("UnboundLocalError)")[0]["ruta"], "proyectos/sdd-universal/2026-10-06-variable.md")

    def test_acentos_no_importan_para_fts(self):
        ind = self.abrir(Constante())
        ind.indexar(self.base)
        self.assertEqual(ind.buscar("que paso")[0]["ruta"], "proyectos/sdd-universal/2026-10-06-corte.md")


class Falla(Falso):
    """Embedder que lanza desde su llamada número `en` (1 = la primera)."""

    def __init__(self, en: int, **kw) -> None:
        super().__init__(**kw)
        self.en = en
        self.llamadas = 0

    def embed(self, textos):
        self.llamadas += 1
        if self.llamadas >= self.en:
            raise RuntimeError("se cayó el embedder")
        return super().embed(textos)


class TestTodoONada(ConIndice):
    def foto(self) -> list:
        con = sqlite3.connect(self.db)
        try:
            return [con.execute(q).fetchall() for q in (
                "SELECT * FROM meta ORDER BY 1", "SELECT * FROM notas ORDER BY 1",
                "SELECT * FROM fragmentos ORDER BY 1", "SELECT rowid, texto FROM fts ORDER BY 1")]
        finally:
            con.close()

    def test_si_el_embedder_falla_a_mitad_el_indice_queda_como_estaba(self):
        self.abrir().indexar(self.base)
        antes = self.foto()
        self.nota("p", "nueva1.md", "Nueva uno", "algo")
        self.nota("p", "nueva2.md", "Nueva dos", "otro")
        (self.base / "proyectos" / "turnos" / "2026-10-06-css.md").unlink()
        with self.assertRaises(RuntimeError):
            self.abrir(Falla(2, sinonimos=SINONIMOS)).indexar(self.base)
        self.assertEqual(self.foto(), antes)

    def test_si_el_embedder_falla_a_mitad_de_todo_el_indice_queda_como_estaba(self):
        self.abrir().indexar(self.base)
        antes = self.foto()
        self.assertTrue(antes[1])
        with self.assertRaises(RuntimeError):
            self.abrir(Falla(2, sinonimos=SINONIMOS)).indexar(self.base, todo=True)
        self.assertEqual(self.foto(), antes)


class Dirigido(Falso):
    """Vectores a mano (dim 3): la consulta y `marca-x` quedan juntas, `marca-s` cerca, `marca-w` lejos."""

    def __init__(self) -> None:
        super().__init__(dim=3, nombre="dirigido")

    def embed(self, textos):
        def vec(t):
            if "marca-x" in t:
                return [1.0, 0.0, 0.0]
            if "marca-s" in t:
                return [0.8, 0.6, 0.0]
            if "marca-w" in t:
                return [0.5, 0.0, 0.866]
            return [1.0, 0.0, 0.0] if t.strip() == "bucle" else [0.0, 0.0, 1.0]
        return [vec(t) for t in textos]


class TestOrdenBM25(ConCerebro):
    def test_la_nota_mas_relevante_para_las_palabras_va_primero(self):
        # Por coseno: x, s, w; por BM25: s (cuatro veces «bucle»), w (una). Con BM25 al derecho gana s;
        # con la lista de palabras al revés, w le pasa a s.
        self.nota("p", "x.md", "Equis", "marca-x sin la palabra")
        self.nota("p", "s.md", "Fuerte", "bucle bucle bucle bucle marca-s")
        self.nota("p", "w.md", "Debil", "bucle marca-w y otras palabras de relleno que diluyen la frecuencia")
        ind = Indice(self.base / ".cerebro" / "indice.sqlite", Dirigido())
        self.addCleanup(ind.close)
        ind.indexar(self.base)
        rutas = [r["ruta"] for r in ind.buscar("bucle")]
        self.assertEqual(rutas, ["proyectos/p/s.md", "proyectos/p/w.md", "proyectos/p/x.md"])


class TestIndiceRoto(ConIndice):
    def roto(self) -> None:
        self.db.parent.mkdir(parents=True)
        self.db.write_bytes(b"esto no es sqlite " * 100)

    def test_archivo_que_no_es_base_de_datos_error_claro(self):
        self.roto()
        for llamar in (lambda i: i.indexar(self.base), lambda i: i.buscar("x")):
            with self.assertRaises(ErrorIndice) as ctx:
                llamar(self.abrir())
            msg = str(ctx.exception)
            self.assertIn("indexar --todo", msg)
            self.assertIn("borr", msg)
            self.assertNotIn("FTS5", msg)

    def test_todo_rehace_un_indice_roto_y_guarda_el_viejo(self):
        self.roto()
        r = self.abrir().indexar(self.base, todo=True)
        self.assertEqual(r.nuevas, 3)
        self.assertTrue(self.abrir().buscar("UnboundLocalError"))
        self.assertTrue(list(self.db.parent.glob("indice.sqlite.*")), "el archivo roto se renombra, no se pierde")

    def test_un_segundo_indice_roto_no_pisa_la_copia_del_primero(self):
        self.roto()
        primero = self.abrir()
        primero.indexar(self.base, todo=True)
        primero.close()
        segundo = self.abrir()
        self.db.write_bytes(b"otra vez roto " * 100)
        segundo.indexar(self.base, todo=True)
        segundo.close()
        self.db.write_bytes(b"tercera rotura " * 100)
        self.abrir().indexar(self.base, todo=True)
        copias = sorted(p.read_bytes()[:10] for p in self.db.parent.glob("indice.sqlite.roto*"))
        self.assertEqual(copias, [b"esto no es", b"otra vez r", b"tercera ro"])
        self.assertTrue(self.abrir().buscar("UnboundLocalError"))

    def test_base_bloqueada_no_dice_que_falta_fts5(self):
        self.abrir().indexar(self.base)
        otro = sqlite3.connect(self.db, isolation_level=None)
        self.addCleanup(otro.close)
        otro.execute("BEGIN EXCLUSIVE")
        ind = Indice(self.db, Falso(sinonimos=SINONIMOS), timeout=0.1)
        self.addCleanup(ind.close)
        with self.assertRaises(ErrorIndice) as ctx:
            ind.buscar("UnboundLocalError")
        self.assertNotIn("FTS5", str(ctx.exception))
        self.assertIn("en uso", str(ctx.exception))


class TestGuardiaDeModelo(ConIndice):
    def contar_fragmentos(self) -> list[int]:
        con = sqlite3.connect(self.db)
        try:
            return sorted(n for (n,) in con.execute("SELECT length(vector) FROM fragmentos"))
        finally:
            con.close()

    def test_cambiar_dimension_o_nombre_sin_todo_es_error(self):
        self.abrir(Falso(dim=16)).indexar(self.base)
        antes = self.contar_fragmentos()
        self.nota("p", "nueva.md", "Nueva", "algo nuevo")
        for otro in (Falso(dim=32), Falso(dim=16, nombre="otro")):
            ind = self.abrir(otro)
            with self.subTest(nombre=otro.nombre, dim=otro.dim):
                with self.assertRaises(ErrorModelo) as ctx:
                    ind.indexar(self.base)
                self.assertIn("indexar --todo", str(ctx.exception))
                with self.assertRaises(ErrorModelo):
                    ind.buscar("UnboundLocalError")
        self.assertEqual(self.contar_fragmentos(), antes, "no se mezclaron vectores")

    def test_todo_reconstruye_con_el_modelo_nuevo(self):
        self.abrir(Falso(dim=16)).indexar(self.base)
        ind = self.abrir(Falso(dim=32, nombre="otro"))
        ind.indexar(self.base, todo=True)
        self.assertEqual(set(self.contar_fragmentos()), {32 * 4})
        self.assertTrue(ind.buscar("UnboundLocalError"))
        con = sqlite3.connect(self.db)
        self.addCleanup(con.close)
        self.assertEqual(dict(con.execute("SELECT clave, valor FROM meta")), {"modelo": "otro", "dim": "32"})

    def test_buscar_sin_indice_es_error_claro(self):
        ind = self.abrir()
        with self.assertRaises(indice.ErrorIndice) as ctx:
            ind.buscar("x")
        self.assertIn("indexar", str(ctx.exception))
        self.assertFalse(self.db.exists(), "buscar no crea el índice")


if __name__ == "__main__":
    unittest.main()
