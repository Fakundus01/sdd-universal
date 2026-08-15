# costs.md · Turnos

**Versión:** 0.3.0 · **Constraint del proyecto (C2): USD 0/mes.** Si algo pasa a facturar, se avisa antes (R14).

## Hoy

| Qué | Servicio | Plan | Costo | Techo del free tier | Uso estimado |
|---|---|---|---|---|---|
| Front | Vercel | Hobby | USD 0 | 100 GB de banda/mes | < 1 GB |
| API | Vercel Functions | Hobby | USD 0 | 100 GB-hrs | ~35 turnos/semana: irrelevante |
| Base | Neon | Free | USD 0 | 0.5 GB · 190 hs de cómputo/mes | ~2 MB de datos |
| Emails | Resend | Free | USD 0 | 3.000/mes | ~8/mes (solo magic links) |
| Dominio | — | — | USD 0 | subdominio `.vercel.app` | — |
| **Total** | | | **USD 0/mes** | | |

## A escala (si la peluquería crece 10×)

350 turnos/semana, 3 sucursales:

| Qué | Costo | Cuándo se dispara |
|---|---|---|
| Vercel Pro | USD 20/mes | Solo si hace falta analytics o más de un colaborador. El tráfico no lo dispara |
| Neon Launch | USD 19/mes | Al pasar 0.5 GB o quedarse sin horas de cómputo. Con 350 turnos/semana, faltan **años** |
| Dominio propio | ~USD 15/año | Cuando la dueña quiera `nadiapeluqueria.com.ar` en el flyer |
| **Total realista** | **~USD 1,25/mes** | Solo el dominio. El resto sigue entrando en free tier |

Conclusión honesta: este proyecto **no tiene un problema de costos de infraestructura** ni lo va a tener. Escribirlo es tan útil como el análisis mismo — evita optimizaciones prematuras "para cuando escale".

## Lo que sí costaría plata

**WhatsApp Business API** (ADR-005, descartado en v1): ~USD 0,05 por conversación iniciada por el negocio. Con 35 recordatorios/semana ≈ USD 7/mes, más la verificación del negocio. **Es el único ítem que puede romper C2**, y por eso está fuera de alcance hasta tener el dato de O3 que lo justifique.

Alternativa gratis si O3 muestra ausencias altas: un recordatorio por email el día anterior (Resend ya está y sobra cuota). Peor tasa de apertura, costo cero.

## Alertas

Neon y Vercel avisan por email al 80% del free tier. Están activadas con el email de la dueña **y** el del desarrollador: una alerta que llega a una sola persona que está de vacaciones no es una alerta.
