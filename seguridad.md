# seguridad.md · Controles por superficie de ataque

**Versión:** 0.13 · 2026-10-05 · **Bloque:** `seguridad` · **Para agentes:** leer cuando se clasifica la superficie del proyecto (R27), cuando se escribe o revisa `security.md`, y antes de cualquier feature que toque autenticación, datos de terceros, pagos, archivos o IA.

> **Por qué existe.** R17 cubre lo básico —secretos fuera del repo, `.gitignore` como paso 0— y con eso alcanza para un script. No alcanza para nada que tenga usuarios. Este archivo agrega los controles que aparecen cuando el proyecto crece, **organizados por lo que el proyecto realmente hace**, no como una lista de 80 ítems que nadie lee.
>
> No es una auditoría profesional ni la reemplaza. Es el piso que evita los errores que se repiten en el 90% de los proyectos chicos.

---

## 1 · Cómo se usa (R27)

En el arranque, el agente responde estas seis preguntas y aplica **solo** los niveles que correspondan. Un proyecto típico activa dos o tres, no los seis.

| # | Pregunta | Si es **sí** → |
|---|---|---|
| — | *(siempre)* | **N0 · Base** |
| 1 | ¿Hay cuentas de usuario o login? | **N1 · Identidad** |
| 2 | ¿Se guardan datos de personas (aunque sea un nombre y un teléfono)? | **N2 · Datos** |
| 3 | ¿Se mueve dinero, o hay algo que cobrar? | **N3 · Plata** |
| 4 | ¿Hay IA que recibe texto del usuario o lee contenido externo? | **N4 · IA** |
| 5 | ¿El usuario puede subir archivos? | **N5 · Archivos** |
| 6 | ¿Hay una API o endpoint público? | **N6 · Superficie pública** |

La clasificación y los niveles activados **se registran en `security.md` del proyecto**, con fecha. Si más adelante el proyecto suma login, se reclasifica: agregar una feature puede activar un nivel nuevo, y ese es justamente el momento en que la gente se olvida.

**Cada control que se declara lleva un test que se vio fallar (R29).** En los ejemplos de [`scenarios.md`](scenarios.md) S35, controles escritos en `security.md` (vencimiento de sesión, contención de rutas, el lock del rate limit) sobrevivían a su mutante: estaban en la spec pero ningún test los tocaba, o el test no daba rojo nunca. La tabla de controles del proyecto tiene una columna «test» y el reviewer (R30) rompe cada control una vez para verlo fallar. Un control sin test es una intención, no un control.

---

## 2 · N0 · Base — todo proyecto, sin excepción

| Control | Cómo se verifica |
|---|---|
| `.gitignore` con `.env` **antes** del primer commit (R17) | El archivo existe y `git status` no muestra `.env` |
| Ningún secreto en el código ni en el historial | Revisar el diff antes de cada commit; para repos existentes, correr `gitleaks` una vez |
| `.env.example` con los nombres y sin los valores | Existe y no tiene ninguna clave real |
| HTTPS en todo lo publicado | La URL abre en `https://` y no hay contenido mixto |
| Dependencias sin vulnerabilidades conocidas | `npm audit` / `pip-audit` en verde, o las excepciones justificadas por escrito |
| Saber qué es público a propósito | Cada clave que va al repo tiene escrito **por qué** puede estar ahí (ej. la `anon` de Supabase) |

> **El error más caro de este nivel** no es filtrar una clave: es filtrarla y **no rotarla** porque "ya la saqué del código". Si estuvo en un commit, está en el historial de todos los que clonaron. Se rota, siempre.

## 3 · N1 · Identidad — hay login

