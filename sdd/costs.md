# costs.md · SDD Hub

**Versión:** 0.8 · **Constraint (C2 de la spec): USD 0/mes.** R14: si algo pasa a facturar, se avisa antes.

## Hoy

| Qué | Servicio | Plan | Costo | Techo del free tier | Uso real |
|---|---|---|---|---|---|
| Hosting | Vercel | Hobby | USD 0 | 100 GB de banda/mes | La página pesa ~180 KB con la imagen OG. Harían falta ~550.000 visitas/mes para llegar al techo |
| Build | — | — | USD 0 | — | No hay build (ADR-001): Vercel solo copia archivos |
| Cuentas y datos | Supabase | Free | USD 0 | 50.000 usuarios activos/mes · 500 MB | Una combinación guardada son ~200 bytes |
| Dominio | — | — | USD 0 | subdominio `.vercel.app` | — |
| **Total** | | | **USD 0/mes** | | |

## Qué lo rompería

| Escenario | Costo | ¿Probable? |
|---|---|---|
| El sitio se vuelve viral y pasa 100 GB/mes | Vercel Pro, USD 20/mes | No con este público |
| Se quiere dominio propio | ~USD 15/año | Es lo primero que va a pasar, y es lo más barato |
| Hacen falta más de 3.000 mails/mes de magic link | SMTP propio (Resend), free hasta 3.000/mes; después ~USD 20/mes | Requeriría cientos de registros mensuales |
| Se agrega la v2 de `blocks.md` (un modelo fusionando bloques) | Por uso, y sin techo natural | **Este es el peligroso** — ver abajo |

**El único ítem que puede romper C2 de verdad** es meter un modelo de IA en la web. Un endpoint público que llama a una API paga es una factura sin límite superior si alguien la abusa. Por eso está explícitamente fuera de alcance en la spec, y si algún día entra necesita, antes que código: límite de gasto, rate limit por IP y una alerta. La decisión iría a un ADR propio.

## La trampa del free tier de Supabase

Un proyecto free **se pausa tras 7 días sin actividad**. Se despierta solo cuando alguien entra, pero esa primera carga tarda unos segundos. Para este caso es aceptable: quien entra al catálogo no está esperando una respuesta instantánea, y la web funciona igual sin sesión mientras la base despierta.

Si alguna vez deja de ser aceptable, son USD 25/mes de Supabase Pro. Conviene saberlo antes de prometerle a alguien que el login es instantáneo.

## Alertas

Vercel y Supabase avisan por email al acercarse a los límites. Están activadas con el mail del owner. **Pendiente:** hoy llegan a una sola persona; si el proyecto suma gente, la alerta tiene que ir a más de una casilla — una alerta que llega a alguien de vacaciones no es una alerta.
