"""importar-todo: recorre una carpeta madre, filtra con Gitleaks y llama a `importar.importar` por repo."""
from __future__ import annotations

import json
import unittest
from pathlib import Path
from unittest import mock

from soporte import ConCerebro

import importar_todo  # noqa: E402
import notas  # noqa: E402

LOOP_CUMPLIDO = """---
estado: cumplido
---
# Loop

## Resumen al cortar
- **Una lección:** algo que se aprendió.
"""


def armar_repo(carpeta: Path) -> None:
    (carpeta / "sdd" / "loops").mkdir(parents=True, exist_ok=True)
    (carpeta / "sdd" / "loops" / "uno.md").write_text(LOOP_CUMPLIDO, encoding="utf-8")


def gitleaks_limpio(args, capture_output=True, text=True):
    return mock.Mock(returncode=0, stdout="", stderr="")


def gitleaks_sucio(archivo: str):
    def _run(args, capture_output=True, text=True):
        return mock.Mock(returncode=1, stdout=json.dumps([{"File": archivo, "RuleID": "generic-api-key"}]), stderr="")
    return _run


class Base(ConCerebro):
    def setUp(self) -> None:
        super().setUp()
        notas.inicializar(self.base)

    def importar_todo(self, raiz=None):
        return importar_todo.importar_todo(raiz or self.afuera, self.base)


class TestSinGitleaks(Base):
    @mock.patch("importar_todo.shutil.which", return_value=None)
    def test_falla_antes_de_tocar_ninguna_carpeta(self, _which):
        repo = self.afuera / "repo"
        armar_repo(repo)
        with self.assertRaises(importar_todo.ErrorImportarTodo) as ctx:
            self.importar_todo()
        self.assertIn("gitleaks", str(ctx.exception))
        self.assertIn("winget", str(ctx.exception))
        self.assertEqual(notas.listar(self.base), [])


@mock.patch("importar_todo.shutil.which", return_value="gitleaks")
class TestFiltros(Base):
    @mock.patch("importar_todo.subprocess.run", side_effect=gitleaks_limpio)
    def test_se_saltea_carpeta_con_marca_afuera(self, _run, _which):
        carpeta = self.afuera / "secretos"
        armar_repo(carpeta)
        (carpeta / importar_todo.MARCA_AFUERA).write_text("no entrar\n", encoding="utf-8")
        r = self.importar_todo()
        self.assertEqual(r.importados, [])
        self.assertTrue(any("secretos" in s and "afuera" in s for s in r.saltados), r.saltados)

    @mock.patch("importar_todo.subprocess.run", side_effect=gitleaks_limpio)
    def test_se_saltea_carpeta_sin_sdd(self, _run, _which):
        (self.afuera / "no-es-sdd").mkdir()
        r = self.importar_todo()
        self.assertEqual(r.importados, [])
        self.assertTrue(any("no-es-sdd" in s for s in r.saltados), r.saltados)

    @mock.patch("importar_todo.subprocess.run", side_effect=gitleaks_limpio)
    def test_cerebro_dir_nunca_se_autoimporta(self, _run, _which):
        r = self.importar_todo()  # self.base ya está adentro de self.afuera
        self.assertEqual(r.importados, [])
        self.assertFalse(any("Cerebro" in s for s in r.saltados), r.saltados)

    @mock.patch("importar_todo.subprocess.run", side_effect=gitleaks_limpio)
    def test_directorio_oculto_se_saltea_en_silencio(self, _run, _which):
        (self.afuera / ".oculto").mkdir()
        r = self.importar_todo()
        self.assertEqual(r.importados, [])
        self.assertEqual(r.saltados, [])


@mock.patch("importar_todo.shutil.which", return_value="gitleaks")
class TestGitleaksBloquea(Base):
    def test_carpeta_con_secretos_no_se_importa(self, _which):
        repo = self.afuera / "con-secretos"
        armar_repo(repo)
        with mock.patch("importar_todo.subprocess.run", side_effect=gitleaks_sucio("aws.txt")):
            r = self.importar_todo()
        self.assertEqual(r.importados, [])
        self.assertEqual(r.bloqueados, ["con-secretos"])
        self.assertEqual(notas.listar(self.base), [])

    def test_el_valor_del_secreto_no_aparece_en_la_salida(self, _which):
        repo = self.afuera / "con-secretos"
        armar_repo(repo)
        secreto = "AKIA-NO-DEBERIA-APARECER-NUNCA"

        def sucio(args, capture_output=True, text=True):
            return mock.Mock(returncode=1,
                              stdout=json.dumps([{"File": "aws.txt", "Secret": secreto, "RuleID": "aws-key"}]),
                              stderr="")
        with mock.patch("importar_todo.subprocess.run", side_effect=sucio), \
             mock.patch("builtins.print") as impresion:
            self.importar_todo()
        for llamada in impresion.call_args_list:
            self.assertNotIn(secreto, " ".join(str(a) for a in llamada.args))


@mock.patch("importar_todo.shutil.which", return_value="gitleaks")
@mock.patch("importar_todo.subprocess.run", side_effect=gitleaks_limpio)
class TestImportaBien(Base):
    def test_el_proyecto_de_la_nota_es_el_slug_de_la_carpeta(self, _run, _which):
        repo = self.afuera / "Mi Repo Cliente"
        armar_repo(repo)
        r = self.importar_todo()
        self.assertEqual(r.importados, ["Mi Repo Cliente"])
        notas_ = notas.listar(self.base)
        self.assertEqual(len(notas_), 1)
        n, errores = notas.parsear(notas_[0].read_text(encoding="utf-8"), notas_[0].name)
        self.assertEqual(errores, [])
        self.assertEqual(n.proyecto, "mi-repo-cliente")

    def test_varios_repos_distintos_no_se_mezclan(self, _run, _which):
        armar_repo(self.afuera / "repo-a")
        armar_repo(self.afuera / "repo-b")
        r = self.importar_todo()
        self.assertEqual(sorted(r.importados), ["repo-a", "repo-b"])
        proyectos = sorted(
            notas.parsear(p.read_text(encoding="utf-8"), p.name)[0].proyecto for p in notas.listar(self.base))
        self.assertEqual(proyectos, ["repo-a", "repo-b"])


class TestCLI(Base):
    @mock.patch("importar_todo.shutil.which", return_value=None)
    def test_sin_gitleaks_sale_con_2(self, _which):
        armar_repo(self.afuera / "repo")
        code, out, err = self.cli("importar-todo", str(self.afuera))
        self.assertEqual(code, 2)
        self.assertIn("gitleaks", err)

    @mock.patch("importar_todo.shutil.which", return_value="gitleaks")
    @mock.patch("importar_todo.subprocess.run", side_effect=gitleaks_limpio)
    def test_con_gitleaks_limpio_sale_con_0(self, _run, _which):
        armar_repo(self.afuera / "repo")
        code, out, err = self.cli("importar-todo", str(self.afuera))
        self.assertEqual(code, 0, err)
        self.assertIn("importado", out)

    @mock.patch("importar_todo.shutil.which", return_value="gitleaks")
    def test_bloqueado_por_gitleaks_sale_con_1(self, _which):
        armar_repo(self.afuera / "repo")
        with mock.patch("importar_todo.subprocess.run", side_effect=gitleaks_sucio("x.txt")):
            code, out, err = self.cli("importar-todo", str(self.afuera))
        self.assertEqual(code, 1)


if __name__ == "__main__":
    unittest.main()
