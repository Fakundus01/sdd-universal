# ia-en-el-producto.md · Un modelo de IA adentro del producto, sin sorpresas de gasto ni de seguridad

```
BLOQUE: playbook · ID: ia-en-el-producto · CATEGORÍA: código · NIVEL: pro
TIEMPO: medio día además de la feature · REQUISITOS: nivel N4 de seguridad.md activo; SDK oficial del proveedor
RESULTADO: llamadas a la IA con techo de gasto real, registradas siempre, tests que no gastan, y la salida tratada como dato
```

Nace de cuatro proyectos reales hechos con el SDD (landing, tienda, mesa de ayuda con IA y chatbot, en `scenarios.md` S33). El tope de gasto se rompió **siete veces, y cada vez de otra forma**, en la mesa de ayuda y el chatbot, aunque el reviewer independiente (R30) lo miró en cada vuelta. Lo que sigue es lo que quedó en pie. Los ejemplos están en Python (SDK `anthropic`), pero los pasos sirven para cualquier proveedor.

## Pasos

### A · El tope de gasto es una **reserva**, no un chequeo
1. **Nunca «chequear y después llamar».** N pedidos en paralelo ven el mismo gasto y pasan todos: un reviewer midió 8 borradores con tope de USD 1 y gasto de USD 8. Bajo un lock: `gastado + cota ≤ tope` → se anota la cota en una fila `en_curso` → recién ahí se llama.
2. **La cota es lo máximo que puede costar la llamada, calculado del prompt real.** Un número fijo («$0,06 por borrador») no acota nada: con un historial largo la entrada crece.
   - **Entrada:** un token por **byte UTF-8** de todo lo que se manda (sistema + herramientas + mensajes). Es una cota dura para un tokenizador de bytes; «1,5 tokens por carácter» la pasan los emoji y el CJK.
   - **Precio:** el peor. Toda la entrada como escritura de caché (1,25×), y un modelo de fallback que no está en tu tabla de precios a un precio alto.
   - **Salida:** `max_tokens` × precio de salida.
   - **Con fallback del lado del servidor** (`fallbacks: "default"` o similar): un rechazo tardío del modelo principal **se cobra igual** y el fallback se cobra aparte. La cota suma **los dos intentos**.
   - **Con un loop de herramientas:** la entrada se paga **en cada vuelta**. La cota suma las N vueltas, cada una con todo lo anterior, más lo que puede crecer (la salida de la vuelta anterior y los resultados de herramienta, que también tienen techo: como mucho K herramientas por vuelta).
3. **La cota es una estimación, el chequeo la vuelve techo.** Antes de cada vuelta, se mide lo que de verdad se va a mandar. Si `cobrado + cota_de_esta_vuelta > reservado`, no se empieza: se corta con un aviso.
4. **Un solo intento por llamada** (`max_retries=0` en esa llamada). La reserva cubre una; los reintentos automáticos del SDK cobran más sin avisar. El usuario o el agente vuelve a pedir.
5. **Tres respuestas distintas cuando no entra.** «Ocupada, probá en unos segundos» solo si entraría sin lo que está en vuelo. Si no, «lo que queda del tope de hoy no alcanza», o «se alcanzó el tope». Y la marca de «IA activa» de la interfaz usa el mismo criterio.

### B · Se registra **siempre**, y lo que es ambiguo se cobra
6. **El costo real se acumula mientras corre, no al final.** Un objeto «turno» que el adaptador va llenando: si algo se corta a mitad, lo ya gastado está ahí.
7. **Cada intento a su precio.** Con fallback, el `usage` de arriba suele cubrir solo el intento que respondió. Los otros están en el desglose por intento (`usage.iterations` en Anthropic). Un intento sin modelo se cobra al modelo pedido.
8. **El caché se cobra:** escritura 1,25× la entrada (TTL de 5 min) y lectura 0,1×. Sin sumarlos, el primer pedido de cada ventana se subestimaba en un ~44%.
9. **Qué error cuesta qué:**
   - **La API rechazó el pedido antes de generar** (`APIStatusError`: 4xx, 529): costo 0. Si el usuario tenía un cupo de mensajes, se le devuelve.
   - **Ambiguo** (timeout, corte de red, un error que llega *a mitad* del stream, JSON de herramienta roto): pudo haberse cobrado, se conserva la cota de esa llamada o vuelta.
   - **Cualquier otra excepción:** se registra igual (`except Exception`). Al log va el **tipo** del error, nunca el texto, porque puede traer datos del usuario.
10. **Reservas colgadas.** Una fila `en_curso` al arrancar es de un proceso que murió: pasa a `interrumpida` **conservando su costo**. Al reservar, las `en_curso` de más de ~15 minutos también. El panel de gasto suma lo mismo que el tope (las en vuelo incluidas).

### C · Streaming (SSE): el cierre va en `finally`, y hay que provocarlo
11. Si el navegador se va a mitad, el generador **no** pasa por `except Exception`: llega un `GeneratorExit`, o directamente nada. Cerrar la reserva en un `finally`.
12. **El framework puede no cerrar tu generador.** Starlette 1.x (FastAPI) itera un generador sincrónico en un hilo y, al desconectarse el cliente, lo abandona sin `close()`: el `finally` corría recién con el GC (más de 90 s, medido). En ese caso:
    - el stream va por un generador async propio, que hace cada `next` en un hilo sin abandonarlo;
    - una respuesta que **siempre** hace `aclose()` sobre su iterador;
    - un `finally` que cierra el generador sincrónico, protegido de la cancelación.

    Va con un test contra un servidor de verdad: se corta después del primer evento y la fila tiene que dejar de estar `en_curso` en segundos.
