# security.md · Turnos

**Versión:** 0.3.0 · Aplica R17. Este proyecto guarda **datos personales de terceros** (nombre y teléfono de las clientas), así que la sección 2 no es opcional.

## 1 · Secretos

| Variable | Dónde vive | Quién la conoce |
|---|---|---|
| `DATABASE_URL` | `.env` local · Environment Variables de Vercel | El desarrollador |
| `RESEND_API_KEY` | ídem | El desarrollador |
| `COOKIE_SECRET` | ídem, 32 bytes aleatorios, distinto por ambiente | Nadie: se genera y se pega |

`.env` está en `.gitignore` desde el commit 1. Hay un `.env.example` con las claves y **sin** los valores. Antes de cada commit se revisa el diff buscando secretos (R17). Ver playbook `env-setup`.

## 2 · Datos personales de las clientas

Lo que exige R17 cuando el producto guarda datos de terceros:

| Pregunta | Respuesta |
|---|---|
| **Qué se guarda** | Nombre (como lo escribe la clienta) y teléfono. Nada más |
| **Qué NO se guarda** | Email, DNI, dirección, fecha de nacimiento, foto. Ninguno hace falta para reservar un turno |
| **De dónde sale** | Lo carga la propia clienta al reservar. No se compra, no se importa, no se scrapea |
| **Para qué** | Identificar el turno en la agenda y poder llamar si hay que reprogramar. Ningún otro uso |
| **Cuánto se retiene** | Los turnos con más de 12 meses se anonimizan: se borran nombre y teléfono, se conservan fecha, servicio y estado (que es lo que alimenta O3). Job mensual — **pendiente, ver D4** |
| **Con quién se comparte** | Con nadie. No hay analytics de terceros, ni píxeles, ni exportación |
| **Normativa** | Ley 25.326 de Protección de Datos Personales (Argentina). Al ser datos mínimos, cargados por la titular y para una finalidad evidente, el riesgo es bajo — pero la finalidad está declarada acá y en el pie del formulario |

> **D4 · Deuda:** el job de anonimizado a 12 meses todavía no existe. No es urgente (el proyecto tiene semanas), pero si se olvida deja de cumplirse lo que este archivo promete. Anotado en `status.md` con fecha de revisión.

## 3 · Superficie de ataque

Es una web pública que escribe en una base. Los riesgos reales, en orden:

1. **Spam de reservas falsas.** El endpoint público de reserva no tiene captcha ni límite. Un script podría llenar la agenda de turnos inventados. *Mitigación actual:* rate limit de 5 reservas por IP por hora. *Mitigación real si pasa:* confirmación por SMS, que cuesta plata — se evalúa recién si ocurre.
2. **Enumeración de admins.** `POST /auth/magic-link` devuelve `202` siempre, exista el email o no. No se puede averiguar quién es admin probando emails.
3. **Robo del magic link.** Vale 15 minutos, un solo uso, y en la base se guarda el hash (SHA-256), no el token. Con acceso de lectura a la base no se puede entrar al panel.
4. **SQL injection.** Consultas parametrizadas en toda la capa `repos/`, sin excepción. No se concatena SQL en ningún lado.
5. **Cookies.** `httpOnly`, `secure`, `sameSite=lax`. No hay token en `localStorage`.

## 4 · Lo que NO está cubierto (dicho de frente)

- No hay auditoría de accesos al panel: si la dueña dejara su sesión abierta en un celular ajeno, no queda registro de qué se tocó.
- No hay backup propio: se depende de los backups de Neon (7 días en free tier). Para 35 turnos por semana es aceptable; para una agenda de 3 sucursales, no.
