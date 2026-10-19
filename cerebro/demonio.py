"""Cliente de un demonio de búsqueda (opcional): si hay uno, buscar cuesta ~40 ms en vez de ~1,2 s.

**Por qué.** `embedders.obtener()` devuelve un `Local()` nuevo en cada llamada y cada instancia
rearma su sesión ONNX. Medido en Windows con 175 notas y 262 fragmentos: 3440 ms la primera vez en
un proceso, **1223 ms cada vez después** — y el cálculo real sobre los vectores son 35 ms. O sea
que una búsqueda del MCP es casi toda carga de modelo. Un proceso que tenga el modelo y el índice
abiertos se saltea todo eso.

**Por qué no cachear el embedder acá y listo.** Cada sesión de Claude Code levanta su propio
`mcp_server.py`: cachear el modelo adentro serían ~220 MB por sesión. Con un demonio, el modelo
está una sola vez en la máquina y todos le preguntan.

**Es opt-in y no es parte del paquete.** Mientras no haya un `cerebrod/url.txt` adentro del Cerebro
(ni `CEREBRO_DEMONIO` en el entorno), este módulo no hace nada: no descubre nada solo, no escanea
puertos, no abre un socket. Que el demonio no esté **nunca es un error**: `buscar()` devuelve `None`
y quien llama hace lo que hacía siempre. El demonio en sí vive afuera de este repo; acá sólo está
el contrato, que es chico a propósito:

- `GET /salud` → `{"base": "<CEREBRO_DIR que está sirviendo>"}`
- `POST /buscar` con `{consulta, proyecto, tipo, k}` → `{"ok": true, "resultados": [...]}` con la
  misma forma que devuelve `Indice.buscar`.
- El token va en el header `X-Cerebro-Token`.

**La comprobación que no es opcional.** Antes de usar lo que conteste, se verifica que esté
sirviendo **el mismo** `CEREBRO_DIR`. Un demonio apuntando a otro Cerebro contestaría igual de
rápido y con notas que parecen válidas: serían de otra memoria, y el que pregunta no tendría cómo
notarlo. Un error así no se ve; por eso se chequea siempre, y ante la duda se usa el camino local.
"""
from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

TIMEOUT = 10.0
# Un demonio local contesta `/salud` en milisegundos (bindea antes de cargar el modelo, así que
# responde aunque esté arrancando). El timeout corto es para cuando NO está: medido en Windows, un
# puerto muerto no siempre rechaza la conexión al toque — se come el timeout entero.
TIMEOUT_SALUD = 0.6
# Y si no está, no se le vuelve a preguntar por un rato. Sin esto cada búsqueda paga el timeout de
# nuevo y un demonio caído sale MÁS caro que no tener ninguno, que es justo lo contrario de lo que
# viene a hacer esto.
ESPERA_REINTENTO = 30.0
# Lo que `mcp_server` lee de cada resultado. Si falta alguna, lo que contestó no sirve: se cae al
# camino local en vez de reventar formateando la respuesta.
CLAVES = ("titulo", "ruta", "proyecto", "tipo", "fuente", "fragmento", "puntaje")


def _mismo_cerebro(una, otra) -> bool:
    """Dos rutas apuntan al mismo lado. `normcase` porque en Windows `C:\\Users` y `c:\\users` son
    la misma carpeta y una comparación de texto diría que no."""
    try:
        return (os.path.normcase(str(Path(una).resolve()))
                == os.path.normcase(str(Path(otra).resolve())))
    except (OSError, ValueError, TypeError):
        return False


