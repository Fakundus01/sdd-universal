"""notas.py: formato del playbook §B, slug saneado y escritura contenida (criterios 2 y 6)."""
from __future__ import annotations

import os
import subprocess
import unittest

from soporte import NOTA, ConCerebro

import notas
from notas import ErrorNota, escribir_nota, parsear, slug

VALIDA = NOTA.format(proyecto="sdd-universal", tipo="leccion", titulo="El implementer improvisa", cuerpo="Texto.")


class TestParsear(unittest.TestCase):
    def errores(self, texto: str) -> list[str]:
        nota, errores = parsear(texto, "proyectos/x/a.md")
        if errores:
            self.assertIsNone(nota)
        return errores

    def test_nota_valida(self):
        nota, errores = parsear(VALIDA, "a.md")
        self.assertEqual(errores, [])
        self.assertEqual(nota.proyecto, "sdd-universal")
        self.assertEqual(nota.tipo, "leccion")
        self.assertEqual(nota.fecha, "2026-10-06")
        self.assertEqual(nota.fuente, "sdd-universal/sdd/loops/x.md")
        self.assertEqual(nota.tags, ["loops", "arnés"])
        self.assertEqual(nota.titulo, "El implementer improvisa")
        self.assertIn("Texto.", nota.cuerpo)
        self.assertNotIn("proyecto:", nota.cuerpo)

    def test_comentario_al_final_y_comillas_y_crlf_y_bom(self):
        texto = ("\ufeff---\r\nproyecto: \"p\"\r\ntipo: decision   # leccion | decision\r\nfecha: '2026-01-31'\r\n"
                 "fuente: p@abc123\r\n---\r\n# Título\r\n")
        nota, errores = parsear(texto, "a.md")
        self.assertEqual(errores, [])
        self.assertEqual((nota.proyecto, nota.tipo, nota.fecha, nota.fuente), ("p", "decision", "2026-01-31", "p@abc123"))
        self.assertEqual(nota.tags, [])

    def test_tags_en_lista_de_bloque_como_las_escribe_obsidian(self):
        texto = VALIDA.replace("tags: [loops, arnés]", "tags:\n  - loops\n  - \"arnés\"")
        nota, errores = parsear(texto, "a.md")
        self.assertEqual(errores, [])
        self.assertEqual(nota.tags, ["loops", "arnés"])

    def test_los_cuatro_tipos(self):
        self.assertEqual(set(notas.TIPOS), {"leccion", "decision", "escenario", "hallazgo"})
        for tipo in notas.TIPOS:
            self.assertEqual(self.errores(VALIDA.replace("tipo: leccion", f"tipo: {tipo}")), [], tipo)

    def test_cada_error_dice_archivo_y_campo(self):
        casos = {
            "proyecto": VALIDA.replace("proyecto: sdd-universal\n", ""),
            "tipo": VALIDA.replace("tipo: leccion", "tipo: receta"),
            "fecha": VALIDA.replace("fecha: 2026-10-06", "fecha: 06/10/2026"),
            "fuente": VALIDA.replace("fuente: sdd-universal/sdd/loops/x.md", "fuente:"),
            "tags": VALIDA.replace("tags: [loops, arnés]", "tags: loops"),
            "titulo": VALIDA.replace("# El implementer improvisa", "El implementer improvisa"),
        }
        for campo, texto in casos.items():
            with self.subTest(campo=campo):
                errores = self.errores(texto)
                self.assertEqual(len(errores), 1, errores)
                self.assertTrue(errores[0].startswith(f"proyectos/x/a.md: {campo}:"), errores)

    def test_fecha_imposible(self):
        errores = self.errores(VALIDA.replace("fecha: 2026-10-06", "fecha: 2026-02-30"))
        self.assertTrue(errores and ": fecha:" in errores[0], errores)

    def test_fecha_solo_acepta_aaaa_mm_dd(self):
        # En 3.11+ date.fromisoformat acepta 20261006 y 2026-W41-3: el formato lo exige la regex.
        for fecha in ("20261006", "2026-10-6", "2026-W41-3", "2026-10-06T10:00", "\u0662\u0660\u0662\u0666-10-06"):
            with self.subTest(fecha=fecha):
                errores = self.errores(VALIDA.replace("fecha: 2026-10-06", f"fecha: {fecha}"))
                self.assertTrue(errores and ": fecha:" in errores[0], errores)

    def test_tipo_ausente(self):
        errores = self.errores(VALIDA.replace("tipo: leccion\n", ""))
        self.assertEqual(len(errores), 1, errores)
        self.assertIn(": tipo:", errores[0])

    def test_sin_frontmatter_o_sin_cierre(self):
        for texto in ("# Solo título\n", "---\nproyecto: p\n# sin cierre\n"):
            with self.subTest(texto=texto):
                errores = self.errores(texto)
                self.assertEqual(len(errores), 1, errores)
                self.assertTrue(errores[0].startswith("proyectos/x/a.md: frontmatter:"), errores)

    def test_varios_errores_se_listan_todos(self):
        texto = VALIDA.replace("tipo: leccion", "tipo: x").replace("fecha: 2026-10-06", "fecha: ayer")
        self.assertEqual(len(self.errores(texto)), 2)


