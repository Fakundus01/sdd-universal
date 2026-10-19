"""El demonio de búsqueda es opcional y nunca obligatorio: todo esto prueba que se pueda caer.

La pregunta que contesta cada test es la misma: ¿de dónde salió la respuesta? Por eso el índice
local tiene una nota y el demonio falso contesta **otra**: si en la salida aparece la del demonio,
se usó el demonio; si aparece la local, se cayó al camino de siempre. No hace falta espiar nada.
"""
from __future__ import annotations

import json
import os
import threading
import time
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer
from unittest import mock

from soporte import ConCerebro

import demonio
import mcp_server

TOKEN = "token-de-prueba-1234567890"
LOCAL = "Nota que está en el índice local"
REMOTA = "Nota que sólo contesta el demonio"


def _resultado(titulo: str = REMOTA, **cambios) -> dict:
    fila = {"titulo": titulo, "ruta": "proyectos/alfa/2026-10-17-remota.md", "proyecto": "alfa",
            "tipo": "leccion", "fuente": "alfa/sdd/loops/x.md", "fragmento": "cuerpo de la remota",
            "puntaje": 0.5}
    fila.update(cambios)
    return fila


class DemonioFalso:
    """Un demonio de mentira sobre `http.server`: habla el contrato de `demonio.py` y nada más."""

    def __init__(self, base, cuerpo_buscar=None, codigo_buscar: int = 200, token: str = TOKEN) -> None:
        self.base = str(base)
        self.cuerpo_buscar = cuerpo_buscar if cuerpo_buscar is not None else \
            {"ok": True, "resultados": [_resultado()]}
        self.codigo_buscar = codigo_buscar
        self.token = token
        self.pedidos: list[str] = []
        duenio = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args):  # que no escupa a stderr durante los tests
                pass

            def _responder(self, codigo, datos):
                cuerpo = json.dumps(datos).encode("utf-8")
                self.send_response(codigo)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(cuerpo)))
                self.end_headers()
                self.wfile.write(cuerpo)

            def _autorizado(self):
                return self.headers.get("X-Cerebro-Token") == duenio.token

            def do_GET(self):
                duenio.pedidos.append("GET " + self.path)
                if not self._autorizado():
                    self._responder(403, {"ok": False, "error": "no autorizado"})
                    return
                self._responder(200, {"ok": True, "listo": True, "base": duenio.base})

            def do_POST(self):
                duenio.pedidos.append("POST " + self.path)
                largo = int(self.headers.get("Content-Length") or 0)
                self.rfile.read(largo)
                if not self._autorizado():
                    self._responder(403, {"ok": False, "error": "no autorizado"})
                    return
                self._responder(duenio.codigo_buscar, duenio.cuerpo_buscar)

        self.servidor = HTTPServer(("127.0.0.1", 0), Handler)
        self.hilo = threading.Thread(target=self.servidor.serve_forever, daemon=True)
        self.hilo.start()

    @property
    def url(self) -> str:
        return f"http://127.0.0.1:{self.servidor.server_address[1]}"

    def cerrar(self) -> None:
        self.servidor.shutdown()
        self.servidor.server_close()
        self.hilo.join(timeout=5)


class Base(ConCerebro):
    def setUp(self) -> None:
        super().setUp()
        # `demonio.cliente()` reusa clientes entre llamadas: sin limpiar, un test podria heredar el
        # de otro. (Las claves incluyen la URL y la base, que son distintas en cada test, asi que
        # hoy no pasaria; se limpia igual para que siga siendo cierto si eso cambia.)
        demonio._CLIENTES.clear()
        self.addCleanup(demonio._CLIENTES.clear)
        self.nota("alfa", "2026-10-17-local.md", LOCAL, "El tope de gasto frena el costo del loop.")
        code, _, err = self.cli("indexar")
        self.assertEqual(code, 0, err)

    def con_demonio(self, **kwargs) -> DemonioFalso:
        falso = DemonioFalso(self.base, **kwargs)
        self.addCleanup(falso.cerrar)
        return falso

    def entorno(self, url: str, token: str | None = TOKEN) -> None:
        extra = {"CEREBRO_DEMONIO": url}
        if token is not None:
            extra["CEREBRO_DEMONIO_TOKEN"] = token
        parche = mock.patch.dict(os.environ, extra)
        parche.start()
        self.addCleanup(parche.stop)

    def archivos(self, url: str | None = None, token: str | None = None) -> None:
        """La otra forma de configurarlo: los archivos que deja el demonio adentro del Cerebro."""
        carpeta = self.base / "cerebrod"
        carpeta.mkdir(parents=True, exist_ok=True)
        if url is not None:
            (carpeta / "url.txt").write_text(url + "\n", encoding="utf-8")
        if token is not None:
            (carpeta / "token.txt").write_text(token + "\n", encoding="utf-8")


