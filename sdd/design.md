# design.md · SDD Hub

**Versión:** 0.8 · **Última actualización:** 2026-08-15

## 1 · La decisión que ordena todo: sin build

No hay `package.json`, ni bundler, ni paso de compilación. Se abre `web/index.html` y funciona.

**Por qué:** un paquete cuya tesis es "menos ceremonia, más claridad" no puede necesitar `npm install` para mostrar su propia página. Además elimina de un saque toda una familia de problemas: vulnerabilidades de dependencias (R19), builds que se rompen en el deploy, y la brecha entre "anda en mi máquina" y "anda en Vercel".

**Lo que cuesta:** sin transpilar, el JS tiene que ser el que entienden los navegadores de hoy — se usa optional chaining, `??`, módulos por convención y nada más exótico. Y sin bundler, cada archivo es un `<script>` más: por eso son pocos y con responsabilidad clara.

## 2 · Archivos y responsabilidades

```
web/
├── base.css            tokens de color, reset, barra superior y pie (compartido)
├── tema.js             claro/oscuro; oscuro por default; avisa a quien se enganche
├── index.html          el catálogo, el combinador y los diálogos
├── guia.html           la guía navegable
├── demo.html           la comparación con/sin SDD
├── demo-sin-sdd.html   widget de reservas construido sin spec
├── demo-con-sdd.html   el mismo widget, con los criterios de la spec
├── tecnologias.js      DATO generado — 101 tecnologías
├── reglas.js           DATO generado — las 26 reglas
├── reglas-ui.js        configurador de reglas → custom.md
├── sesion.js           auth y persistencia (Supabase o localStorage)
└── supabase-config.js  las dos claves públicas; vacío por default
```

Regla que sostiene el orden: **los archivos `.js` de datos no se editan a mano.** `tecnologias.js` sale de la planilla y `reglas.js` de parsear la §4 del master. Editarlos a mano crea dos fuentes de verdad que se van a desincronizar (ADR-004).

## 3 · Tema

Un solo lugar decide el color: `base.css` define los tokens en `:root` (oscuro) y los pisa en `:root[data-theme="light"]`. Ninguna regla de color vive fuera de esos dos bloques.

`tema.js` solo cambia el atributo y guarda la elección. **No consulta `prefers-color-scheme`**: el default es oscuro y punto (ADR-005). Quien quiera engancharse — por ejemplo para sincronizar la preferencia con la cuenta — usa `Tema.alCambiar(fn)`, así `tema.js` no necesita saber que Supabase existe.

## 4 · Sesión con degradación

`sesion.js` expone la misma interfaz esté o no configurado Supabase:

```
listar() · guardarCombinacion() · borrarCombinacion() · usuario()
```

Sin configurar → `localStorage`. Configurado y con sesión → PostgREST. **La interfaz no cambia**, así que el resto de la página nunca pregunta "¿hay cuenta?" para decidir cómo guardar. Es lo que hace que C4 (funcionar sin cuenta) no llene el código de condicionales.

Habla con las APIs HTTP de Supabase directo, sin el SDK: son cuatro endpoints y traer una librería entera por eso contradice C2.

Al entrar por primera vez, `migrarLocales()` sube lo que había en el navegador. Sin eso, registrarse te haría perder lo que venías armando — el peor momento posible para perder algo.

## 5 · Diálogos

Tres: tecnologías, reglas y login. Todos `<dialog>` nativo con `showModal()`, que ya trae foco atrapado, cierre con Escape y `::backdrop`.

**Una trampa que nos comimos:** el reset `*{margin:0}` pisa el `margin:auto` del user-agent, que es lo que centra un `<dialog>` modal. Con `inset:0` y sin margin, queda clavado arriba a la izquierda. Está documentado en ADR-007 porque el síntoma no sugiere para nada la causa.

El de tecnologías además se arrastra desde el encabezado, con tope para que no se pueda sacar de la pantalla. En celular no se arrastra y pasa a pantalla completa: mover ventanas con el dedo en 375 px no le sirve a nadie.

## 6 · Paginación

Un solo `pager(total, pagina, porPagina, destino)` devuelve el HTML y un listener delegado en `document` resuelve los clics según `data-go`. Lo usan el catálogo (12) y las tecnologías (20).

**Dónde a propósito NO se pagina:** el configurador de reglas. Son 26 ítems y es una pantalla de configuración, no de exploración — paginar ahí obliga a ir y volver para ver qué apagaste. En su lugar hay un filtro "solo las que se pueden apagar", que es lo que realmente se necesita.

## 7 · Los dos demos

Comparten estilo visual a propósito: si el "sin SDD" se viera feo, la comparación sería tramposa. La diferencia está solo en el comportamiento ante los casos borde.

El código que muestra `demo.html` se **lee del archivo en vivo** entre los marcadores `/* <<<CODIGO */`. Nunca puede quedar desactualizado respecto de lo que está corriendo arriba, que es exactamente el tipo de mentira que este proyecto no se puede permitir.

## 8 · Deuda de diseño consciente

- `index.html` pasó las 300 líneas de JS que pide R05. Se partió lo que tenía identidad propia (`sesion`, `reglas-ui`, `tema`); lo que queda es el pegamento del catálogo. Anotado en `status.md`.
- No hay tests automatizados: se verifica en navegador (R07, front). Ver `testing.md`.