class TestSlug(unittest.TestCase):
    def test_saneado(self):
        self.assertEqual(slug("El implementer improvisa ante un obstáculo"), "el-implementer-improvisa-ante-un-obstaculo")
        self.assertEqual(slug("../../etc/passwd"), "etc-passwd")
        self.assertEqual(slug("C:\\Windows\\System32"), "c-windows-system32")
        self.assertEqual(slug("..."), "nota")
        self.assertEqual(slug(""), "nota")

    def test_nombres_reservados_de_windows(self):
        for nombre in ("CON", "con", "PRN", "AUX", "NUL", "COM1", "lpt9", "con.txt"):
            with self.subTest(nombre=nombre):
                s = slug(nombre)
                self.assertNotIn(s.split(".")[0].upper(), notas.RESERVADOS)
                self.assertRegex(s, r"^[a-z0-9][a-z0-9-]*$")

    def test_sin_ascii_lleva_sufijo_determinista_y_no_choca(self):
        a, b = slug("\u65e5\u672c\u8a9e"), slug("\ud55c\uad6d\uc5b4")
        self.assertRegex(a, r"^nota-[0-9a-f]{6}$")
        self.assertEqual(a, slug("\u65e5\u672c\u8a9e"))
        self.assertNotEqual(a, b)
        self.assertEqual(slug("..."), "nota")

    def test_largo_acotado(self):
        s = slug("palabra " * 40)
        self.assertLessEqual(len(s), 60)
        self.assertFalse(s.endswith("-"))


def crear_enlace(test: unittest.TestCase, enlace, destino) -> None:
    """Symlink o, en Windows, junction (no pide permisos). Si no se puede, skipTest con el motivo."""
    try:
        os.symlink(destino, enlace, target_is_directory=True)
        return
    except (OSError, NotImplementedError):
        pass
    if os.name == "nt":
        r = subprocess.run(["cmd", "/c", "mklink", "/J", str(enlace), str(destino)], capture_output=True)
        if r.returncode == 0:
            return
    test.skipTest("este sistema no deja crear symlinks ni junctions")