class TestConfiguracion(Base):
    def test_sin_variable_no_hay_cliente(self):
        """Lo normal: nadie configuró nada, así que el paquete no habla con nadie."""
        self.assertIsNone(demonio.cliente(self.base))

    def test_sin_token_no_hay_cliente(self):
        falso = self.con_demonio()
        self.entorno(falso.url, token=None)
        self.assertIsNone(demonio.cliente(self.base))
        self.assertEqual(falso.pedidos, [])

    def test_se_configura_solo_con_los_archivos_del_cerebro(self):
        """Sin ninguna variable de entorno: el demonio deja su `url.txt` y su `token.txt` adentro
        del Cerebro, y con eso alcanza para todos los clientes a la vez."""
        falso = self.con_demonio()
        self.archivos(url=falso.url, token=TOKEN)
        salida = mcp_server.buscar("tope de gasto")
        self.assertIn(REMOTA, salida)
        self.assertNotIn(LOCAL, salida)

    def test_la_variable_de_entorno_le_gana_al_archivo(self):
        falso = self.con_demonio()
        self.archivos(url="http://127.0.0.1:1", token="token-que-no-va")
        self.entorno(falso.url)
        self.assertIn(REMOTA, mcp_server.buscar("tope de gasto"))

    def test_url_vacia_o_archivo_en_blanco_no_configura_nada(self):
        self.archivos(url="   \n", token=TOKEN)
        self.assertIsNone(demonio.cliente(self.base))


class TestBuscarPorElDemonio(Base):
    def test_contesta_el_demonio(self):
        falso = self.con_demonio()
        self.entorno(falso.url)
        salida = mcp_server.buscar("tope de gasto")
        self.assertIn(REMOTA, salida)
        self.assertNotIn(LOCAL, salida)
        # Lo que vuelve sigue siendo material recuperado: el formato R26 no depende del camino.
        self.assertIn("MATERIAL RECUPERADO DEL CEREBRO", salida)
        self.assertIn("fuente: alfa/sdd/loops/x.md", salida)

    def test_le_pasa_los_filtros(self):
        falso = self.con_demonio()
        self.entorno(falso.url)
        mcp_server.buscar("tope", proyecto="Mi Proyecto", tipo="decision", k=3)
        self.assertIn("POST /buscar", falso.pedidos)

    def test_el_tipo_invalido_lo_corta_antes(self):
        """La validación es del paquete, no del demonio: ni se le pregunta."""
        falso = self.con_demonio()
        self.entorno(falso.url)
        with self.assertRaises(mcp_server.ErrorHerramienta):
            mcp_server.buscar("tope", tipo="inventado")
        self.assertEqual(falso.pedidos, [])


class TestSeCaeAlLocal(Base):
    """Todas las formas en que el demonio puede no servir terminan igual: contesta el índice local."""

    def assertLocal(self, salida: str) -> None:
        self.assertIn(LOCAL, salida)
        self.assertNotIn(REMOTA, salida)

    def test_otro_cerebro_se_ignora(self):
        """El caso que más importa: un demonio que anda, pero sirve OTRA memoria. Contestaría
        rápido y con notas que parecen válidas, y nadie tendría cómo notarlo."""
        falso = self.con_demonio()
        falso.base = str(self.afuera / "otro-cerebro")
        self.entorno(falso.url)
        self.assertLocal(mcp_server.buscar("tope de gasto"))

    def test_demonio_apagado(self):
        falso = self.con_demonio()
        url = falso.url
        falso.cerrar()
        self.entorno(url)
        self.assertLocal(mcp_server.buscar("tope de gasto"))

    def test_token_que_no_sirve(self):
        falso = self.con_demonio(token="otro-token-distinto-123456")
        self.entorno(falso.url)
        self.assertLocal(mcp_server.buscar("tope de gasto"))

    def test_respuesta_sin_las_claves_que_hacen_falta(self):
        falso = self.con_demonio(cuerpo_buscar={"ok": True, "resultados": [{"titulo": REMOTA}]})
        self.entorno(falso.url)
        self.assertLocal(mcp_server.buscar("tope de gasto"))

    def test_respuesta_que_no_es_json(self):
        falso = self.con_demonio()
        falso.cuerpo_buscar = {"ok": True, "resultados": "esto no es una lista"}
        self.entorno(falso.url)
        self.assertLocal(mcp_server.buscar("tope de gasto"))

    def test_el_demonio_dice_que_no_pudo(self):
        falso = self.con_demonio(cuerpo_buscar={"ok": False, "error": "lo que sea"})
        self.entorno(falso.url)
        self.assertLocal(mcp_server.buscar("tope de gasto"))

    def test_error_http(self):
        falso = self.con_demonio(codigo_buscar=500)
        self.entorno(falso.url)
        self.assertLocal(mcp_server.buscar("tope de gasto"))

    def test_si_se_cae_la_conexion_vuelve_a_chequear(self):
        """`sirve()` se cachea para no pagar un `/salud` por búsqueda. Si después se cae la
        conexión, ese cacheado se olvida: el demonio se pudo haber reiniciado apuntando a otro
        Cerebro, y seguir confiando sería el bug de `test_otro_cerebro_se_ignora`."""
        falso = self.con_demonio()
        self.entorno(falso.url)
        cliente = demonio.cliente(self.base)
        self.assertTrue(cliente.sirve(self.base))
        falso.cerrar()
        self.assertIsNone(cliente.buscar("tope", self.base))
        self.assertIsNone(cliente._sirve)

    def test_un_rechazo_del_demonio_no_lo_da_por_muerto(self):
        """Lo contrario del test de arriba: `{"ok": false}` es el demonio **vivo** diciendo que no
        con ese pedido. No hay por qué volver a preguntarle si sirve este Cerebro."""
        falso = self.con_demonio(cuerpo_buscar={"ok": False, "error": "lo que sea"})
        self.entorno(falso.url)
        cliente = demonio.cliente(self.base)
        self.assertIsNone(cliente.buscar("tope", self.base))
        self.assertTrue(cliente._sirve)


