"""embedders.OpenAIEmbedder y config.clave_openai (C-6). El SDK `openai` es el real, sobre un transporte simulado
(`MockTransport` del httpx que usa el SDK): ningún test abre red ni usa una clave verdadera. Lo que necesita el SDK
se saltea con motivo si no está instalado; lo de la clave y el `.env` corre siempre."""
from __future__ import annotations

import contextlib
import importlib
import importlib.util
import io
import json
import logging
import os
import tempfile
import traceback
import unittest
from pathlib import Path
from unittest import mock

from soporte import ConCerebro

import config
import embedders
from embedders import ErrorEmbedder, OpenAIEmbedder
from indice import ErrorModelo, Indice

HAY_OPENAI = importlib.util.find_spec("openai") is not None
if HAY_OPENAI:
    # el SDK 3.x usa `httpx2`; el 1.x/2.x usan `httpx`: el cliente de los tests tiene que ser del mismo que el SDK
    httpx = importlib.import_module("httpx2" if importlib.util.find_spec("httpx2") else "httpx")

RUTA_ENV_REAL = getattr(config, "ruta_env", None)  # la de verdad, antes de que `aislar` la parchee
CLAVE = "sk-test-DISTINTIVA-Zq8f31XyW0"
NECESITA_SDK = unittest.skipUnless(HAY_OPENAI, "falta `openai` (instalalo en el venv de cerebro/)")


def vector(i: int, dim: int = 1536) -> list[float]:
    return [float(i + 1)] + [0.0] * (dim - 1)


class Servidor:
    """El «servidor» simulado: guarda cada request y contesta con `respuestas` (funciones o tuplas
    (status, cuerpo, headers)); cuando se acaban, repite la última. Sin respuestas, contesta bien."""

    def __init__(self, *respuestas, dim: int = 1536) -> None:
        self.respuestas = list(respuestas)
        self.dim = dim
        self.requests: list = []

    def __call__(self, request):
        self.requests.append(request)
        if not self.respuestas:
            return self.ok(request)
        r = self.respuestas[min(len(self.requests), len(self.respuestas)) - 1]
        if callable(r):
            return r(request)
        status, cuerpo, headers = r
        return httpx.Response(status, json=cuerpo, headers=headers)

    def ok(self, request, invertir: bool = False):
        entrada = json.loads(request.content)["input"]
        datos = [{"object": "embedding", "index": i, "embedding": vector(i, self.dim)} for i in range(len(entrada))]
        if invertir:
            datos.reverse()
        return httpx.Response(200, json={"object": "list", "data": datos, "model": "text-embedding-3-small",
                                         "usage": {"prompt_tokens": 1, "total_tokens": 1}})

    def entradas(self) -> list[list[str]]:
        return [json.loads(r.content)["input"] for r in self.requests]

    def http_client(self):
        return httpx.Client(transport=httpx.MockTransport(self))


def error_api(status: int, mensaje: str, codigo: str | None = None, headers: dict | None = None):
    return (status, {"error": {"message": mensaje, "type": "invalid_request_error", "param": None, "code": codigo}},
            headers or {})


class Reloj:
    """`esperar` falso: no duerme, anota."""

    def __init__(self) -> None:
        self.esperas: list[float] = []

    def __call__(self, segundos: float) -> None:
        self.esperas.append(segundos)


def embedder(servidor: Servidor, reloj: Reloj | None = None, **kwargs) -> OpenAIEmbedder:
    return OpenAIEmbedder(clave=CLAVE, http_client=servidor.http_client(), esperar=reloj or Reloj(), **kwargs)


def aislar(test: unittest.TestCase) -> Path:
    """Ni la clave del entorno ni el `.env` real de la máquina entran a los tests. Devuelve el `.env` de prueba."""
    tmp = tempfile.TemporaryDirectory()
    test.addCleanup(tmp.cleanup)
    env_ruta = Path(tmp.name) / ".env"
    for p in (mock.patch.dict(os.environ, {}), mock.patch.object(config, "ruta_env", lambda: env_ruta)):
        p.start()
        test.addCleanup(p.stop)
    os.environ.pop("OPENAI_API_KEY", None)
    os.environ.pop("OPENAI_BASE_URL", None)
    return env_ruta


class SinEntorno(unittest.TestCase):
    def setUp(self) -> None:
        self.env_ruta = aislar(self)


class ConCerebroSinEntorno(ConCerebro):
    def setUp(self) -> None:
        super().setUp()
        self.env_ruta = aislar(self)


