BLOQUE: playbook · ID: resend-smtp · CATEGORÍA: infra · NIVEL: novato+pro
TIEMPO: 15 min en modo prueba · 30–40 min con dominio propio (más la espera del DNS) · REQUISITOS: un proyecto de Supabase andando (playbook `supabase-auth`) · RESULTADO: los mails de confirmación y de recupero llegan de verdad, a cualquier casilla

# Mails que llegan: Resend como SMTP de Supabase

## El problema que resuelve

Supabase trae un mailer incluido para que puedas probar, y **solo para eso**: manda muy pocos correos por hora y sale desde un dominio compartido que los filtros de spam ya conocen. El síntoma típico es mudo — la persona se registra, no llega nada, y en pantalla no aparece ningún error. No es un bug de tu código: es el mailer haciendo lo que dice la letra chica.

Con SMTP propio, los mails salen desde tu dominio, con tu reputación, sin ese tope.

---

## Antes de empezar: la decisión del dominio

Es la única parte que puede costar plata, así que va derecho:

| | **Modo prueba** (sin dominio) | **Con dominio propio** |
|---|---|---|
| Remitente | `onboarding@resend.dev` | `hola@tudominio.com` |
| A quién le podés mandar | **solo a tu propia casilla**, la de tu cuenta de Resend | a cualquiera |
| Sirve para | verificar que todo el circuito funciona | que lo usen otras personas |
| Costo | USD 0 | ~USD 12–15/año el dominio |

> **[NOVATO]** Esto no es una limitación de Resend: es cómo funciona el mail. Para mandarle correo a desconocidos tenés que demostrar que controlás un dominio, o cualquiera podría mandar mails haciéndose pasar por otro. Por eso hay que tocar el DNS.
>
> **Un subdominio `.vercel.app` no sirve**: no es tuyo, no podés editar su DNS.

**Recomendación:** hacé primero la Parte A y la Parte C en modo prueba. Si el mail te llega a vos, el circuito funciona y recién ahí conviene comprar el dominio. Comprar primero y descubrir después que había un campo mal cargado es el orden caro.

---

## Parte A · Cuenta y clave (lo hacés vos)

> **Al agente:** estos pasos piden crear una cuenta y generar una clave secreta. **No los ejecutes vos**: mostráselos al humano. Y ojo: la clave de la Parte A **no va al repo** (R17).

1. Entrá a `resend.com` → **Sign up** (podés usar GitHub).
2. Menú lateral → **API Keys** → **Create API Key**.
   - **Name:** `supabase-smtp`
   - **Permission:** **Sending access** (no le des Full access: esta clave solo tiene que mandar mails)
3. Copiala **ahora**: se muestra una sola vez. Arranca con `re_`.

   ⚠️ **Esta clave sí es un secreto de verdad**, a diferencia de la `anon` de Supabase. Quien la tenga puede mandar mails en tu nombre. Va únicamente al panel de Supabase — **nunca** a un archivo del repo, ni a `web/`, ni a un chat.

---

## Parte B · El dominio (saltala si vas en modo prueba)

4. En Resend: **Domains** → **Add Domain** → escribí tu dominio (ej. `sddhub.com.ar`).
5. Resend te muestra 3 registros DNS para cargar donde compraste el dominio:
   - un **TXT** de SPF (dice qué servidores pueden mandar por vos)
   - dos **CNAME** o **TXT** de DKIM (la firma que prueba que el mail es tuyo)
   [NOVATO] "Cargar un registro DNS" es entrar al panel de donde compraste el dominio, buscar la sección DNS, y copiar y pegar lo que te da Resend en los campos Tipo / Nombre / Valor. No hay que saber nada más.
6. **Verify**. Puede tardar entre 5 minutos y unas horas: es la propagación del DNS, no un problema tuyo.
7. *(Recomendado)* Agregá también un registro **DMARC**: TXT en `_dmarc.tudominio.com` con valor `v=DMARC1; p=none; rua=mailto:vos@tudominio.com`. Mejora bastante la entrega y no rompe nada.

---

