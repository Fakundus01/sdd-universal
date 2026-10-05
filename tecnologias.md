# tecnologias.md · Catálogo de tecnologías

**Versión:** 0.8.1 · 2026-10-05 · **Bloque:** `stack` · **Para agentes:** leer solo cuando la tarea sea elegir o justificar el stack (R12), o cuando el humano traiga tecnologías elegidas desde la web del catálogo.

> Este archivo dice **qué existe**, no qué usar. La recomendación por tarea la hace el agente con R12; las versiones se verifican contra la web al arrancar (R19), y por eso esta tabla no lleva números de versión: envejecerían mal y darían una falsa sensación de estar al día.

**128 tecnologías** en 14 categorías. `OS` = open source.

**Cobertura, dicha de frente:** lenguajes y frameworks están completos; bases de datos, DevOps e IA ya tienen lo esencial (0.7), y cloud y seguridad siguen siendo un arranque. No es un error del archivo: es hasta dónde llegó el relevamiento. Se completa con casos reales, como todo acá (R20).

## Lenguajes (28)

| Tecnología | Tipo | Ecosistema | Uso principal | OS |
|---|---|---|---|---|
| **Assembly** | Lenguaje | — | Low-level | ✓ |
| **C** | Lenguaje | — | Sistemas/embedded | ✓ |
| **C#** | Lenguaje | — | .NET/gaming | ✓ |
| **C++** | Lenguaje | — | Gaming/sistemas | ✓ |
| **Dart** | Lenguaje | — | Mobile/Flutter | ✓ |
| **Fortran** | Lenguaje | — | Ciencia/ingeniería | ✓ |
| **Go** | Lenguaje | — | Backend/cloud | ✓ |
| **Haskell** | Lenguaje | — | Programación funcional | ✓ |
| **Java** | Lenguaje | — | Backend/enterprise | ✓ |
| **JavaScript** | Lenguaje | — | Frontend/backend | ✓ |
| **Kotlin** | Lenguaje | — | Android/backend | ✓ |
| **Lua** | Lenguaje | — | Scripting/gaming | ✓ |
| **MATLAB** | Lenguaje | — | Ingeniería/cálculo | — |
| **Objective-C** | Lenguaje | — | Apple/legacy | ✓ |
| **Perl** | Lenguaje | — | Automatización | ✓ |
| **PHP** | Lenguaje | — | Web | ✓ |
| **Python** | Lenguaje | — | IA/backend/data science | ✓ |
| **R** | Lenguaje | — | Data science/estadística | ✓ |
| **Ruby** | Lenguaje | — | Web | ✓ |
| **Rust** | Lenguaje | — | Sistemas/backend | ✓ |
| **Scala** | Lenguaje | — | Backend/Big Data | ✓ |
| **SQL** | Lenguaje | — | Bases de datos | ✓ |
| **Swift** | Lenguaje | — | Apple/mobile | ✓ |
| **TypeScript** | Lenguaje | — | Frontend/backend | ✓ |
| **Visual Basic** | Lenguaje | — | Windows/enterprise | — |
| **Elixir** | Lenguaje | — | Backend concurrente | ✓ |
| **Julia** | Lenguaje | — | Ciencia/cálculo | ✓ |
| **Zig** | Lenguaje | — | Sistemas | ✓ |

## Frameworks (50)