class TestClave(SinEntorno):
    def test_sale_del_entorno(self):
        os.environ["OPENAI_API_KEY"] = CLAVE
        self.assertEqual(config.clave_openai(), CLAVE)

    def test_sale_del_env_de_la_raiz_del_paquete(self):
        self.env_ruta.write_text(f"# comentario\nOTRA=1\nOPENAI_API_KEY={CLAVE}\n", encoding="utf-8")
        self.assertEqual(config.clave_openai(), CLAVE)

    def test_el_entorno_gana_al_env(self):
        self.env_ruta.write_text("OPENAI_API_KEY=sk-test-del-archivo\n", encoding="utf-8")
        os.environ["OPENAI_API_KEY"] = CLAVE
        self.assertEqual(config.clave_openai(), CLAVE)

    def test_formatos_del_env(self):
        for linea in (f'OPENAI_API_KEY="{CLAVE}"', f"OPENAI_API_KEY='{CLAVE}'", f"export OPENAI_API_KEY={CLAVE}",
                      f"  OPENAI_API_KEY = {CLAVE}  ", f"OPENAI_API_KEY={CLAVE} # la de prueba"):
            with self.subTest(linea=linea):
                self.env_ruta.write_bytes((linea + "\r\n").encode("utf-8"))
                self.assertEqual(config.clave_openai(), CLAVE)

    def test_env_con_bom(self):
        self.env_ruta.write_bytes(b"\xef\xbb\xbf" + f"OPENAI_API_KEY={CLAVE}\n".encode())
        self.assertEqual(config.clave_openai(), CLAVE)

    def test_sin_clave_es_none(self):
        self.assertIsNone(config.clave_openai())
        self.env_ruta.write_text("OPENAI_API_KEY=\nOPENAI_API_KEY_VIEJA=sk-test-x\n", encoding="utf-8")
        self.assertIsNone(config.clave_openai())
        os.environ["OPENAI_API_KEY"] = "   "
        self.assertIsNone(config.clave_openai())

    def test_env_ilegible_es_como_sin_clave(self):
        self.env_ruta.write_bytes(b"\xff\xfe\x00 no es utf-8 \x80\x81")
        self.assertIsNone(config.clave_openai())

    def test_el_env_es_el_de_la_raiz_del_paquete(self):
        esperada = Path(config.__file__).resolve().parent.parent / ".env"
        cwd = os.getcwd()
        with tempfile.TemporaryDirectory() as otro:  # no depende de desde dónde se corra
            os.chdir(otro)
            try:
                self.assertEqual(RUTA_ENV_REAL(), esperada)
            finally:
                os.chdir(cwd)

    def test_leer_la_clave_no_toca_el_entorno(self):
        self.env_ruta.write_text(f"OPENAI_API_KEY={CLAVE}\n", encoding="utf-8")
        config.clave_openai()
        self.assertNotIn("OPENAI_API_KEY", os.environ)


class TestSinClave(ConCerebroSinEntorno):
    def test_sin_clave_error_claro_que_nombra_la_variable(self):
        with self.assertRaises(ErrorEmbedder) as ctx:
            embedders.obtener("openai")
        msg = str(ctx.exception)
        self.assertIn("OPENAI_API_KEY", msg)
        self.assertIn(".env", msg)
        self.assertIn("local", msg)

    def test_sin_clave_el_modo_local_sigue_andando(self):
        self.assertIsInstance(embedders.obtener("local"), embedders.Local)
        self.assertIsInstance(embedders.obtener("falso"), embedders.Falso)

    def test_la_cli_con_openai_sin_clave_sale_con_2_y_nombra_la_variable(self):
        with mock.patch.dict(os.environ, {"CEREBRO_EMBEDDINGS": "openai"}):
            code, out, err = self.cli("indexar")
        self.assertEqual(code, 2)
        self.assertIn("OPENAI_API_KEY", err)

    def test_sin_el_sdk_error_con_el_comando_de_instalacion(self):
        e = OpenAIEmbedder(clave=CLAVE)
        with mock.patch.dict("sys.modules", {"openai": None}):
            with self.assertRaises(ErrorEmbedder) as ctx:
                e.embed(["hola"])
        msg = str(ctx.exception)
        self.assertIn("`openai`", msg)
        self.assertIn("pip install -r cerebro/requirements.txt", msg)
        self.assertNotIn(CLAVE, msg)

    def test_crear_el_embedder_no_importa_el_sdk(self):
        with mock.patch.dict("sys.modules", {"openai": None}):
            e = OpenAIEmbedder(clave=CLAVE)
        self.assertEqual((e.nombre, e.dim), ("text-embedding-3-small", 1536))
        self.assertEqual(e.embed([]), [])