class TestEscribir(ConCerebro):
    def escribir(self, proyecto="sdd-universal", titulo="Una lección", **kw):
        datos = dict(tipo="leccion", cuerpo="**Contexto:** algo.", fuente="sdd-universal/x.md", fecha="2026-10-06")
        datos.update(kw)
        return escribir_nota(self.base, proyecto, titulo=titulo, **datos)

    def test_escribe_una_nota_valida_donde_dice_el_playbook(self):
        ruta = self.escribir(tags=["a", "b"])
        self.assertEqual(ruta, self.base / "proyectos" / "sdd-universal" / "2026-10-06-una-leccion.md")
        nota, errores = parsear(ruta.read_text(encoding="utf-8"), str(ruta))
        self.assertEqual(errores, [])
        self.assertEqual((nota.titulo, nota.tags, nota.tipo), ("Una lección", ["a", "b"], "leccion"))
        self.assertIn("**Contexto:** algo.", nota.cuerpo)

    def test_nunca_pisa_una_nota_existente(self):
        ruta = self.escribir()
        ruta.write_text("contenido del usuario", encoding="utf-8")
        with self.assertRaises(ErrorNota) as ctx:
            self.escribir(cuerpo="otra cosa")
        self.assertIn("ya existe", str(ctx.exception))
        self.assertEqual(ruta.read_text(encoding="utf-8"), "contenido del usuario")

    def test_no_sale_de_cerebro_dir(self):
        hostiles = ["..", "../..", "../afuera", "..\\..\\afuera", str(self.afuera / "x"), "C:\\Windows",
                    "/etc", "CON", "NUL", "aux", "com1"]
        escritas = 0
        for proyecto in hostiles:
            for titulo in ("..", "../../x", "CON", str(self.afuera / "y"), "nul"):
                with self.subTest(proyecto=proyecto, titulo=titulo):
                    try:
                        ruta = self.escribir(proyecto=proyecto, titulo=titulo)
                    except ErrorNota:
                        continue
                    escritas += 1
                    raiz = (self.base / "proyectos").resolve()
                    self.assertEqual(ruta.resolve().parent.parent, raiz)
                    for parte in (ruta.name.split(".")[0], ruta.parent.name):
                        self.assertNotIn(parte.upper(), notas.RESERVADOS)
        self.assertGreater(escritas, 0)
        self.assertEqual(self.archivos_afuera(), [])

    def test_enlace_que_escapa_se_rechaza(self):
        destino = self.afuera / "otro"
        destino.mkdir()
        (self.base / "proyectos").mkdir()
        enlace = self.base / "proyectos" / "escape"
        try:
            os.symlink(destino, enlace, target_is_directory=True)
        except (OSError, NotImplementedError):
            # Windows sin modo desarrollador: una junction escapa igual que un symlink.
            if os.name != "nt" or subprocess.run(["cmd", "/c", "mklink", "/J", str(enlace), str(destino)],
                                                 capture_output=True).returncode != 0:
                self.skipTest("este sistema no deja crear enlaces")
        with self.assertRaises(ErrorNota):
            self.escribir(proyecto="escape")
        self.assertEqual(list(destino.iterdir()), [])

    def test_proyectos_como_enlace_hacia_afuera_se_rechaza(self):
        destino = self.afuera / "otro"
        destino.mkdir()
        crear_enlace(self, self.base / "proyectos", destino)
        with self.assertRaises(ErrorNota):
            self.escribir(proyecto="p")
        self.assertEqual(list(destino.iterdir()), [])

    def test_campos_invalidos(self):
        for kw in ({"tipo": "receta"}, {"fuente": ""}, {"fuente": "a\ntipo: x"}, {"titulo": "a\n---"},
                   {"proyecto": "a\nb"}, {"tags": ["a]"]}, {"tags": ["a\nb"]}, {"fecha": "ayer"}, {"proyecto": "..."}):
            with self.subTest(kw=kw):
                with self.assertRaises(ErrorNota):
                    self.escribir(**kw)
        proyectos = self.base / "proyectos"
        self.assertEqual(list(proyectos.rglob("*.md")) if proyectos.exists() else [], [])


class TestInicializar(ConCerebro):
    def test_crea_proyectos_y_leeme_y_no_pisa(self):
        creados = notas.inicializar(self.base)
        self.assertTrue((self.base / "proyectos").is_dir())
        leeme = self.base / "LEEME.md"
        self.assertTrue(leeme.is_file())
        self.assertIn("Cerebro", leeme.read_text(encoding="utf-8"))
        self.assertEqual(len(creados), 2)
        leeme.write_text("mío", encoding="utf-8")
        (self.base / "proyectos" / "p").mkdir()
        self.assertEqual(notas.inicializar(self.base), [])
        self.assertEqual(leeme.read_text(encoding="utf-8"), "mío")
        self.assertTrue((self.base / "proyectos" / "p").is_dir())
        self.assertEqual(self.archivos_afuera(), [])

    def test_crea_la_carpeta_base_si_falta(self):
        nueva = self.base / "sub" / "Cerebro"
        notas.inicializar(nueva)
        self.assertTrue((nueva / "LEEME.md").is_file())

    def test_listar_solo_notas_de_proyectos(self):
        notas.inicializar(self.base)
        a = self.nota("p", "a.md", "A", "x")
        (self.base / "proyectos" / "p" / "b.txt").write_text("x", encoding="utf-8")
        (self.base / ".cerebro").mkdir()
        (self.base / ".cerebro" / "c.md").write_text("x", encoding="utf-8")
        self.assertEqual(notas.listar(self.base), [a])

    def test_listar_no_sigue_enlaces_que_salen_de_cerebro_dir(self):
        notas.inicializar(self.base)
        buena = self.nota("p", "a.md", "A", "x")
        fuera = self.afuera / "fuera"
        fuera.mkdir()
        (fuera / "ajena.md").write_text(VALIDA, encoding="utf-8")
        crear_enlace(self, self.base / "proyectos" / "junta", fuera)
        avisos: list[str] = []
        self.assertEqual(notas.listar(self.base, avisos), [buena])
        self.assertTrue(any("junta" in a for a in avisos), avisos)


if __name__ == "__main__":
    unittest.main()
