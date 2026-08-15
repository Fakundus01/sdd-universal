BLOQUE: playbook · ID: supabase-auth · CATEGORÍA: infra · NIVEL: novato+pro
TIEMPO: 25–35 min la primera vez · REQUISITOS: cuenta de GitHub y un sitio ya deployado · RESULTADO: inicio de sesión por email (sin contraseñas) y datos por usuario guardados en la nube, en free tier

# Inicio de sesión con Supabase (magic link, sin contraseñas)

Este playbook agrega **cuentas de usuario** a un sitio estático sin convertirlo en una app con servidor. Supabase pone la base de datos y la autenticación; el sitio le habla directo por HTTPS.

**Por qué magic link y no usuario+contraseña:** una contraseña te obliga a manejar recupero, hasheo, fuerza mínima y filtraciones. Un link al email te da lo mismo con menos superficie de ataque y menos código. Si el atacante ya tiene el email de la persona, la contraseña tampoco lo frenaba.

---

## Parte A · Crear el proyecto (lo hacés vos, una sola vez)

> **Al agente:** estos pasos piden crear una cuenta y manejar claves. **No los ejecutes vos**: mostráselos al humano y esperá a que te pase los dos valores públicos del paso 5.

1. Entrá a `supabase.com` → **Start your project** → **Continue with GitHub** → autorizá.
2. **New project**. Completá:
   - **Name:** el nombre de tu proyecto (ej. `sdd-hub`)
   - **Database Password:** generala con el botón y **guardala en tu gestor de contraseñas**. No la vas a necesitar para esto, pero perderla es un dolor de cabeza más adelante.
   - **Region:** la más cercana a tus usuarios (`South America (São Paulo)` para Argentina).
   - **Plan:** Free.
3. Esperá 2–3 minutos a que termine de aprovisionar.
4. Menú lateral → **Project Settings** → **API**.
5. Copiá estos **dos** valores:
   - **Project URL** → algo como `https://abcdefgh.supabase.co`
   - **anon public** (bajo *Project API keys*) → una cadena larga que arranca con `eyJ…`

   [NOVATO] Estos dos valores **son públicos a propósito**: van dentro del HTML y cualquiera puede verlos. No son un secreto. Lo que protege tus datos son las políticas RLS del paso siguiente, no esconder la clave.

   ⚠️ La que **nunca** sale de Supabase es la clave **`service_role`**. Si la pegás en el front, cualquiera puede leer y borrar toda tu base. Es la única de esta pantalla que es un secreto real.

---

## Parte B · Crear las tablas y las políticas

6. Menú lateral → **SQL Editor** → **New query**. Pegá el contenido de [`supabase/schema.sql`](../supabase/schema.sql) y dale **Run**.
7. Verificá en **Table Editor** que existan `perfiles` y `combinaciones`, y que las dos digan **RLS enabled**.

   [NOVATO] RLS (*Row Level Security*) es la regla que hace que cada persona solo vea sus propias filas. Sin RLS, cualquiera con la clave pública podría leer los datos de todos. Es el paso que **no** se puede saltear.

---

## Parte C · Configurar el email y las URLs de retorno

8. **Authentication** → **Providers** → **Email**. Confirmá que esté habilitado, y decidí una de las dos:

   | | **Confirm email = OFF** | **Confirm email = ON** |
   |---|---|---|
   | Al registrarse | entra en el acto, sin ningún mail | espera un mail de confirmación |
   | Requisito | ninguno | que los mails **realmente lleguen** |
   | Riesgo | alguien se registra con una dirección que no es suya | ninguno |

   > ⚠️ **La trampa más común de este playbook.** El mailer incluido en el free tier manda muy pocos correos por hora y cae seguido en spam. Si dejás **Confirm email = ON** sin configurar SMTP propio (paso 10), lo más probable es que nadie pueda entrar nunca — ni con magic link ni con contraseña — y el síntoma es mudo: el botón se queda como estaba y no hay error en pantalla.
   >
   > **Recomendación para arrancar:** apagalo, probá que todo el circuito funcione, y volvé a prenderlo cuando tengas SMTP propio. Apagarlo es aceptable solo si tu app no manda correo a terceros y nadie ve datos de otro — si guardás algo sensible, configurá SMTP primero.