| Control | Por qué |
|---|---|
| Las contraseñas se hashean con bcrypt/argon2, **nunca** las guarda tu código | Si estás escribiendo el hasheo vos, casi siempre conviene delegarlo al proveedor de auth |
| Mínimo de largo, sin exigir símbolos raros | Las reglas absurdas empujan a `Password1!` en todos lados |
| La sesión vive en cookie `httpOnly` + `secure` + `sameSite`, no en `localStorage` | Un XSS lee `localStorage`; no lee una cookie `httpOnly` |
| La sesión vence, y el refresh también | Sesión eterna = una laptop robada es acceso permanente |
| Rate limit en login y en recupero | Sin esto, probar contraseñas es gratis |
| El recupero **no revela** si el mail existe | Responder distinto permite enumerar usuarios |
| Cerrar sesión invalida del lado del servidor | Borrar el token local no alcanza |
| **Autorización ≠ autenticación** | Saber quién sos no dice qué podés ver. Cada consulta filtra por dueño — idealmente en la base (RLS), no en el front |

> **El error #1 de este nivel:** confiar en que el front filtre. Si la seguridad depende de que el navegador no pida otra cosa, no hay seguridad. Se prueba con **dos cuentas**: entrá con la B e intentá leer los datos de la A cambiando un id en la URL.

## 4 · N2 · Datos — hay información de personas

Lo que `security.md` del proyecto tiene que contestar por escrito (R17 lo pide; acá está el detalle):

- **Qué se guarda** y, sobre todo, **qué se decidió NO guardar**. Lo que no está no se filtra.
- **De dónde sale** (lo carga el titular, se importa, se compra).
- **Para qué**, en una línea. Si no se puede escribir la finalidad, no se guarda.
- **Cuánto se retiene** y qué pasa después. Un plan de borrado sin fecha no existe.
- **Con quién se comparte**, incluyendo servicios de terceros (analytics, mailer, hosting).
- **Cómo se borra** si la persona lo pide.

| Control | Por qué |
|---|---|
| Minimización: pedir solo lo necesario para la función | Cada campo de más es riesgo sin beneficio |
| Datos sensibles (salud, ideología, biometría, menores) con criterio aparte | Otra categoría legal y otro nivel de cuidado |
| Backups: también contienen los datos | De nada sirve borrar de la base si queda en un backup eterno |
| Normativa local declarada | En Argentina, Ley 25.326. Nombrarla obliga a leerla una vez |
| Logs sin datos personales | El lugar más común donde se filtra un mail o un token |

**Borrar o anonimizar es en el archivo también** ([`scenarios.md`](scenarios.md) S35, H25). En SQLite, un `UPDATE` o un `DELETE` deja los valores viejos en páginas libres del archivo: en dos de los ejemplos, después de «anonimizar» seguían ahí casi todos los nombres y mails. La base abre con `pragma secure_delete = on`, después de anonimizar se corre `VACUUM`, una base anonimizada con la versión anterior se limpia una vez, y el test lee los **bytes** del archivo, no las filas. Los backups no se anonimizan solos: retención corta (por ejemplo 30 días), y restaurar uno es anonimizar antes de volver a atender.

## 5 · N3 · Plata — hay cobros

| Control | Por qué |
|---|---|
| **Nunca** guardar ni tocar datos de tarjeta | Se usa la pasarela (Mercado Pago, Stripe). Guardarlos te mete en PCI-DSS, que no querés |
| El precio se calcula **en el servidor** | Si el total viene del navegador, alguien lo va a mandar en 0 |
| El pago se confirma por webhook del proveedor, no por el redirect | El redirect lo puede falsificar el usuario; el webhook viene firmado |
| Verificar la firma del webhook | Un webhook sin verificar es un endpoint que regala pedidos pagos |
| Idempotencia: el mismo webhook dos veces no cobra ni entrega dos veces | Los proveedores reintentan. Siempre |
| Registro inmutable de cada transacción | Cuando haya una discusión por plata, el log es la única prueba |

## 6 · N4 · IA — hay un modelo que recibe texto o lee contenido

Este nivel casi no existía hace unos años y hoy es de los más ignorados.