@NECESITA_SDK
class TestEmbedder(SinEntorno):
    def test_obtener_openai_con_clave_del_entorno(self):
        os.environ["OPENAI_API_KEY"] = CLAVE
        e = embedders.obtener("openai")
        self.assertIsInstance(e, OpenAIEmbedder)
        self.assertEqual((e.nombre, e.dim), ("text-embedding-3-small", 1536))

    def test_manda_modelo_texto_y_la_clave_en_el_header(self):
        s = Servidor()
        v = embedder(s).embed(["uno", "dos"])
        self.assertEqual(len(s.requests), 1)
        r = s.requests[0]
        cuerpo = json.loads(r.content)
        self.assertEqual(cuerpo["model"], "text-embedding-3-small")
        self.assertEqual(cuerpo["input"], ["uno", "dos"])
        self.assertEqual(r.headers["authorization"], f"Bearer {CLAVE}")
        self.assertEqual(r.url.path, "/v1/embeddings")
        self.assertEqual(len(v), 2)
        self.assertTrue(all(isinstance(x, float) for x in v[0]))
        self.assertEqual(v[1][0], 2.0)

    def test_va_siempre_a_api_openai_aunque_el_entorno_diga_otra_cosa(self):
        os.environ["OPENAI_BASE_URL"] = "https://otro-host.invalid/v1"
        s = Servidor()
        embedder(s).embed(["x"])
        self.assertEqual(s.requests[0].url.host, "api.openai.com")

    def test_lista_vacia_no_hace_requests(self):
        s = Servidor()
        self.assertEqual(embedder(s).embed([]), [])
        self.assertEqual(s.requests, [])

    def test_por_lotes_y_en_orden(self):
        s = Servidor()
        textos = [f"t{i}" for i in range(150)]
        v = embedder(s, lote=64).embed(textos)
        self.assertEqual([len(x) for x in s.entradas()], [64, 64, 22])
        self.assertEqual([x for lote in s.entradas() for x in lote], textos)
        self.assertEqual(len(v), 150)
        self.assertEqual([x[0] for x in v[:3]], [1.0, 2.0, 3.0])
        self.assertEqual(v[64][0], 1.0)  # el primero del segundo lote

    def test_respeta_el_index_si_la_api_responde_desordenado(self):
        s = Servidor(lambda r: s.ok(r, invertir=True))
        v = embedder(s).embed(["a", "b", "c"])
        self.assertEqual([x[0] for x in v], [1.0, 2.0, 3.0])

    def test_dimension_inesperada_es_error(self):
        s = Servidor(dim=8)
        with self.assertRaises(ErrorEmbedder) as ctx:
            embedder(s).embed(["a"])
        self.assertIn("1536", str(ctx.exception))

    def test_cantidad_inesperada_es_error(self):
        vacio = {"object": "list", "data": [], "model": "m", "usage": {"prompt_tokens": 1, "total_tokens": 1}}
        s = Servidor((200, vacio, {}))
        with self.assertRaises(ErrorEmbedder):
            embedder(s).embed(["a"])

    def test_texto_vacio_se_manda_como_un_espacio(self):
        s = Servidor()
        embedder(s).embed(["", "hola"])
        self.assertEqual(s.entradas(), [[" ", "hola"]])

    # --- reintentos ---

    def test_429_y_despues_ok(self):
        s = Servidor(error_api(429, "Rate limit reached"), error_api(429, "Rate limit reached"),
                     lambda r: s.ok(r))
        reloj = Reloj()
        v = embedder(s, reloj).embed(["a"])
        self.assertEqual(len(v), 1)
        self.assertEqual(len(s.requests), 3)
        self.assertEqual(reloj.esperas, [1.0, 2.0])

    def test_5xx_se_reintenta_y_es_acotado(self):
        s = Servidor(error_api(503, "overloaded"))
        reloj = Reloj()
        with self.assertRaises(ErrorEmbedder) as ctx:
            embedder(s, reloj, reintentos=3).embed(["a"])
        self.assertEqual(len(s.requests), 4)
        self.assertEqual(reloj.esperas, [1.0, 2.0, 4.0])
        self.assertIn("503", str(ctx.exception))

    def test_el_sdk_no_reintenta_por_su_cuenta(self):
        """El SDK trae `max_retries=2` por defecto: si no se apaga, los requests se multiplican."""
        s = Servidor(error_api(500, "boom"))
        with self.assertRaises(ErrorEmbedder):
            embedder(s, reintentos=0).embed(["a"])
        self.assertEqual(len(s.requests), 1)

    def test_retry_after_se_respeta_con_tope(self):
        s = Servidor(error_api(429, "x", headers={"retry-after": "7"}),
                     error_api(429, "x", headers={"retry-after": "9999"}),
                     lambda r: s.ok(r))
        reloj = Reloj()
        embedder(s, reloj).embed(["a"])
        self.assertEqual(reloj.esperas, [7.0, embedders.ESPERA_MAXIMA])

    def test_429_sin_cuota_no_se_reintenta(self):
        s = Servidor(error_api(429, "You exceeded your current quota", codigo="insufficient_quota"))
        with self.assertRaises(ErrorEmbedder) as ctx:
            embedder(s).embed(["a"])
        self.assertEqual(len(s.requests), 1)
        self.assertIn("cuota", str(ctx.exception))

    def test_error_de_conexion_se_reintenta(self):
        def cae(request):
            raise httpx.ConnectError("sin red", request=request)

        s = Servidor(cae)
        with self.assertRaises(ErrorEmbedder) as ctx:
            embedder(s, reintentos=2).embed(["a"])
        self.assertEqual(len(s.requests), 3)
        self.assertIn("conectar", str(ctx.exception))

    def test_401_error_claro_y_sin_reintento(self):
        s = Servidor(error_api(401, "Incorrect API key provided", codigo="invalid_api_key"))
        reloj = Reloj()
        with self.assertRaises(ErrorEmbedder) as ctx:
            embedder(s, reloj).embed(["a"])
        self.assertEqual(len(s.requests), 1)
        self.assertEqual(reloj.esperas, [])
        msg = str(ctx.exception)
        self.assertIn("401", msg)
        self.assertIn("OPENAI_API_KEY", msg)

    def test_400_no_se_reintenta_y_dice_el_motivo(self):
        s = Servidor(error_api(400, "input too long"))
        with self.assertRaises(ErrorEmbedder) as ctx:
            embedder(s).embed(["a"])
        self.assertEqual(len(s.requests), 1)
        self.assertIn("400", str(ctx.exception))
        self.assertIn("input too long", str(ctx.exception))

    # --- la clave no se filtra ---

    def assert_sin_clave(self, exc: BaseException) -> None:
        completo = "".join(traceback.format_exception(exc))
        for texto in (str(exc), repr(exc), completo):
            self.assertNotIn(CLAVE, texto)
            self.assertNotIn("DISTINTIVA", texto)
        self.assertIsNone(exc.__cause__)
        self.assertIsNone(exc.__context__)

    def test_la_clave_no_aparece_en_ningun_error(self):
        casos = {
            "401 que repite la clave": error_api(401, f"Incorrect API key provided: {CLAVE}. Find it at ..."),
            "401 con la clave a medias": error_api(401, "Incorrect API key provided: sk-test-DISTINTIVA-Zq8f****"),
            "400 que repite la clave": error_api(400, f"bad request for {CLAVE}"),
            "500": error_api(500, f"upstream failed, key={CLAVE}"),
            "cuerpo que no es JSON": lambda r: httpx.Response(502, text=f"<html>{CLAVE}</html>"),
        }
        for nombre, resp in casos.items():
            with self.subTest(nombre):
                s = Servidor(resp)
                with self.assertRaises(ErrorEmbedder) as ctx:
                    embedder(s, reintentos=1).embed(["a"])
                self.assert_sin_clave(ctx.exception)

    def test_una_clave_sin_prefijo_sk_tambien_se_tacha(self):
        """El patrón `sk-...` no alcanza si la clave tiene otro formato: se tacha por valor exacto."""
        otra = "clave-falsa-DISTINTIVA-777"
        s = Servidor(error_api(401, f"Incorrect API key provided: {otra}"))
        e = OpenAIEmbedder(clave=otra, http_client=s.http_client(), esperar=Reloj())
        with self.assertRaises(ErrorEmbedder) as ctx:
            e.embed(["a"])
        self.assertNotIn(otra, str(ctx.exception))
        self.assertIn("[clave]", str(ctx.exception))

    def test_error_de_conexion_con_la_clave_en_el_mensaje(self):
        def cae(request):
            raise httpx.ConnectError(f"fallo con {CLAVE}", request=request)

        s = Servidor(cae)
        with self.assertRaises(ErrorEmbedder) as ctx:
            embedder(s, reintentos=0).embed(["a"])
        self.assert_sin_clave(ctx.exception)

    def test_repr_y_str_del_embedder_no_llevan_la_clave(self):
        e = embedder(Servidor())
        e.embed(["a"])
        for texto in (repr(e), str(e), repr(e.__dict__)):
            self.assertNotIn(CLAVE, texto)
            self.assertNotIn("DISTINTIVA", texto)

    def test_la_clave_no_se_imprime_ni_se_loguea(self):
        out, err, log = io.StringIO(), io.StringIO(), io.StringIO()
        h = logging.StreamHandler(log)
        raiz = logging.getLogger()
        nivel = raiz.level
        raiz.addHandler(h)
        raiz.setLevel(logging.DEBUG)
        self.addCleanup(lambda: (raiz.removeHandler(h), raiz.setLevel(nivel)))
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            with self.assertRaises(ErrorEmbedder):
                embedder(Servidor(error_api(401, "no"))).embed(["a"])
            embedder(Servidor()).embed(["a"])
        for flujo in (out, err, log):
            self.assertNotIn(CLAVE, flujo.getvalue())
            self.assertNotIn("DISTINTIVA", flujo.getvalue())


