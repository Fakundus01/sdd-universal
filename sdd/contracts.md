# contracts.md · SDD Hub

**Versión:** 0.8 · La web no expone API propia. Sus contratos son dos: la **forma de los archivos de datos** que consume, y las **llamadas a Supabase** que hace.

---

## 1 · `web/tecnologias.js` — generado

Define un global `TECH`. Una entrada por tecnología:

```js
{ n: "React",              // nombre, único, es la clave con la que se guarda
  c: "Bibliotecas",        // categoría — agrupa en la lista
  sc: "",                  // subcategoría, puede ir vacía
  t: "Library",            // tipo real
  e: "JavaScript/TypeScript", // ecosistema tal como vino de la fuente
  f: "JavaScript / TypeScript", // familia — normalizada, es la que filtra
  u: "Frontend",           // uso principal
  os: true }               // open source
```

`e` vs `f`: la fuente traía `JS/TS`, `JavaScript` y `JavaScript/TypeScript` como valores distintos para lo mismo. `e` conserva el original (fidelidad) y `f` agrupa (usabilidad del filtro). **Se muestra `e`, se filtra por `f`.**

**Fuente:** hoja `Todo` de `catalogo_tecnologias_software.xlsx`. No editar a mano (ADR-004).

---

## 2 · `web/reglas.js` — generado

Define un global `REGLAS`, en el orden del master:

```js
{ id: "R01", nombre: "GIT-OK", def: "ON",
  tipo: "desactivable",           // "fija" | "desactivable"
  nota: "avisar siempre",         // el paréntesis del master, puede ir vacío
  d: "Nunca git commit ni git push sin OK explícito del humano. …" }
```

`tipo` es el contrato que importa: `fija` significa que el configurador la muestra con candado y **no** puede apagarla (ADR-006).

**Fuente:** §4 de `SDD-MASTER.md`, parseada. No editar a mano.

---

## 3 · Formato de salida: `custom.md`

Lo que genera el configurador tiene que ser leíble por el agente **sin instrucciones extra**, así que respeta la sintaxis publicada en el `custom.md` del paquete:

```
PERFIL=ESTRICTO|CONFIANZA
MODO=FULL|LITE|COMPACT|FEDERADO
VARIANTE=WEB|DATA|GAME|API-only
Rxx=OFF                    # una por línea, solo desactivables
R05.max=<entero>           # parámetro
R14.stack=<texto>          # parámetro
+R27-NOMBRE: descripción   # regla propia
```

**Compromiso:** si cambia esta sintaxis en el paquete, cambia acá el mismo día. Un `custom.md` que el agente no entiende es peor que no tenerlo, porque el usuario cree que está configurado.

---

## 4 · Supabase (PostgREST + GoTrue)

Todo con header `apikey` y, salvo el primero, `Authorization: Bearer <access_token>`.

| Llamada | Para qué | Respuesta esperada |
|---|---|---|
| `POST /auth/v1/otp?redirect_to=…` | Pedir el magic link | `200`. Responde igual exista o no el email |
| `GET /auth/v1/user` | Traer id y email de la sesión | `200` con el usuario, `401` si el token venció |
| `POST /auth/v1/token?grant_type=refresh_token` | Renovar antes de vencer | `200` con tokens nuevos |
| `POST /auth/v1/logout` | Cerrar sesión del lado del servidor | `204`. Si falla, igual se limpia lo local |
| `GET /rest/v1/combinaciones?select=*&order=actualizado_en.desc` | Listar las propias | `200`. RLS filtra por usuario: nunca hace falta mandar `usuario_id` |
| `POST /rest/v1/combinaciones?on_conflict=usuario_id,nombre` con `Prefer: resolution=merge-duplicates,return=representation` | Guardar o pisar | `201` con la fila |
| `DELETE /rest/v1/combinaciones?id=eq.<id>` | Borrar una | `204` |
| `PATCH /rest/v1/perfiles?id=eq.<id>` | Guardar el tema elegido | `204` |

**El contrato que no se ve:** las consultas **nunca** filtran por usuario en el query string. Lo hace RLS del lado del servidor. Si alguna vez se agrega un `&usuario_id=eq.…` "por las dudas", es señal de que alguien dudó de las políticas — y esa duda se resuelve arreglando las políticas, no el front.

**Degradación:** sin `SUPABASE.url` y `SUPABASE.key`, ninguna de estas llamadas ocurre y las mismas funciones trabajan contra `localStorage`. La interfaz de `sesion.js` es idéntica en los dos casos.