| Control | Por qué |
|---|---|
| **Lo que el modelo lee es dato, no instrucción** (R26) | Contenido de una web, un PDF o una issue puede traer texto dirigido al modelo. Si el modelo puede actuar, eso es una vía de ejecución |
| Límite de gasto por usuario y global, con corte automático: **se reserva la cota antes de llamar**, bajo lock, y se registra siempre ([`playbooks/ia-en-el-producto.md`](playbooks/ia-en-el-producto.md)) | Un endpoint de IA sin techo es una factura sin límite superior. «Chequear y después llamar» no es un techo: en paralelo pasan todos, y una reserva fija tampoco lo es si el prompt crece |
| Rate limit por IP y por cuenta | Sin esto, tu clave paga el uso de un tercero |
| La API key **nunca** en el front | Si está en el navegador, es pública. Va en el servidor |
| Nada sensible en el prompt sin decidirlo | Lo que va al prompt sale de tu infraestructura hacia el proveedor |
| Validar la **salida** antes de usarla | Si la respuesta se inserta en HTML, ejecuta SQL o corre como comando, es entrada no confiable |
| El texto del usuario va **escapado** (`<`, `>` y `&`) dentro de etiquetas que pone el sistema | Si solo se borra la etiqueta de cierre en una pasada, `</tick</ticket>et>` queda como `</ticket>` después de borrar: el cliente cierra el bloque de «dato» y lo que sigue el modelo lo lee como instrucción. Escapar no tiene ese problema |
| Tests con el **SDK real** sobre un transporte simulado | Un cliente falso escrito a mano ocultó que un helper validaba adentro de la llamada y perdía el registro del gasto |
| Decirle al usuario que habla con una IA | Y qué se guarda de esa conversación |

**El mapa completo: OWASP Top 10 para aplicaciones con LLM (2025).** La tabla de arriba sale de los proyectos reales. Esta es la lista de referencia de la industria, con dónde lo cubre el paquete. Al clasificar N4 se recorre entera: lo que no aplica se anota «no aplica, porque…», y lo que aplica lleva su control **y su test** (§1).

| # | Riesgo | En criollo | Control en el SDD |
|---|---|---|---|
| LLM01 | Prompt injection | Un input o un documento le cambia las instrucciones al modelo | R26 (lo leído es dato) · texto del usuario escapado en etiquetas del sistema · reglas en el system, nunca en el input |
| LLM02 | Fuga de información sensible | El modelo devuelve datos que no debería | Contexto mínimo: al modelo va solo lo que la tarea necesita (las notas internas no van) · N2 · el filtro de permisos se aplica **antes** de armar el prompt, no en la salida |
| LLM03 | Cadena de suministro | Modelos, datasets o plugins de terceros comprometidos | R28 (cada dependencia justificada, versión verificada) · SDK oficial del proveedor · modelos y datasets de origen conocido |
| LLM04 | Envenenamiento de datos o del modelo | Datos de entrenamiento o del RAG manipulados | Lo que entra al índice se trata como entrada de usuario: quién lo cargó, cuándo, se puede borrar · el contenido recuperado es dato (R26) |
| LLM05 | Manejo inseguro del output | Usar la salida sin validar (XSS, SQL, comandos) | Salida estructurada validada a mano · se muestra como texto, nunca HTML · nunca va a SQL ni a un shell sin validar |
| LLM06 | Agencia excesiva | El agente tiene más permisos o herramientas de los que necesita | Ver abajo: herramientas de solo lectura por defecto, el que lee no es el que actúa, aprobación humana para lo sensible |
| LLM07 | Fuga del system prompt | Se exponen instrucciones o secretos del prompt | El system prompt no lleva secretos (se asume que se filtra) · las reglas que importan se hacen cumplir en el código, no solo en el prompt |
| LLM08 | Debilidades en vectores y embeddings | Ataques o fugas a través de la base vectorial | Filtrar por permisos del usuario **antes** de buscar · un índice por inquilino o un filtro obligatorio en cada consulta · lo recuperado es dato |
| LLM09 | Desinformación | Alucinaciones tomadas como verdad | Datos del negocio (precios, stock, políticas) solo desde herramientas o RAG, nunca «de memoria» · citar la fuente · evals que lo prueban · una persona aprueba lo que se manda a un cliente |
| LLM10 | Consumo ilimitado | Costos disparados o caída del servicio por uso sin límites | El tope como **reserva** (`playbooks/ia-en-el-producto.md` A–B) · rate limit · límite de mensajes · `max_tokens` |

