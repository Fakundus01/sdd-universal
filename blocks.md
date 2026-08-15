# blocks.md · Bloques componibles: el SDD como LEGO

**Versión:** 0.4 · 2026-08-15 · **Para agentes:** leer solo cuando el proyecto viene de la web/catálogo o cuando la tarea es combinar bloques. **Para humanos:** cómo funciona el catálogo descargable.

---

## 1 · La idea

En vez de un solo SDD gigante que intenta cubrir todo, el sistema se arma con **bloques** que se combinan. Cada card de la web es un bloque. Ejemplo: el bloque `stack/python-libs` (librerías de Python) se linkea con el bloque `type/chatbot` (proyecto chatbot) y el resultado es un SDD a medida de "chatbot en Python", sin que nadie escriba ese SDD a mano.

## 2 · Tipos de bloque

| Tipo | Qué es | Ejemplos |
|---|---|---|
| **BASE** | El núcleo universal. Siempre presente, nunca se edita. | `SDD-MASTER.md` (o `SDD-COMPACT.md`) |
| **TYPE** | Un tipo de proyecto: decisiones ya tomadas, features típicas, riesgos del dominio, preguntas extra. | chatbot, calculadora, web-app, api-propia, scraper, proceso-automático, juego-de-estudio, guía-de-estudio/TP |
| **STACK** | Lenguaje/librerías/framework y sus convenciones. | python-libs, ts-fullstack, react-front, node-back |
| **PLAYBOOK** | Procedimiento paso a paso ya resuelto (ver `playbooks/`). | deploy-vercel, env-setup, create-react-vite |

Cabecera estándar de todo bloque (primeras líneas del MD):

```
BLOQUE: type · ID: chatbot · NIVEL: novato+pro · COMBINA-CON: stack/*, playbooks/*
```

## 3 · Regla de composición

```
SDD final = BASE + 1 TYPE + 0..1 STACK + 0..N PLAYBOOKS + custom.md
```

**Precedencia (lo específico pisa lo general):** BASE < TYPE < STACK < PLAYBOOK < `custom.md`. Si el TYPE dice "usá SQLite" y el STACK elegido dice "Postgres", gana el STACK; si tu `custom.md` dice otra cosa, gana custom. Los bloques nunca contradicen las reglas fijas del BASE (R05, R08, R17…): solo agregan o parametrizan.

## 4 · Qué trae un bloque TYPE (contrato)

1. **Decisiones ya tomadas** para ese dominio (ej. chatbot: "historial de conversación desde el día 1", "límite de gasto de API configurable").
2. **Features típicas** precargadas para `features.md` con su estado inicial.
3. **Riesgos del dominio** (ej. scraper: bloqueos, datos personales → `security.md`).
4. **Playbooks recomendados** (ej. web-app → deploy-vercel + env-setup).
5. **Preguntas extra** que se suman al cuestionario socrático (R04) de ese tipo de proyecto.

## 5 · Cómo se combinan (dos versiones)

**v1 — sin IA en el medio (funciona hoy):** la web concatena los bloques elegidos en un único prompt de arranque descargable/copiable. El agente del usuario (Claude, Codex, Cursor…) hace la fusión real en el arranque — ya sabe hacerlo: el cuestionario socrático resuelve los huecos y la precedencia resuelve los choques. No requiere backend ni API keys: la web es 100% estática.

**v2 — con IA en el medio (evolución):** la web llama a un modelo por API (Claude o GPT) que fusiona los bloques en un `sdd/` completo a medida, lo deja descargable como ZIP, y aprende: cada combinación nueva que funciona bien se puede promover a bloque oficial del catálogo (mismo motor de crecimiento que `scenarios.md`). Requiere una función serverless y una API key — se agrega después sin romper la v1.

## 6 · Niveles y etiquetas del catálogo

- **NOVATO / PRO** (R23): cada bloque declara su nivel. Los bloques novato activan pensar-por-tres y las anotaciones `[NOVATO]` de los playbooks.
- **Estados:** `✓ disponible` · `⏳ pendiente` · `🧪 en desarrollo`.
- **⚠ CRÍTICO:** categorías sensibles (ej. finanzas/inversión) llevan etiqueta fija: contenido educativo, no es consejo financiero/legal, y el agente lo repite al usarlo. Estas cards arrancan siempre como `🧪 en desarrollo`.

## 7 · Cómo nace un bloque nuevo

Igual que una regla (R20): caso real → se documenta → entra con el formato estándar. Un TYPE nuevo debe traer los 5 puntos del contrato (§4); un PLAYBOOK nuevo usa `playbooks/_template.md`. Lo que no le ahorre trabajo o errores a alguien, no entra al catálogo.

---

## Historial

| Versión | Fecha | Cambio |
|---|---|---|
| 0.4 | 2026-08-15 | Primera especificación: 4 tipos de bloque, regla de composición con precedencia, contrato de TYPE, combinación v1 (estática) y v2 (con IA), niveles y etiquetas. |
