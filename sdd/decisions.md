# decisions.md · SDD Hub

**Versión:** 0.8 · ADRs con fecha y motivo. No se borran ni se editan: si una decisión cambia, se agrega otra que la reemplaza.

---

## ADR-001 · HTML estático sin build — 2026-08-15 · Vigente

**Decisión:** sin bundler, sin framework, sin `package.json`. Vercel sirve archivos.

**Por qué:** el proyecto predica menos ceremonia; necesitar `npm install` para mostrar la propia web sería una contradicción visible. Como efecto secundario desaparecen los builds rotos en el deploy y casi toda la superficie de R19.

**Costo aceptado:** el JS tiene que ser el que entienden los navegadores actuales, y no hay minificado. Con esta escala, irrelevante.

---

## ADR-002 · Deploy en la raíz del repo, no en `web/` — 2026-08-15 · Vigente

**Contexto:** con Root Directory `web` en Vercel, la web se ve linda pero **todos los `.md` quedan fuera del sitio** y las descargas dan 404. Con Root Directory vacío las descargas andan, pero la URL queda en `/web/`.

**Decisión:** deployar la raíz, y que `vercel.json` haga el redirect `/` → `/web/`.

**Por qué:** las descargas *son* el producto. Una URL un poco menos linda es un costo mucho menor que un botón que no funciona. El redirect recupera casi todo: quien entra al dominio pelado cae en el catálogo igual.

---

## ADR-003 · Supabase para cuentas, con degradación a localStorage — 2026-08-15 · Vigente

**Decisión:** magic link por email; sin Supabase configurado, todo funciona contra `localStorage`.

**Por qué:** C4 dice que la web tiene que servir sin cuenta. La degradación no es un fallback de emergencia: es el modo normal para quien entra por primera vez. Además permite publicar el repo con la config vacía y que le funcione a cualquiera que lo clone.

**Alternativas:** Firebase (más features de las que hacen falta, y el vendor lock-in es peor), auth propio (habría que tener servidor, y eso rompe ADR-001).

---

## ADR-004 · Los datos se generan, no se transcriben — 2026-08-15 · Vigente

**Decisión:** `tecnologias.js` sale de la planilla y `reglas.js` de parsear la §4 de `SDD-MASTER.md`. No se editan a mano.

**Por qué:** transcribir 101 tecnologías y 26 reglas crea una segunda fuente de verdad. No es *si* se van a desincronizar, es *cuándo*: la primera vez que se agregue una R27 al master y nadie se acuerde de tocar la web. Generarlos hace que la desincronización sea imposible, no improbable.

**Costo:** hay que volver a correr el generador cuando cambie la fuente. Barato comparado con una web que miente sobre sus propias reglas.

---

## ADR-005 · Tema oscuro por default, sin consultar el sistema — 2026-08-15 · Vigente

**Decisión:** `:root` es oscuro. El claro es opt-in con el toggle, y queda guardado.

**Por qué:** pedido explícito del owner. Se descartó `prefers-color-scheme` a propósito: con esa consulta, alguien con el sistema en claro vería la versión clara y nunca sabría que existe la oscura, que es la identidad visual del proyecto.

**Lo que hay que cuidar:** ninguna regla de color puede vivir fuera de los dos bloques de tokens, o el tema claro se rompe de a pedazos sin que nadie lo note.

---

## ADR-006 · Las reglas `fijas` no se pueden apagar desde la web — 2026-08-15 · Vigente

**Decisión:** el configurador muestra las 26 reglas, pero las 13 marcadas como `fija` aparecen con candado y sin toggle.

**Por qué:** que el master las marque como fijas y la web las dejara apagar sería incoherente, y encima peligroso: son las que sostienen el sistema (spec antes que código, secretos fuera del repo, no reescribir la spec en silencio).

**Por qué se muestran igual, en vez de esconderlas:** ver cuáles *no* son negociables enseña tanto como poder apagar las otras. Una lista de 13 opciones no explica el sistema; una de 26 con 13 candados, sí.

---

## ADR-008 · Mail + contraseña como camino principal — 2026-08-15 · **Reemplaza a ADR-003**

**Qué pasó.** Con magic link, el primer intento real de entrar no funcionó: el botón se quedaba en "Entrar". La causa más probable es la entrega del mail — el SMTP incluido en el free tier de Supabase manda muy pocos correos por hora y cae seguido en spam.

**El problema de fondo:** el magic link tiene un único punto de falla, y no está en nuestro código. Si el mail no llega, no hay forma de entrar. Ninguna. Con contraseña, el mail deja de estar en el camino crítico.

**Decisión:** registro y acceso con **mail + contraseña** (mínimo 8 caracteres) como camino principal. El magic link y el recupero de contraseña quedan como alternativas secundarias, claramente marcadas como "dependen de que llegue el mail".

**Consecuencia obligada:** para que esto sirva de verdad hay que apagar **Confirm email** en el proyecto. Con la confirmación activa, registrarse con contraseña *también* espera un mail, y volvemos al mismo punto muerto.

**El costo de apagarla, dicho de frente:** cualquiera puede registrarse con un mail que no es suyo. Se acepta porque en esta aplicación nadie ve datos de otro (RLS), no se manda ningún correo a terceros, y lo peor que puede pasar es que alguien ocupe una dirección ajena para guardar sus propias combinaciones. **Si algún día se guarda algo sensible o se manda mail a terceros, esta decisión se revisa antes que ninguna otra.**

**Lo que se descartó:** enchufar SMTP propio (Resend) ahora mismo. Es la solución correcta a largo plazo y resuelve confirmación y recupero de una, pero suma una cuenta y una clave más a configurar antes de que la feature funcione una sola vez. Queda anotado como deuda.

---

## ADR-003 · Magic link sin contraseñas — 2026-08-15 · **Reemplazada por ADR-008**

**Decisión original:** acceso solo por link al mail, sin contraseñas.

**Por qué parecía buena:** menos superficie de ataque, sin recupero que implementar, sin contraseñas que filtrar.

**Por qué no sobrevivió al contacto con la realidad:** el razonamiento era correcto sobre seguridad y equivocado sobre entrega. Optimizamos el riesgo de las contraseñas e ignoramos que el mail es infraestructura de terceros que puede simplemente no llegar — y que sin plan B, eso deja a la persona afuera. Queda registrada porque el error de razonamiento vale más que la decisión.

---

## ADR-007 · El `<dialog>` va con `margin:auto` explícito — 2026-08-15 · Vigente

**Contexto — un bug real.** El diálogo de tecnologías aparecía pegado arriba a la izquierda en vez de centrado.

**Causa raíz:** un `<dialog>` modal se centra porque el user-agent le da `margin:auto` junto con `inset:0`. El reset `*{box-sizing:border-box;margin:0;padding:0}` de la hoja pisa ese margin. Con `inset:0` y `margin:0`, el elemento se estira contra la esquina superior izquierda.

**Decisión:** `margin:auto` explícito en la regla del diálogo, y comentario en el CSS explicando por qué está ahí — sin eso, el próximo que "limpie" esa línea reintroduce el bug.

**Por qué queda como ADR:** el síntoma (una ventana descentrada) no sugiere en nada la causa (un reset de tres palabras escrito 400 líneas más arriba). Es exactamente el tipo de cosa que se vuelve a debuggear desde cero en seis meses.