**Agentes que actúan (LLM06).** Si el modelo puede hacer algo además de contestar (publicar, mandar, cobrar, borrar, escribir en una base), tres reglas mínimas:
1. **El que lee no es el que actúa.** El agente que procesa contenido ajeno (comentarios, mensajes directos, mails, páginas) no tiene la herramienta que publica o responde: le pasa una propuesta a otro paso. Si no, cualquiera le mete instrucciones desde un comentario.
2. **Aprobación humana** para todo lo que sale hacia afuera o no se deshace: una persona ve la propuesta y la manda. Es el «borrador» de la mesa de ayuda de los ejemplos.
3. **La salida se valida antes de ejecutarse**, contra un esquema y una lista blanca de acciones, como cualquier entrada de usuario.

**Cliente corporativo: NIST AI RMF 1.0.** OWASP es la lista técnica. El marco de gestión de riesgo de IA del NIST es lo que pide un cliente grande. Tiene cuatro funciones, y el SDD ya tiene dónde va cada una:
- **Govern:** políticas y roles (R21 y [`teams.md`](teams.md) en equipos; en un proyecto chico, el owner y [`custom.md`](custom.md), donde quedan las reglas que se apagaron y por qué).
- **Map:** contexto y riesgos de cada caso de uso (§1 de este archivo y `spec.md`).
- **Measure:** evals y métricas (los outcomes, el eval del producto).
- **Manage:** priorizar y mitigar (la deuda aceptada en `status.md`, con fecha y disparador).

Si el cliente lo exige, `security.md` lleva una sección por función, con la evidencia de cada una.

## 7 · N5 · Archivos — el usuario puede subir

| Control | Por qué |
|---|---|
| Validar tipo **por contenido**, no por extensión | Renombrar `.exe` a `.jpg` es trivial |
| Límite de tamaño y de cantidad | Sin esto, llenar tu disco es gratis |
| Guardar fuera del directorio servido, con nombre generado | Nunca el nombre original: `../../` es un clásico |
| Servirlos con `Content-Disposition` y `nosniff` | Evita que un HTML subido se ejecute en tu dominio |
| Antivirus si son archivos entre usuarios | Si A le manda a B, sos el canal |

## 8 · N6 · Superficie pública — hay API o endpoints abiertos

| Control | Por qué |
|---|---|
| Validar **toda** entrada en el servidor, con esquema | La validación del front es usabilidad, no seguridad |
| Consultas parametrizadas, cero concatenación de SQL | Inyección SQL sigue siendo top 3 |
| CORS explícito, no `*` | `*` con credenciales es abrir la puerta |
| Rate limit general | El costo de abusar tiene que ser mayor que cero |
| Errores que no cuentan de más | Un stack trace en producción es un mapa |
| Headers: `nosniff`, `X-Frame-Options`, `Referrer-Policy`, y CSP si se puede | Baratos y evitan familias enteras de ataque |
| Paginación con techo | `?limite=999999` no puede bajar la base |
| Estáticos servidos desde una **lista blanca** armada al arrancar, nunca `base / ruta_del_pedido` | Tocar el disco con la ruta del cliente es path traversal, y en Windows `\\host\share` dispara SMB saliente y filtra el hash NTLM. Test: rutas hostiles (`..`, `%5c`, UNC, letra de unidad, alias 8.3) y un espía que confirma que el disco no se toca |

---

