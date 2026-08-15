# security.md · SDD Hub

**Versión:** 0.8 · Aplica R17. Hay datos personales (el email de quien se registra), así que la sección 2 no es opcional.

## 1 · Claves: cuál es pública y cuál no

Esta es la confusión más peligrosa del proyecto, así que va explícita:

| Clave | ¿Va al repo? | Por qué |
|---|---|---|
| **Supabase `url`** | **Sí**, en `web/supabase-config.js` | Es el endpoint público del proyecto |
| **Supabase `anon`** | **Sí**, en el mismo archivo | Está diseñada para vivir en el navegador. Lo que protege los datos son las políticas RLS, **no** esconderla |
| **Supabase `service_role`** | **NUNCA** | Saltea RLS por completo. En el front equivale a publicar la base entera con permiso de escritura |
| Contraseña de la base | Nunca | No hace falta para nada de esto; va al gestor de contraseñas |

**Por qué `.env` está en `.gitignore` igual, si hoy no hay secretos:** porque el día que se agregue SMTP propio, un webhook o cualquier integración, el hábito ya tiene que estar. Un `.gitignore` que se agrega *después* del primer secreto llega tarde: el secreto ya quedó en el historial de git, y sacarlo de ahí es reescribir la historia del repo.

**Antes de cada commit** se revisa el diff buscando claves (R17). Con archivos de config que se editan a mano, es el único control que hay.

## 2 · Datos personales

| Pregunta | Respuesta |
|---|---|
| **Qué se guarda** | El email (lo pone Supabase Auth) y las combinaciones que arma la persona: tipo de proyecto, stack, nivel, perfil, playbooks y tecnologías elegidas |
| **Qué NO se guarda** | Nombre, IP, ubicación, historial de navegación, ningún dato de pago. No hay analytics de terceros ni píxeles |
| **De dónde sale** | Lo carga la propia persona al registrarse. No se compra, no se importa |
| **Para qué** | Para que encuentre sus combinaciones desde otro dispositivo. Ningún otro uso: no se mandan mails que no sean el magic link |
| **Cuánto se retiene** | Mientras exista la cuenta. Al borrarla, las combinaciones se van con ella (`on delete cascade` en el esquema) |
| **Con quién se comparte** | Con nadie |
| **Normativa** | Ley 25.326 (Argentina). Datos mínimos, cargados por el titular, finalidad evidente y declarada en el diálogo de registro |

**Sin cuenta no se guarda nada en ningún servidor**: todo queda en el `localStorage` del navegador, que la persona borra cuando quiera.

## 3 · Superficie de ataque

1. **RLS mal configurada.** Es *el* riesgo del proyecto: con la clave pública y sin políticas, cualquiera lee las tablas enteras. Mitigación: `supabase/schema.sql` crea las políticas en el mismo script que las tablas, y la verificación del playbook incluye la prueba de las dos cuentas. Toda tabla nueva arranca con RLS.
2. **Spam de magic links.** `POST /auth/v1/otp` es público. Supabase aplica rate limit propio; el free tier además tiene tope de mails por hora, que actúa de freno natural.
3. **Enumeración de cuentas.** El endpoint responde igual exista o no el email, así que no se puede averiguar quién está registrado.
4. **XSS.** Todo lo que entra al DOM desde datos pasa por `esc()`. Los únicos textos libres son los del propio usuario y solo los ve él. **Punto a vigilar:** si algún día un usuario puede compartir una combinación con otro, ese texto pasa a ser contenido de terceros y hay que revisar cada punto de inserción.
5. **Los iframes del demo.** Cargan archivos propios del mismo origen, sin entrada del usuario.
6. **Headers.** `vercel.json` fija `nosniff`, `X-Frame-Options: SAMEORIGIN` y `Referrer-Policy: strict-origin-when-cross-origin`.

## 4 · Lo que NO está cubierto

- **Sin CSP.** Sería la mejora más grande y es barata dado que no hay dependencias externas (C2). Debería entrar en el próximo ciclo de infra.
- **Sin borrado de cuenta desde la interfaz.** Hoy hay que pedirlo. Si el proyecto crece, deja de ser aceptable.
- **Sin registro de accesos.** No se sabe desde dónde ni cuándo entró cada quien.
