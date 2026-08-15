# SDD Universal · Spec-Driven Development para construir con agentes de IA

Un paquete abierto de gobernanza: **la especificación va antes que el código**, los archivos MD son la memoria del proyecto, y un archivo conductor rutea a agentes y subagentes para gastar la menor cantidad de tokens posible. Funciona con Claude, Codex/ChatGPT, Cursor, GitHub Copilot, Gemini y cualquier agente que lea archivos — **y también para personas sin experiencia en código** (modo NOVATO con "pensar por tres").

## Empezar en 2 minutos

1. **¿Sabés programar?** Descargá [`SDD-MASTER.md`](SDD-MASTER.md), pegalo en el primer mensaje a tu agente con el start-prompt de [`prompts/start-prompt.md`](prompts/start-prompt.md).
2. **¿No sabés programar?** Arrancá por [`GUIDE.md`](GUIDE.md) y usá el **combinador** de la [web del catálogo](web/index.html): elegís qué querés construir y te genera el prompt exacto.
3. **¿Agente sin archivos (solo chat)?** Pegá [`SDD-COMPACT.md`](SDD-COMPACT.md) y listo.

**¿Querés ver primero qué genera?** Mirá [`examples/turnos/sdd/`](examples/turnos/sdd/): un `sdd/` completo de un proyecto real, con sus 12 archivos.

## Qué hay acá

| Archivo/carpeta | Qué es |
|---|---|
| `SDD-MASTER.md` | El núcleo: 26 reglas con toggle (R01–R26), protocolo de lectura, prompts |
| `SDD-COMPACT.md` | Todo el sistema en ~45 líneas de palabras clave |
| `examples/` | **Un `sdd/` real y completo** de un proyecto chico — la mejor forma de entender qué genera el agente |
| `GUIDE.md` | Guía de uso para humanos (con la respuesta honesta a "¿es fácil?") |
| `scenarios.md` | Dónde funciona, dónde no, y cómo se adapta — el motor de crecimiento |
| `custom.md` | Tus overrides personales (el núcleo nunca se edita) |
| `teams.md` | Capa enterprise: roles, aprobaciones, ceremonias, subagentes por rol |
| `models.md` | Espejos multi-agente + tiers de modelo + ahorro de tokens |
| `blocks.md` | Cómo se combinan los bloques (BASE + TYPE + STACK + TECNOLOGÍAS + PLAYBOOKS) |
| `tecnologias.md` | Catálogo de 101 tecnologías con ecosistema y uso — elegibles desde la web |
| `playbooks/` | Recetas paso a paso (deploy, env, React+Vite, GitHub+Vercel…) con notas `[NOVATO]` |
| `prompts/` | Start, loop/HANDBACK, mantenimiento, migración desde otro chat |
| `web/` | El catálogo web (front puro, deployable en Vercel tal cual) |
| `exports/` | El master en Word y PDF para repartir |
| `skill/` | Skill instalable para Claude |

## Publicar tu propia copia

Seguí [`playbooks/publish-github-vercel.md`](playbooks/publish-github-vercel.md): repo público + web online en ~25 minutos.

## Cómo contribuir

Regla R20: nada entra "porque suena bien". Toda mejora nace de un caso real → agregá una fila a [`scenarios.md`](scenarios.md) con la situación, el problema y tu adaptación propuesta. Tus personalizaciones van en `custom.md`; el núcleo se versiona con semver y tu custom sobrevive a cada actualización.

## Estado

**v0.7** · 2026-08 · Ver historial en cada archivo. Licencia MIT. Hecho en Argentina 🇦🇷 con la misma metodología que distribuye.