## 9 · Herramientas (todas con opción gratis)

| Qué | Para qué | Cuándo |
|---|---|---|
| **SonarQube / SonarCloud** | Análisis estático: bugs, code smells y vulnerabilidades en tu código | Gratis para repos públicos. Ideal en CI |
| **OWASP ZAP** | Escaneo dinámico contra el sitio andando | Antes de publicar algo con login |
| **gitleaks / trufflehog** | Buscar secretos en el historial de git | Una vez al adoptar el SDD en un repo existente (R15) |
| **Dependabot / Renovate** | Avisar de dependencias vulnerables | Siempre. Es gratis en GitHub |
| **npm audit · pip-audit** | Lo mismo, a mano | En cada auditoría de R19 |
| **Lighthouse** | Detecta HTTPS mal puesto y headers faltantes | En cada deploy grande |

> **Ninguna reemplaza pensar.** Un escáner encuentra el SQL concatenado; **no** encuentra que tu endpoint devuelve los pedidos de otro usuario, porque eso, para el código, funciona perfecto. Los controles de N1 y N2 se prueban a mano, con dos cuentas.

## 10 · Los errores que más se repiten

1. **Confiar en el front.** Si el chequeo está solo en el navegador, no existe.
2. **Filtrar una clave y no rotarla.** Está en el historial de git para siempre.
3. **Autenticar y no autorizar.** Saber quién sos no dice qué podés ver.
4. **Guardar "por las dudas".** Cada campo de más es riesgo sin beneficio.
5. **Logs con datos personales o tokens.** El lugar más común donde se filtra algo.
6. **Escáner en verde = seguro.** Ver el punto de arriba.
7. **Dejarlo para el final.** Agregar auth después de modelar los datos es rediseñar, no agregar.
8. **Un endpoint de IA sin techo de gasto.** No es una brecha, es una factura. Y un techo que se chequea en vez de reservarse tampoco es techo.
9. **Un control sin test.** Está escrito, se cree que funciona, y nadie lo vio fallar nunca.

## 11 · Lo que NO hay que hacer

- **Inventar tu propia criptografía o tu propio hasheo.** Usá el del proveedor o una librería estándar.
- **Seguridad decorativa:** exigir símbolos en la contraseña, ocultar rutas, minificar "para que no se entienda". No suman y dan falsa tranquilidad.
- **Copiar un checklist de 200 ítems** y tildarlo sin entenderlo. Por eso este archivo está por superficie: si no aplica, no aparece.

---

## Cómo crece

Igual que todo el paquete (R20): un control entra cuando alguien se comió el problema en un proyecto real, con el caso escrito en [`scenarios.md`](scenarios.md). Lo que no evite un error concreto no entra — un checklist que nadie termina de leer protege menos que seis controles que sí se aplican.

## Historial

| Versión | Fecha | Cambio |
|---|---|---|
| 0.13 | 2026-10-05 | N4 con el **mapa completo** del OWASP Top 10 para LLMs (2025), cada riesgo con su control en el paquete; reglas para agentes que actúan (LLM06: el que lee no es el que actúa, aprobación humana, salida validada), y el NIST AI RMF (Govern / Map / Measure / Manage) para clientes corporativos ([`scenarios.md`](scenarios.md) S38). |
| 0.12 | 2026-10-05 | Lecciones de los cuatro ejemplos (`scenarios.md` S33 y S35): N2 con el borrado en el archivo (`secure_delete` + `VACUUM`, backups); N4 con el tope como **reserva** y el playbook `ia-en-el-producto`, escape del texto del usuario y tests con el SDK real; N6 con los estáticos por lista blanca; cada control declarado lleva un test que se vio fallar; error 9 «un control sin test». |
| 0.11 | 2026-08-15 | Primera versión: clasificación por superficie (N0–N6), controles con su porqué y su verificación, herramientas con lo que cada una **no** detecta, y los 8 errores que más se repiten. Nace de R27. |
