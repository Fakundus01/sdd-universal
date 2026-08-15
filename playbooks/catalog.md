# catalog.md · Catálogo de playbooks

**Versión:** 0.4 · 2026-08-15 · Estados: `✓ disponible` · `⏳ pendiente` · `🧪 en desarrollo`. Los pendientes se van escribiendo a demanda (R24: si un agente resuelve una tarea repetible sin playbook, propone crearlo).

| ID | Playbook | Categoría | Nivel | Estado |
|---|---|---|---|---|
| deploy-vercel | Deploy de un front en Vercel | infra | novato+pro | ✓ |
| env-setup | .env local/dev/prod + entornos virtuales + credenciales | código | novato+pro | ✓ |
| create-react-vite | Crear un proyecto React con Vite (npm) | código | novato+pro | ✓ |
| publish-github-vercel | Publicar este mismo sitio SDD en GitHub + Vercel | infra | novato+pro | ✓ |
| supabase-auth | Inicio de sesión con Supabase (mail + contraseña) + RLS y datos por usuario | infra | novato+pro | ✓ |
| resend-smtp | Que los mails de confirmación y recupero lleguen de verdad (Resend como SMTP) | infra | novato+pro | ✓ |
| git-basico | Git desde cero: init, add, commit, push, ramas | herramientas | novato | ⏳ |
| pipelines-ci | CI/CD con GitHub Actions: tests + deploy automático + gate de spec (si el código diverge de la spec, el build falla) | infra | pro | ⏳ |
| azure-fundamentos | Azure a fondo: Resource Groups, Storage, DNS, Policies, control de costos | infra | pro | ⏳ |
| aws-fundamentos | AWS: IAM, S3, EC2/Lambda, costos y free tier | infra | pro | ⏳ |
| gcp-fundamentos | Google Cloud: proyectos, Cloud Run, costos | infra | pro | ⏳ |
| sql-primera-db | Tu primera base SQL: modelado, Postgres local o Supabase | datos | novato+pro | ⏳ |
| mongodb-atlas | MongoDB y Atlas: cuándo conviene NoSQL, primer cluster | datos | novato+pro | ⏳ |
| postman-y-alternativas | Postman (y open source: Bruno, Hoppscotch): probar APIs | herramientas | novato+pro | ⏳ |
| crear-tu-api | Crear tu propia API REST: rutas, validación, documentación | código | pro | ⏳ |
| consumir-apis | Consumir APIs de terceros: dónde encontrarlas (catálogos públicos), costos, límites, keys | código | novato+pro | ⏳ |
| docker-basico | Docker: tu app en un contenedor | infra | pro | ⏳ |

**Regla de calidad:** todo playbook usa `_template.md`, tiene verificación observable y errores comunes. Los de infraestructura incluyen SIEMPRE una sección de costos (qué es gratis, qué factura, cómo poner alertas de gasto).
