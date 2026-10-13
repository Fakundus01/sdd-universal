---
id: playbooks
rutas: [playbooks/**]
hash: 5d7e854c30e332bac24cccebe6b795c0299a9a11cb73127dd81b75607ddafc3f
---

# playbooks

Recetas paso a paso que el agente sigue al pie de la letra en vez de re-descubrirlas (R24): ahorran
tokens y errores. Formato fijo en `_template.md` (bloque con ID, categoría, tiempo, requisitos,
resultado, pasos con anotaciones `[NOVATO]`, y verificación observable).

- `catalog.md` — qué playbook corresponde a qué situación; el combinador de la web los ofrece según
  las tecnologías elegidas.
- Infra/deploy: `create-react-vite.md`, `deploy-vercel.md`, `publish-github-vercel.md`, `env-setup.md`,
  `git-basico.md`, `go-live.md`.
- Datos/servicios: `supabase-auth.md`, `consumir-api-externa.md`, `resend-smtp.md`.
- Producto/herramientas: `ia-en-el-producto.md` (OWASP LLM, RAG, agentes que actúan), `obsidian-cerebro.md`
  (el repo como vault, el Cerebro entre proyectos, `graph/` para que no se desfase).

Cada playbook se copia entero a `sdd/playbooks/<nombre>.md` del proyecto que lo elige (R24: no se
resume ni se parafrasea al viajar).
