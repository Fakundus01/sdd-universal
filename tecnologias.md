# tecnologias.md · Catálogo de tecnologías

**Versión:** 0.7 · 2026-08-17 · **Bloque:** `stack` · **Para agentes:** leer solo cuando la tarea sea elegir o justificar el stack (R12), o cuando el humano traiga tecnologías elegidas desde la web del catálogo.

> Este archivo dice **qué existe**, no qué usar. La recomendación por tarea la hace el agente con R12; las versiones se verifican contra la web al arrancar (R19), y por eso esta tabla no lleva números de versión: envejecerían mal y darían una falsa sensación de estar al día.

**120 tecnologías** en 13 categorías. `OS` = open source.

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

## Frameworks (49)

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
| **FastAPI** | Framework | Python | API/backend | ✓ |
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

## Bibliotecas (18)

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
| **Pydantic** | Biblioteca | Python | Validación de datos | ✓ |
| **PyTorch** | Biblioteca | Python / C++ | IA y Machine Learning | ✓ |
| **React** | Library | JavaScript/TypeScript | Frontend | ✓ |
| **Redux** | Biblioteca | JavaScript/TypeScript | Estado | ✓ |
| **Requests** | Biblioteca | Python | HTTP | ✓ |
| **Scikit-learn** | Biblioteca | Python | Machine Learning | ✓ |
| **Socket.IO** | Biblioteca | JavaScript | Tiempo real | ✓ |
| **SQLAlchemy** | Biblioteca | Python | ORM/database | ✓ |
| **TensorFlow** | Biblioteca | Python / C++ | IA y Machine Learning | ✓ |
| **Three.js** | Biblioteca | JavaScript | 3D/WebGL | ✓ |

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

## Testing (2)

| Tecnología | Tipo | Ecosistema | Uso principal | OS |
|---|---|---|---|---|
| **Jest** | Tool | JavaScript/TypeScript | Testing | ✓ |
| **Playwright** | Tool | JavaScript/TypeScript | Testing web | ✓ |

## Seguridad (1)

| Tecnología | Tipo | Ecosistema | Uso principal | OS |
|---|---|---|---|---|
| **OWASP ZAP** | Tool | — | Seguridad web | ✓ |

## IA - Modelos (3)

| Tecnología | Tipo | Ecosistema | Uso principal | OS |
|---|---|---|---|---|
| **GPT** | Modelo IA | — | LLM | — |
| **Claude** | Modelo IA | — | LLM/agentes | — |
| **Ollama** | Tool | — | LLMs locales | ✓ |

## Videojuegos (3)

| Tecnología | Tipo | Ecosistema | Uso principal | OS |
|---|---|---|---|---|
| **Godot · Game Engine** | Game Engine | GDScript/C++ | Videojuegos | ✓ |
| **Unity · Game Engine** | Game Engine | C# | Videojuegos | — |
| **Unreal Engine · Game Engine** | Game Engine | C++ | Videojuegos | — |

## Developer Tools (1)

| Tecnología | Tipo | Ecosistema | Uso principal | OS |
|---|---|---|---|---|
| **Puppeteer** | Tool | JavaScript/TypeScript | Automatización web | ✓ |

---

## Cómo se usa

1. **Desde la web:** en el combinador, el botón *Elegir tecnologías* abre el catálogo con filtros por categoría, ecosistema, tipo y open source. Lo que marques entra al prompt de arranque como bloque `TECNOLOGÍAS ELEGIDAS`.
2. **Desde el chat:** nombrá las tecnologías y el agente las cruza con esta tabla. Si pedís algo que no está, no pasa nada: es un punto de partida, no una restricción.
3. **Al elegir stack (R12):** elegir de esta lista **no reemplaza la justificación**. El agente tiene que decir por qué esa combinación sirve para *este* proyecto, y qué descartó. Una tecnología tildada en una web no es una decisión de arquitectura.
4. **Lo que el humano eligió, manda** salvo que sea técnicamente inviable — y en ese caso el agente lo dice antes de escribir código, no después (R25).

## Cómo crece

Igual que todo en este paquete (R20): una tecnología entra cuando alguien la usó en un proyecto real, con su categoría, tipo, ecosistema y uso principal. Un catálogo que lista todo lo que existe no ayuda a elegir nada.

## Historial

| Versión | Fecha | Cambio |
|---|---|---|
| 0.7 | 2026-08-17 | +19 tecnologías donde el catálogo era más flaco: bases de datos (SQLite, MongoDB, Redis, DuckDB, Supabase), runtimes (Bun, Deno), escritorio (Electron, Tauri), lenguajes (Elixir, Julia, Zig), front (Svelte, Astro), infra (Azure, Docker, GitHub Actions) e IA (Claude, Ollama). Total: 120. |
| 0.6 | 2026-08-15 | Primer catálogo: 101 tecnologías en 13 categorías, importadas del relevamiento propio. Integrado al combinador de la web con filtros y selección múltiple. |