| Tecnología | Tipo | Ecosistema | Uso principal | OS |
|---|---|---|---|---|
| **.NET MAUI** | Framework | C# | Multiplatform | ✓ |
| **Actix Web** | Framework | Rust | Backend/API | ✓ |
| **AdonisJS** | Framework | TypeScript | Backend | ✓ |
| **Angular** | Framework | TypeScript | Frontend | ✓ |
| **ASP.NET Core** | Framework | C# | Backend/web | ✓ |
| **Axum** | Framework | Rust | Backend/API | ✓ |
| **Backbone.js** | Framework | JavaScript | Web | ✓ |
| **Beego** | Framework | Go | Web/backend | ✓ |
| **CakePHP** | Framework | PHP | Web | ✓ |
| **CodeIgniter** | Framework | PHP | Web | ✓ |
| **Django** | Framework | Python | Backend/web | ✓ |
| **Echo** | Framework | Go | Backend/API | ✓ |
| **Ember.js** | Framework | JavaScript | Web | ✓ |
| **Express.js** | Framework | JavaScript/TypeScript | Backend/API | ✓ |
| **FastAPI** | Framework | Python | API/backend · ver [lección](#lecciones-de-proyectos-reales) | ✓ |
| **Fastify** | Framework | JavaScript/TypeScript | Backend/API | ✓ |
| **Fiber** | Framework | Go | Backend/API | ✓ |
| **Flask** | Framework | Python | Web/API | ✓ |
| **Flutter** | Framework | Dart | Mobile/multiplatform | ✓ |
| **Gatsby** | Framework | JavaScript/React | Static web | ✓ |
| **Gin** | Framework | Go | Backend/API | ✓ |
| **Grails** | Framework | Groovy | Web | ✓ |
| **Hapi.js** | Framework | JavaScript | Backend/API | ✓ |
| **Koa.js** | Framework | JavaScript | Backend/API | ✓ |
| **Laravel** | Framework | PHP | Backend/web | ✓ |
| **Meteor** | Framework | JavaScript | Full-stack | ✓ |
| **Micronaut** | Framework | Java/Kotlin/Groovy | Microservices | ✓ |
| **NestJS** | Framework | TypeScript | Backend | ✓ |
| **Next.js** | Framework | JavaScript/TypeScript | Full-stack web | ✓ |
| **Nuxt** | Framework | JavaScript/TypeScript | Web | ✓ |
| **Phoenix** | Framework | Elixir | Web/backend | ✓ |
| **Play Framework** | Framework | Java/Scala | Web/backend | ✓ |
| **Quarkus** | Framework | Java | Cloud/microservices/backend | ✓ |
| **React Native** | Framework | JavaScript/TypeScript | Mobile | ✓ |
| **Remix** | Framework | JavaScript/TypeScript | Web | ✓ |
| **Rocket** | Framework | Rust | Web/backend | ✓ |
| **Ruby on Rails** | Framework | Ruby | Web | ✓ |
| **Slim** | Framework | PHP | API/web | ✓ |
| **Spring Boot** | Framework | Java | Backend/enterprise | ✓ |
| **SvelteKit** | Framework | JavaScript/TypeScript | Web | ✓ |
| **Symfony** | Framework | PHP | Web | ✓ |
| **Vapor** | Framework | Swift | Backend/API | ✓ |
| **Vert.x** | Framework | Java/JVM | Reactive applications | ✓ |
| **Vue.js** | Framework | JavaScript/TypeScript | Frontend | ✓ |
| **Yii** | Framework | PHP | Web | ✓ |
| **Astro** | Framework | JavaScript/TypeScript | Sitios de contenido | ✓ |
| **Electron** | Framework | JavaScript/TypeScript | Apps de escritorio | ✓ |
| **Svelte** | Framework | JavaScript/TypeScript | Frontend | ✓ |
| **Tauri** | Framework | Rust + JS | Apps de escritorio livianas | ✓ |
| **Tailwind CSS** | Framework CSS | CSS | Estilos con clases utilitarias | ✓ |

## Bibliotecas (19)

| Tecnología | Tipo | Ecosistema | Uso principal | OS |
|---|---|---|---|---|
| **Axios** | Biblioteca | JavaScript/TypeScript | HTTP | ✓ |
| **Beautiful Soup** | Biblioteca | Python | Web scraping | ✓ |
| **D3.js** | Biblioteca | JavaScript | Visualización | ✓ |
| **jQuery** | Biblioteca | JavaScript | DOM | ✓ |
| **Lodash** | Biblioteca | JavaScript | Utilidades | ✓ |
| **Matplotlib** | Biblioteca | Python | Visualización | ✓ |
| **NumPy** | Biblioteca | Python | Cálculo numérico | ✓ |
| **Pandas** | Biblioteca | Python | Datos | ✓ |
| **Pydantic** | Biblioteca | Python | Validación de datos · ver [lección](#lecciones-de-proyectos-reales) | ✓ |
| **PyTorch** | Biblioteca | Python / C++ | IA y Machine Learning | ✓ |
| **React** | Library | JavaScript/TypeScript | Frontend | ✓ |
| **Redux** | Biblioteca | JavaScript/TypeScript | Estado | ✓ |
| **Requests** | Biblioteca | Python | HTTP | ✓ |
| **Scikit-learn** | Biblioteca | Python | Machine Learning | ✓ |
| **Socket.IO** | Biblioteca | JavaScript | Tiempo real | ✓ |
| **SQLAlchemy** | Biblioteca | Python | ORM/database | ✓ |
| **TensorFlow** | Biblioteca | Python / C++ | IA y Machine Learning | ✓ |
| **Three.js** | Biblioteca | JavaScript | 3D/WebGL | ✓ |
| **React Router** | Biblioteca | JavaScript/TypeScript | Rutas del front (SPA) | ✓ |

## Backend (3)

| Tecnología | Tipo | Ecosistema | Uso principal | OS |
|---|---|---|---|---|
| **Node.js · Runtime** | Runtime | JavaScript/TypeScript | Backend | ✓ |
| **Bun** | Runtime | JavaScript/TypeScript | Backend/tooling rápido | ✓ |
| **Deno** | Runtime | JavaScript/TypeScript | Backend seguro por default | ✓ |

## Bases de datos (6)

| Tecnología | Tipo | Ecosistema | Uso principal | OS |
|---|---|---|---|---|
| **PostgreSQL** | Base de datos | SQL | Relacional | ✓ |
| **SQLite** | Base de datos | SQL | Embebida/local | ✓ |
| **MongoDB** | Base de datos | — | Documentos/NoSQL | ✓ |
| **Redis** | Base de datos | — | Cache/tiempo real | ✓ |
| **DuckDB** | Base de datos | SQL | Análisis local | ✓ |
| **Supabase** | BaaS | SQL | Postgres + auth + API | ✓ |

## Deployment/PaaS (1)

| Tecnología | Tipo | Ecosistema | Uso principal | OS |
|---|---|---|---|---|
| **Vercel** | PaaS | JS/TS | Frontend/Full-stack | — |

## Cloud (2)

| Tecnología | Tipo | Ecosistema | Uso principal | OS |
|---|---|---|---|---|
| **AWS** | Cloud | Multilenguaje | Infraestructura | — |
| **Azure** | Cloud | Multilenguaje | Infraestructura | — |

## DevOps (3)

| Tecnología | Tipo | Ecosistema | Uso principal | OS |
|---|---|---|---|---|
| **Kubernetes** | Tool | — | Orquestación | ✓ |
| **Docker** | Tool | — | Contenedores | ✓ |
| **GitHub Actions** | Tool | — | CI/CD | — |

## Testing (4)

| Tecnología | Tipo | Ecosistema | Uso principal | OS |
|---|---|---|---|---|
| **Jest** | Tool | JavaScript/TypeScript | Testing | ✓ |
| **Playwright** | Tool | JavaScript/TypeScript | Testing web | ✓ |
| **Vitest** | Tool | JavaScript/TypeScript | Testing (unit, sobre Vite) | ✓ |
| **pytest** | Tool | Python | Testing | ✓ |

## Seguridad (1)

| Tecnología | Tipo | Ecosistema | Uso principal | OS |
|---|---|---|---|---|
| **OWASP ZAP** | Tool | — | Seguridad web | ✓ |

## IA - Modelos (4)

| Tecnología | Tipo | Ecosistema | Uso principal | OS |
|---|---|---|---|---|
| **GPT** | Modelo IA | — | LLM | — |
| **Claude** | Modelo IA | — | LLM/agentes | — |
| **Ollama** | Tool | — | LLMs locales | ✓ |
| **Anthropic API** | API/SDK | Python/TypeScript | Claude desde tu app (SDK oficial) · ver [lección](#lecciones-de-proyectos-reales) | — |

## Videojuegos (3)

| Tecnología | Tipo | Ecosistema | Uso principal | OS |
|---|---|---|---|---|
| **Godot · Game Engine** | Game Engine | GDScript/C++ | Videojuegos | ✓ |
| **Unity · Game Engine** | Game Engine | C# | Videojuegos | — |
| **Unreal Engine · Game Engine** | Game Engine | C++ | Videojuegos | — |

## Pagos (2)

| Tecnología | Tipo | Ecosistema | Uso principal | OS |
|---|---|---|---|---|
| **Mercado Pago** | Pasarela de pago | Multilenguaje | Cobros en Latinoamérica (checkout + webhooks) | — |
| **Stripe** | Pasarela de pago | Multilenguaje | Cobros online (checkout + webhooks) | — |

## Developer Tools (2)

| Tecnología | Tipo | Ecosistema | Uso principal | OS |
|---|---|---|---|---|
| **Puppeteer** | Tool | JavaScript/TypeScript | Automatización web | ✓ |
| **Vite** | Build tool | JavaScript/TypeScript | Dev server y build del front | ✓ |

---

## Lecciones de proyectos reales

Trampas que costaron horas en proyectos hechos con el SDD (la landing, la tienda, la mesa de ayuda con IA y el chatbot de 0.33, todos FastAPI + React/Vite/TS). Cuando elegís la tecnología en la web, la lección viaja al prompt de arranque junto con ella.

**FastAPI · el `Path()` compartido.** Un `Path(ge=1)` o un `Query()` guardado en una variable y reusado en varias rutas queda atado al nombre del **primer** parámetro que lo usó. En otra ruta, con otro nombre, FastAPI lo busca con el nombre viejo y responde **422 «field required» (missing)** aunque el valor venga bien. Se crea uno por parámetro, o se declara una vez como **tipo**, que sí se puede reusar:

```python
from typing import Annotated
from fastapi import Path

IdPositivo = Annotated[int, Path(ge=1)]

@app.get("/tickets/{ticket_id}")
def ver_ticket(ticket_id: IdPositivo): ...

@app.get("/clientes/{cliente_id}")
def ver_cliente(cliente_id: IdPositivo): ...
```

**FastAPI + Pydantic · el validador que se llama como el campo.** Un `@field_validator("prioridad")` cuyo método **también** se llama `prioridad` pisa el atributo de la clase: el campo pierde su default y un campo opcional pasa a ser obligatorio, o termina en un **500**. Pasó en la mesa de ayuda con un campo que casi nunca se mandaba, así que ningún test lo vio. El método va con otro nombre, y la API se testea también **sin** los campos opcionales:

```python
from pydantic import BaseModel, field_validator

class TicketNuevo(BaseModel):
    asunto: str
    prioridad: str = "media"

    @field_validator("prioridad")
    @classmethod
    def validar_prioridad(cls, v: str) -> str:   # no `def prioridad(...)`
        if v not in {"baja", "media", "alta"}:
            raise ValueError("prioridad inválida")
        return v
```

**Anthropic API (SDK oficial).** Tres lecciones, detalladas en `playbooks/ia-en-el-producto.md`:
- **Tests con el SDK real sobre un transporte falso**, no con un mock del cliente: `anthropic.Anthropic(http_client=httpx.Client(transport=httpx.MockTransport(responder)))`. Así se prueban el parseo, los errores y el `usage` de verdad, sin gastar. Un mock del objeto cliente prueba tu mock.
- **El tope de gasto es una reserva.** Bajo un lock se anota lo máximo que puede costar la llamada **antes** de llamar, y al volver se ajusta con el uso real. «Chequear y después llamar» deja pasar todos los pedidos en paralelo. Con `max_retries=0` en esa llamada: cada reintento automático se cobra y la reserva cubre uno.
- **Modelos vigentes.** Los IDs se verifican en la doc del proveedor o con `client.models.list()` al arrancar (R19), nunca de memoria: los que recuerda un agente suelen estar retirados.

---

## Cómo se usa

1. **Desde la web:** en el combinador, el botón *Elegir tecnologías* abre el catálogo con filtros por categoría, ecosistema, tipo y open source. Lo que marques entra al prompt de arranque como bloque `TECNOLOGÍAS ELEGIDAS`.
2. **Desde el chat:** nombrá las tecnologías y el agente las cruza con esta tabla. Si pedís algo que no está, no pasa nada: es un punto de partida, no una restricción. Desde la web pasa lo mismo: lo que buscás y no está se puede sumar igual, y entra al prompt en un bloque aparte, **«PEDIDAS QUE NO ESTÁN EN EL CATÁLOGO»**, para que el agente confirme qué es y si encaja. Antes de 0.8 se perdía sin aviso.
3. **Al elegir stack (R12):** elegir de esta lista **no reemplaza la justificación**. El agente tiene que decir por qué esa combinación sirve para *este* proyecto, y qué descartó. Una tecnología tildada en una web no es una decisión de arquitectura.
4. **Lo que el humano eligió, manda** salvo que sea técnicamente inviable — y en ese caso el agente lo dice antes de escribir código, no después (R25).

## Cómo crece

Igual que todo en este paquete (R20): una tecnología entra cuando alguien la usó en un proyecto real, con su categoría, tipo, ecosistema y uso principal. Un catálogo que lista todo lo que existe no ayuda a elegir nada.

## Historial

| Versión | Fecha | Cambio |
|---|---|---|
| 0.8.1 | 2026-10-05 | Lección de Pydantic (`@field_validator` con el mismo nombre que el campo), en FastAPI y en Pydantic. |
| 0.8 | 2026-10-05 | +8 tecnologías que pidieron cuatro proyectos reales y el combinador perdía en silencio: Vite, Vitest, pytest, Tailwind CSS, React Router, Mercado Pago, Stripe (categoría nueva: Pagos) y Anthropic API. Sección «Lecciones de proyectos reales» (FastAPI y Anthropic API). Total: 128 en 14 categorías. |
| 0.7 | 2026-08-17 | +19 tecnologías donde el catálogo era más flaco: bases de datos (SQLite, MongoDB, Redis, DuckDB, Supabase), runtimes (Bun, Deno), escritorio (Electron, Tauri), lenguajes (Elixir, Julia, Zig), front (Svelte, Astro), infra (Azure, Docker, GitHub Actions) e IA (Claude, Ollama). Total: 120. |
| 0.6 | 2026-08-15 | Primer catálogo: 101 tecnologías en 13 categorías, importadas del relevamiento propio. Integrado al combinador de la web con filtros y selección múltiple. |