class TestNoSalirMasCaro(Base):
    """Un demonio caído no puede costar más que no tener demonio.

    Medido en Windows: un puerto muerto no rechaza la conexión, se come el timeout entero. Si
    además se armara un cliente nuevo por búsqueda, cada una pagaría ese timeout de nuevo — y
    buscar saldría más caro que antes de todo esto.
    """

    def test_el_cliente_se_reusa_entre_llamadas(self):
        falso = self.con_demonio()
        self.entorno(falso.url)
        self.assertIs(demonio.cliente(self.base), demonio.cliente(self.base))

    def test_no_repregunta_salud_en_cada_busqueda(self):
        falso = self.con_demonio()
        self.entorno(falso.url)
        mcp_server.buscar("tope de gasto")
        mcp_server.buscar("otra cosa")
        mcp_server.buscar("y otra más")
        self.assertEqual(falso.pedidos.count("GET /salud"), 1)
        self.assertEqual(falso.pedidos.count("POST /buscar"), 3)

    def test_si_no_esta_no_lo_reintenta_en_cada_busqueda(self):
        falso = self.con_demonio()
        self.entorno(falso.url)
        cliente = demonio.cliente(self.base)
        falso.cerrar()
        intentos = []
        cliente._pedir = lambda *a, **k: intentos.append(a[0]) or None
        self.assertFalse(cliente.sirve(self.base))
        self.assertFalse(cliente.sirve(self.base))
        self.assertFalse(cliente.sirve(self.base))
        self.assertEqual(intentos, ["/salud"])

    def test_pasada_la_espera_vuelve_a_intentar(self):
        """El «no está» caduca: si prendés el demonio después, se empieza a usar solo."""
        falso = self.con_demonio()
        self.entorno(falso.url)
        cliente = demonio.cliente(self.base)
        # `monotonic()` no arranca en cero (es tiempo desde el arranque de la maquina):
        # se resta del valor actual en vez de poner 0.0, que en una maquina recien
        # prendida podria caer DENTRO de la espera y hacer el test intermitente.
        cliente._sirve = False
        cliente._visto = time.monotonic() - demonio.ESPERA_REINTENTO - 1
        self.assertTrue(cliente.sirve(self.base))


class TestRutas(unittest.TestCase):
    def test_mismo_cerebro_no_distingue_mayusculas_en_windows(self):
        import tempfile
        from pathlib import Path

        with tempfile.TemporaryDirectory() as tmp:
            ruta = Path(tmp).resolve()
            self.assertTrue(demonio._mismo_cerebro(ruta, str(ruta)))
            self.assertTrue(demonio._mismo_cerebro(ruta, str(ruta) + os.sep))
            self.assertFalse(demonio._mismo_cerebro(ruta, str(ruta / "otro")))

    def test_base_que_no_es_ruta(self):
        self.assertFalse(demonio._mismo_cerebro(None, "/tmp"))
        self.assertFalse(demonio._mismo_cerebro("/tmp", None))


if __name__ == "__main__":
    unittest.main()