9. **Authentication** → **URL Configuration**:
   - **Site URL:** la URL de tu sitio en producción (ej. `https://tu-proyecto.vercel.app`)
   - **Redirect URLs:** agregá una por línea:
     ```
     https://tu-proyecto.vercel.app/web/
     http://localhost:4321/web/
     ```
   Sin esto, el link del email rebota con `redirect_to is not allowed`.
10. *(Opcional pero recomendado)* **Authentication** → **Emails**: traducí las plantillas al español. El mail que llega dice "Magic Link" en inglés hasta que lo cambies.

---

## Parte D · Enchufarlo al sitio

11. Abrí `web/supabase-config.js` y pegá los dos valores del paso 5:
    ```js
    const SUPABASE = {
      url:  "https://abcdefgh.supabase.co",
      key:  "eyJ..."
    };
    ```
12. Commiteá y pusheá. Vercel redeploya solo.

**Mientras ese archivo esté vacío, el sitio funciona igual**: el botón de sesión no aparece y todo se guarda en el navegador (localStorage). Es una degradación a propósito — nadie se queda sin usar la página porque falte configurar Supabase.

---

## Verificación

- Con el archivo vacío: la página abre normal y **no** se ve el botón "Entrar".
- Con los valores puestos: aparece "Entrar", pedís el link, te llega el mail, hacés clic y volvés logueado.
- Elegís tecnologías → **Guardar combinación** → recargás → siguen ahí.
- Abrís el sitio en el celular con la misma cuenta → aparecen las combinaciones guardadas en la compu.
- **La prueba que importa (RLS):** creá una segunda cuenta con otro email y confirmá que **no** ve las combinaciones de la primera. Si las ve, las políticas del paso 6 no se aplicaron: volvé a correr el SQL.

---

## Errores comunes

- **`redirect_to is not allowed`** → falta la URL exacta en *Redirect URLs* (paso 9). Tiene que coincidir carácter por carácter, barra final incluida.
- **El mail no llega y no hay ningún error en pantalla** → es el problema número uno, y no es tu código. El SMTP gratis de Supabase tiene un límite muy bajo por hora y cae en spam. Solución rápida: apagá *Confirm email* (paso 8) y usá mail + contraseña. Solución de fondo: enchufá Resend o similar en *Authentication → SMTP Settings*.
- **"Email not confirmed" al entrar con contraseña** → la cuenta se creó con *Confirm email* en ON y nunca se confirmó. Apagá la opción y volvé a registrarte, o confirmá el usuario a mano desde *Authentication → Users*.
- **`new row violates row-level security policy`** → estás insertando sin sesión activa, o el `usuario_id` no coincide con el de la sesión. Es RLS haciendo bien su trabajo.
- **Entra pero al recargar se desloguea** → el token está en el hash de la URL y no se está guardando. Revisá que la página llame a la función que lo procesa al cargar.
- **Funciona en local y no en producción** → casi siempre es *Site URL* apuntando a `localhost`.

## Costos

Free tier: 50.000 usuarios activos por mes, 500 MB de base y 5 GB de transferencia. Para un catálogo con guardado de preferencias, sobra por años. **El detalle que sí importa:** un proyecto free se **pausa** tras 7 días sin actividad — se despierta solo al entrar, pero la primera carga tarda unos segundos. Si el sitio queda dormido y no querés esa demora, el plan Pro son USD 25/mes. Ver `costs.md` del proyecto.

## Seguridad (R17)

- La clave `anon` es pública y va al repo. La `service_role` **nunca**: si alguna vez la necesitás, va en variables de entorno del servidor y jamás en el front.
- Toda tabla nueva arranca con `RLS enabled` y sus políticas. Una tabla sin RLS con la clave pública expuesta es una base de datos abierta a internet.
- El `.env` sigue estando en `.gitignore` aunque acá no haga falta: la costumbre se mantiene, porque el día que agregues algo con SMTP o webhooks lo vas a necesitar.
- En `security.md` del proyecto anotá qué se guarda de cada usuario (acá: email y sus combinaciones), por cuánto tiempo y cómo se borra si lo pide.

## Nota para agentes

Las partes A a C **las ejecuta el humano**: implican crear una cuenta y manejar credenciales. El agente muestra los pasos, espera confirmación de cada uno, y solo interviene en la parte D. Con R23-NOVATO: un paso por mensaje, esperando que el humano confirme que ve lo mismo en pantalla. Si un paso falla dos veces, frenar y mostrar el error (R24).