13. **El texto de un intento descartado se retira de la pantalla.** Un rechazo o un JSON roto a mitad pueden haber mostrado texto: se manda un evento de «reemplazar», y ese texto no se guarda en el historial.

### D · La salida del modelo es dato
14. **El texto del usuario va escapado** (`<`, `>` y `&`) dentro de etiquetas que pone el sistema, y el autor de cada mensaje lo pone el sistema, no el texto. Un reemplazo de una sola pasada se rompe con `</tick</ticket>et>`.
15. **Salida estructurada:** se valida a mano después de recibirla, con el `usage` ya en la mano. Ojo con los helpers que validan *adentro* de la llamada: si la salida no cierra, lanzan y el gasto se pierde sin registrar. Pasó con `messages.parse`.
16. **Entradas de herramientas** con streaming de entrada (`eager_input_streaming`): la API no las valida. Hay que validarlas con un esquema estricto antes de correr nada, y lo que no valida vuelve al modelo como `is_error`. `stop_reason` (`refusal`, `max_tokens`) se mira **antes** de correr herramientas: una entrada cortada parsea como objeto parcial.
17. **Lo que se muestra se muestra como texto**, nunca como HTML. Si el front no renderiza markdown, la personalidad del bot dice «texto plano, pasos numerados», y las herramientas devuelven texto plano: el modelo copia el formato que lee.
18. **Las tarjetas de producto salen de la herramienta** (datos del catálogo), nunca del texto del modelo.
19. **El historial se agrega, no se edita.** Los bloques del asistente vuelven tal cual (con `to_dict()`, los de razonamiento incluidos con su firma): editarlos invalida el razonamiento preservado. El costo se acota con un límite de mensajes por conversación, que se toma de forma **atómica** antes de llamar (`update … where usados < N`). Si no, N pedidos en paralelo lo pasan.

### E · Tests que no gastan y que no mienten
20. **El SDK real sobre un transporte simulado** (`httpx.MockTransport` o el equivalente), nunca un objeto escrito a mano que imita al SDK: uno falso ocultó el bug del paso 15.
21. Un test por cada forma de romper el tope, con una API falsa que **cobra lo peor que la cota supone**: hilos de verdad, un fallback tardío, muchas herramientas, desconexión real, 529, timeout y error a mitad del stream.
22. Los tests nunca llaman a la API real. Para la calidad hay un eval aparte, que corre contra el modo simulado gratis y contra el modelo real solo a pedido. Antes de llamar, muestra el costo máximo.

### F · Modo simulado
23. Sin clave, el producto anda con un adaptador simulado que usa **las mismas herramientas** y hace streaming (con una pausa corta, si no en el navegador no se ve). Tiene que seguir la charla (el método o el gusto que se dijeron antes), si no, el humo en el navegador engaña.

## Verificación
- Con un tope bajo y 8–16 pedidos en paralelo contra el servidor real, el gasto registrado nunca pasa el tope.
- Cortar el stream después del primer evento deja la fila en `cortado` en segundos, no en `en_curso`.
- Un 529 registra costo 0, y un timeout conserva la reserva.
- Los mutantes «reserva sin lock», «cota fija», «sin `aclose`» y «sin chequeo por vuelta» dan rojo.

## Errores comunes
- El gasto registrado pasa el tope en paralelo → se chequea y después se llama → reservar bajo lock (paso 1).
- Pasa el tope con historiales largos → la reserva es un número fijo → cota del prompt real (paso 2).
- Pasa el tope solo con refusals → la cota cubre un intento y el fallback cobra dos → paso 2.
- La IA queda «apagada» todo el día después de una caída corta → los 529 conservaban la reserva → paso 9.
- Las reservas se quedan `en_curso` → el framework no cierra el generador → paso 12.
- Un test de carrera que nunca da rojo → la demora está fuera de la ventana entre mirar y anotar, o los hilos no arrancan juntos (usar `Barrier`). Hay que verlo fallar con el mutante (R29).

## Costos
- La cota es **muy conservadora** a propósito: un mensaje corto de chatbot reserva ~USD 0,40 y cuesta ~USD 0,01. Con un tope diario de USD 3 entran unos 7 mensajes **a la vez** (no por día). Si no alcanza, se sube el tope o se bajan las vueltas: nunca se afloja la cota.
- Decisión que es del owner y se registra en `decisions.md`: con una API lenta, los timeouts conservan su reserva y pueden gastar el tope sin respuestas. Se prefiere cortar antes que pasarse.

## Secretos
- La clave del proveedor va en `.env` del **servidor**, nunca en el front, y el `.env.example` la trae vacía. Los tests corren sin clave.

## Nota para agentes
Seguir literal. Los pasos 2, 3, 9 y 12 son los que más se rompieron: cada uno lleva su test con el mutante en rojo. Precios y nombres de modelos cambian: verificarlos contra la documentación del proveedor (R19) antes de escribir la tabla de precios.