## Parte C · Enchufarlo a Supabase

8. En Supabase: **Project Settings** → **Authentication** → bajá hasta **SMTP Settings** → activá **Enable Custom SMTP**.
9. Cargá exactamente esto:

   | Campo | Valor |
   |---|---|
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` ← literal, no tu email |
   | Password | la clave `re_…` de la Parte A |
   | Sender email | `onboarding@resend.dev` (prueba) o `hola@tudominio.com` |
   | Sender name | el nombre que querés que vean, ej. `SDD Hub` |

   [NOVATO] El usuario es la palabra `resend`, tal cual. Es el error más común de este paso.

10. **Save**.
11. **Authentication** → **Rate Limits** → subí **Rate limit for sending emails**. Viene bajísimo porque asume el mailer compartido; con SMTP propio podés subirlo tranquilo (30–100 por hora alcanza y sobra).

    > Si te saltás este paso, cambiaste el mailer pero seguís con el tope viejo — y el síntoma es idéntico al problema original.

12. *(Recomendado)* **Authentication** → **Emails**: las plantillas vienen en inglés. Traducilas, que es lo primero que ve la persona de tu producto.

---

## Verificación

- En Resend, **Logs** muestra cada mail con su estado (`delivered`, `bounced`, `complained`).
- Registrate en tu sitio con una dirección real: el mail tiene que llegar en segundos, **a la bandeja de entrada y no a spam**.
- Tocá el link: tenés que volver al sitio **ya con la sesión hecha**, sin que te pida entrar de nuevo.
- Probá "olvidé mi contraseña": tiene que llegar, y el link tiene que abrir la pantalla de contraseña nueva.
- **Con dominio propio:** pedí un mail a una casilla que no sea la tuya (un Gmail de otra persona) y confirmá que llega. Es la única prueba que demuestra que saliste del modo prueba.

---

## Errores comunes

- **"Invalid login" o "535 authentication failed"** → el Username no es `resend`, o pegaste el email en vez de la clave.
- **El mail llega a spam** → falta DKIM/SPF (Parte B) o estás usando `onboarding@resend.dev`, que es compartido. Con dominio verificado y DMARC, mejora mucho.
- **"You can only send testing emails to your own email address"** → estás en modo prueba. Es lo esperado: hay que verificar un dominio (Parte B).
- **Sigue sin llegar nada y en Resend → Logs no aparece ningún intento** → Supabase no está usando tu SMTP: revisá que *Enable Custom SMTP* haya quedado guardado.
- **Llegan los primeros y después se cortan** → es el rate limit del paso 11, que quedó sin subir.
- **`redirect_to is not allowed`** → nada que ver con Resend: falta la URL en *Authentication → URL Configuration* (playbook `supabase-auth`, paso 9).

---

## Costos

Free tier de Resend: **3.000 mails por mes**, 100 por día. Para confirmaciones y recuperos de un proyecto chico, sobra por años. El plan pago arranca en USD 20/mes recién cuando pasás ese volumen. El dominio es aparte: ~USD 12–15 por año.

**Lo que puede sorprender:** el límite diario de 100 es más restrictivo que el mensual. Si alguna vez mandás un envío masivo (que no es este caso), lo tocás antes de darte cuenta.

## Secretos (R17)

- La clave `re_…` es **secreta**. Vive solo en el panel de Supabase. Si por algún motivo la necesitás en código, va a `.env` y `.env` va en `.gitignore` — nunca al repo.
- Si sospechás que se filtró: Resend → **API Keys** → borrala y creá otra. Toma dos minutos y no hay razón para dudarlo.
- Anotá en el `security.md` del proyecto qué servicio manda los mails y qué datos ve (Resend ve la dirección de destino y el contenido del correo).

## Nota para agentes

Las partes A y B **las ejecuta el humano**: crear cuenta, generar una clave secreta y tocar DNS. El agente muestra los pasos y espera confirmación de cada uno. Nunca pedir que le peguen la clave `re_…` en el chat: no la necesita para nada, se carga directo en el panel de Supabase. Con R23-NOVATO: un paso por mensaje.
