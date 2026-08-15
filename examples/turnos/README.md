# Turnos — ejemplo del SDD Universal

Web de turnos para una peluquería de barrio. **Este proyecto es un ejemplo didáctico**: lo que se muestra es la carpeta [`sdd/`](sdd/), no el código de la app (que no está en el repo).

Sirve para responder, mirando y no leyendo, la pregunta *"¿qué me va a generar exactamente el agente?"*.

- **Modo:** FULL · **Perfil:** ESTRICTO · **Variante:** WEB · **Nivel:** PRO
- **Equipo:** 1 persona → `contracts.md`, `features.md` y `changelog.md` van planos, sin sufijo de usuario
- **Versión:** 0.3.0 — tres ciclos cerrados
- **Stack:** TypeScript full-stack (React + Vite / Fastify) · Postgres en Neon · deploy en Vercel

## Por dónde empezar

Está todo en [`../README.md`](../README.md), con el recorrido sugerido de 5 minutos. El atajo, si vas a leer un solo archivo: [`sdd/decisions.md`](sdd/decisions.md), **ADR-004** — es un caso real de R25 (spec-drift), donde la spec aprobada resultó estar mal a mitad de la implementación y quedó registrado en vez de arreglarse en silencio.

## Contenido de `sdd/`

| Archivo | |
|---|---|
| [`spec.md`](sdd/spec.md) | Qué se hace, qué NO, y cómo se verifica |
| [`design.md`](sdd/design.md) | Capas, modelo de datos y la decisión que sostiene todo |
| [`diagram.md`](sdd/diagram.md) | Arquitectura, flujo de reserva y estados (Mermaid) |
| [`contracts.md`](sdd/contracts.md) | La API. Si una ruta no está acá, no existe |
| [`features.md`](sdd/features.md) | Las 7 features en lenguaje funcional |
| [`testing.md`](sdd/testing.md) | Qué se testea, qué no, y por qué |
| [`costs.md`](sdd/costs.md) | USD 0/mes hoy y a escala, con el único ítem que podría romperlo |
| [`security.md`](sdd/security.md) | Secretos y datos personales de terceros (R17) |
| [`decisions.md`](sdd/decisions.md) | 5 ADRs, uno de ellos revisado |
| [`status.md`](sdd/status.md) | 66% real, con 4 deudas fechadas |
| [`changelog.md`](sdd/changelog.md) | 3 versiones semver |
| [`glossary.md`](sdd/glossary.md) | Cuando la dueña y el código no hablan igual |