@NECESITA_SDK
class TestCliYGuardia(ConCerebroSinEntorno):
    def indice(self, emb) -> Indice:
        return Indice(self.base / ".cerebro" / "indice.sqlite", emb)

    def test_la_cli_no_imprime_la_clave_en_un_error(self):
        self.nota("p", "a.md", "Titulo", "cuerpo de la nota")
        s = Servidor(error_api(401, f"Incorrect API key provided: {CLAVE}"))
        code, out, err = self.cli("indexar", embedder=embedder(s))
        self.assertEqual(code, 2)
        self.assertNotIn(CLAVE, out + err)
        self.assertIn("OPENAI_API_KEY", err)

    def test_al_indexar_solo_se_manda_el_fragmento_sin_el_frontmatter(self):
        self.nota("p", "a.md", "Titulo de la nota", "El cuerpo que si se indexa.")
        s = Servidor()
        with self.indice(embedder(s)) as ind:
            ind.indexar(self.base)
        enviado = "\n".join(t for lote in s.entradas() for t in lote)
        self.assertIn("El cuerpo que si se indexa.", enviado)
        for ajeno in ("proyecto:", "tipo:", "fuente:", "tags:", "---", "2026-10-06"):
            self.assertNotIn(ajeno, enviado)

    def test_local_a_openai_se_niega_a_mezclar(self):
        self.nota("p", "a.md", "Titulo", "cuerpo")
        with self.indice(embedders.Falso()) as ind:
            ind.indexar(self.base)
        s = Servidor()
        with self.indice(embedder(s)) as ind:
            with self.assertRaises(ErrorModelo) as ctx:
                ind.indexar(self.base)
            self.assertIn("indexar --todo", str(ctx.exception))
            with self.assertRaises(ErrorModelo):
                ind.buscar("cuerpo")
        self.assertEqual(s.requests, [])  # se negó antes de gastar un solo request

    def test_openai_a_local_se_niega_a_mezclar(self):
        self.nota("p", "a.md", "Titulo", "cuerpo")
        with self.indice(embedder(Servidor())) as ind:
            ind.indexar(self.base)
        with self.indice(embedders.Falso()) as ind:
            with self.assertRaises(ErrorModelo) as ctx:
                ind.buscar("cuerpo")
        self.assertIn("text-embedding-3-small", str(ctx.exception))

    def test_indexar_todo_con_openai_reconstruye_y_busca(self):
        self.nota("p", "a.md", "Titulo", "cuerpo")
        with self.indice(embedders.Falso()) as ind:
            ind.indexar(self.base)
        s = Servidor()
        with self.indice(embedder(s)) as ind:
            r = ind.indexar(self.base, todo=True)
            self.assertEqual(r.nuevas, 1)
            self.assertEqual(len(ind.buscar("cuerpo")), 1)
        self.assertIn(["cuerpo"], s.entradas())  # la consulta también viaja


if __name__ == "__main__":
    unittest.main()