class Demonio:
    """Un demonio configurado. `sirve()` y `buscar()` nunca levantan: devuelven False o None."""

    def __init__(self, url: str, token: str) -> None:
        self.url = url.rstrip("/")
        self._token = token
        self._sirve = None  # None = todavía no se preguntó
        self._visto = 0.0

    def _pedir(self, ruta: str, cuerpo: dict | None = None, timeout: float = TIMEOUT) -> dict | None:
        pedido = urllib.request.Request(
            self.url + ruta,
            data=json.dumps(cuerpo).encode("utf-8") if cuerpo is not None else None,
            # El `Host` lo pone urllib desde la URL, que es lo que un demonio local va a exigir.
            headers={"X-Cerebro-Token": self._token, "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(pedido, timeout=timeout) as respuesta:
                datos = json.load(respuesta)
        except urllib.error.HTTPError as error:
            # Un 4xx/5xx llega como excepción, pero con el socket abierto: sin cerrarlo queda un
            # ResourceWarning y un descriptor colgando hasta que pase el recolector.
            error.close()
            return None
        except (urllib.error.URLError, OSError, ValueError, TimeoutError):
            return None
        return datos if isinstance(datos, dict) else None

    def sirve(self, base) -> bool:
        """¿Está, y está sirviendo este Cerebro?

        La respuesta se recuerda, y en las dos direcciones importa por qué: si está, para no pagar
        un `/salud` por búsqueda; si no está, para no pagar el timeout por búsqueda. El «no está»
        caduca a los `ESPERA_REINTENTO` segundos, así que prender el demonio después se nota solo.
        El «sí está» se olvida apenas una búsqueda falla (`buscar`): ahí puede haberse reiniciado
        apuntando a otro Cerebro, que es el caso que no se puede dejar pasar."""
        if self._sirve is True:
            return True
        if self._sirve is False and (time.monotonic() - self._visto) < ESPERA_REINTENTO:
            return False
        salud = self._pedir("/salud", None, timeout=TIMEOUT_SALUD)
        self._sirve = bool(salud) and _mismo_cerebro(salud.get("base"), base)
        self._visto = time.monotonic()
        return self._sirve

    def buscar(self, consulta: str, base, proyecto: str | None = None, tipo: str | None = None,
               k: int = 5) -> list[dict] | None:
        """Las notas más cercanas, o `None` si el demonio no está, no sirve este Cerebro o contestó
        algo que no se entiende. `None` significa «hacé lo de siempre», no «falló la búsqueda»."""
        if not self.sirve(base):
            return None
        datos = self._pedir("/buscar", {"consulta": consulta, "proyecto": proyecto, "tipo": tipo,
                                        "k": k})
        if datos is None:
            self._sirve = None  # se cayó o se reinició: la próxima vuelve a chequear
            return None
        if not datos.get("ok"):
            # Un pedido que el demonio rechaza (un `tipo` inválido, por ejemplo) lo rechaza igual el
            # camino local, y con el mensaje que ya conoce el que llama: se deja que lo diga él.
            return None
        resultados = datos.get("resultados")
        if not isinstance(resultados, list):
            return None
        if not all(isinstance(r, dict) and all(c in r for c in CLAVES) for r in resultados):
            return None
        return resultados


# Los clientes se reusan entre llamadas, y no es una optimización de más: lo que vale la pena
# recordar es si el demonio está (ver `sirve`), y eso vive adentro del objeto. Con un cliente nuevo
# por búsqueda —como estaba— esa memoria no servía para nada y cada búsqueda volvía a pagar el
# timeout del demonio caído. La clave incluye la config, así que si el demonio se reinicia en otro
# puerto (otro `url.txt`) se arma uno nuevo en vez de reusar el viejo.
_CLIENTES: dict[tuple, Demonio] = {}


def cliente(base) -> Demonio | None:
    """El demonio configurado, o `None` si no hay (que es lo normal). No habla con nadie todavía."""
    import config

    url = config.url_demonio(base)
    if not url:
        return None
    token = config.token_demonio(base)
    if not token:
        return None
    clave = (url, token, os.path.normcase(str(base)))
    if clave not in _CLIENTES:
        if len(_CLIENTES) > 8:  # config que cambió varias veces en un proceso largo: no se acumula
            _CLIENTES.clear()
        _CLIENTES[clave] = Demonio(url, token)
    return _CLIENTES[clave]
