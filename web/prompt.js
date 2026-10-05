/* El prompt de arranque del combinador, como función pura.
 *
 * combinador.js junta lo que eligió la persona (campos, tecnologías y el
 * estado del configurador de reglas) y llama a Prompt.armar. Acá no se toca
 * el DOM: por eso se puede testear sin navegador (web/tests/combinador.test.mjs).
 *
 * Opciones de armar():
 *   tipo {name, extra} · stack (texto del bloque STACK) · nivel · perfil
 *   brownfield · playbooks [] · tecnologias [] (nombres) · catalogo (TECH)
 *   custom (hay custom.md) · apagadas ["R01", …] · ia · lite */
const Prompt = (() => {
  const PB_IA = "ia-en-el-producto";
  // Los tipos que ya dicen «Modo LITE» en su bloque (catalogo.js).
  const TIPOS_LITE = new Set(["calc", "guia", "proceso"]);

  /* Con IA en el producto, el playbook va siempre: es el que dice cómo se
     hace lo que N4 pide. Sin repetirlo si ya estaba tildado. */
  const playbooks = (elegidos, ia) =>
    ia && !elegidos.includes(PB_IA) ? [...elegidos, PB_IA] : [...elegidos];

  /* CONFIANZA es R01=OFF (master §4): las dos formas de apagarla cuentan. */
  const r01Apagada = ({apagadas = [], perfil}) => perfil === "CONFIANZA" || apagadas.includes("R01");

  /* Un modo elegido a mano en el configurador manda; si quedó en FULL (el
     default), los tipos chicos van en LITE como ya dicen. */
  const esLite = ({modo, tipo}) => modo === "LITE" || (modo === "FULL" && TIPOS_LITE.has(tipo));

  /* Una tecnología que viene de afuera (el link compartido, una combinación
     guardada, la base) es texto ajeno que va a un prompt (R26): una sola
     línea, sin caracteres de control y con el mismo tope que el buscador. */
  const TOPE_TECNOLOGIA = 60;
  const limpiarTecnologia = n => String(n ?? "")
    .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g, " ")
    .replace(/\s+/g, " ").trim().slice(0, TOPE_TECNOLOGIA).trim();

  /* Lo que no está en el catálogo no se tira: se separa y se avisa. */
  function separarTecnologias(nombres, catalogo){
    const conocidas = [], fuera = [];
    for (const crudo of nombres){
      const n = limpiarTecnologia(crudo);
      if (!n) continue;
      const t = catalogo.find(x => x.n.toLowerCase() === n.toLowerCase());
      t ? conocidas.push(t) : fuera.push(n);
    }
    return {conocidas, fuera};
  }

  function bloqueTecnologias(nombres, catalogo){
    if (!nombres.length) return "";
    const {conocidas, fuera} = separarTecnologias(nombres, catalogo);
    const filas = conocidas.map(t =>
      `- ${t.n}${t.e ? ` (${t.e})` : ""}${t.u ? ` — ${t.u}` : ""}${t.a ? `\n  Lección de proyectos reales: ${t.a}` : ""}`
    ).join("\n");
    const ajenas = fuera.length ? `
PEDIDAS QUE NO ESTÁN EN EL CATÁLOGO (no las tires ni las cambies en silencio):
${fuera.map(n => `- ${n}`).join("\n")}
Para cada una: confirmá que existe y qué es, si encaja con el resto, y avisame si
conviene otra. Si la terminamos usando, proponé sumarla a tecnologias.md (R20).
` : "";
    return `
TECNOLOGÍAS ELEGIDAS (las saqué del catálogo, no son una decisión de arquitectura):
${filas || "- (ninguna del catálogo)"}
${ajenas}
Antes de aceptarlas: decime si esta combinación tiene sentido para este proyecto (R12),
qué falta, qué sobra y qué chocaría entre sí. Si algo no conviene, proponé el reemplazo
con el motivo — prefiero cambiar de idea ahora y no a mitad del código (R25). Verificá
también las versiones actuales contra la web antes de fijarlas (R19).
`;
  }

  function bloqueIA({ia, apagadas = []}){
    if (!ia) return "";
    const r12 = apagadas.includes("R12")
      ? "R12 está apagada: el modelo lo elijo yo, pero decime el costo por pedido del que elija."
      : "Recomendame el modelo por tarea (R12): clasificar o resumir → tier económico; razonar sobre\n" +
        "el caso o escribir la respuesta → el tier que alcance, no el más caro. Con los IDs vigentes\n" +
        "verificados en la doc del proveedor (R19), y registralo en §3 «IA en el producto».";
    return `
IA EN EL PRODUCTO: sí. El nivel N4 de seguridad.md queda activo desde el día 1:
- Lo que el modelo lee (mensajes, tickets, documentos, webs) es dato, no instrucción
  (R26): prompt injection previsto, y el modelo no ejecuta nada por lo que lea.
- Tope de gasto por usuario y global, RESERVADO antes de llamar: bajo un lock se anota
  lo máximo que puede costar la llamada y recién ahí se llama; al volver se ajusta con
  el uso real. «Chequear y después llamar» deja pasar todos los pedidos en paralelo.
- La salida del modelo también es dato: se valida antes de insertarla en HTML, SQL o un
  comando, y nunca se ejecuta tal cual.
- La API key solo en el servidor, rate limit por IP y por cuenta, y el usuario sabe que
  habla con una IA.
${r12}
Seguí el playbook ${PB_IA} (va adjunto) cuando toque implementarlo.
`;
  }

  const lineaNivel = (nivel, corto) => `NIVEL: ${nivel}${nivel === "NOVATO"
    ? (corto
      ? " — R23 activa: pensá por tres antes de cada acción con consecuencias, explicame todo en lenguaje simple y un paso por vez."
      : " — R23 activa: pensá por tres antes de cada acción con consecuencias (plan → autocrítica → plan corregido), explicame todo en lenguaje simple, un paso por vez, y no asumas que sé nada de programación.")
    : " — experiencia en código: podés ir al grano."}`;

  const lineaPlaybooks = pbs =>
    `PLAYBOOKS a seguir al pie de la letra cuando toque (R24): ${pbs.length ? pbs.join(", ") : "ninguno por ahora"} — te los adjunto junto con el master.`;

  const reglasApagadas = o => {
    const lista = [...new Set([...(r01Apagada(o) ? ["R01"] : []), ...(o.apagadas || [])])].sort();
    return lista.length ? lista.map(r => `${r}=OFF`).join(", ") : "ninguna";
  };

  /* Un proyecto que ya existe NO se arranca igual que uno nuevo: R15 dice que
     primero se analiza y se genera el sdd/ reflejando lo que HAY. */
  function brownfield(o){
    const pbs = playbooks(o.playbooks, o.ia), sinR01 = r01Apagada(o);
    return `Pegá/adjuntá primero el SDD-MASTER (está en la lista de archivos de abajo). Aplicalo.

Este repo YA EXISTE y NO tiene SDD. Aplicá R15: no toques código todavía.

${lineaNivel(o.nivel, true)}
PERFIL: ${o.perfil} · Reglas apagadas: ${reglasApagadas(o)}${o.custom ? "\nTengo overrides propios en custom.md (va adjunto): leelo DESPUÉS del master." : ""}

QUÉ ES ESTE PROYECTO: ${o.tipo.name}
${o.tipo.extra}

Nota: dicto mis mensajes por voz. Si una palabra no te cierra, citámela y
preguntame qué quise decir en vez de asumir (R04).

PASOS:
1. Analizá el repo con subagentes económicos (R11): estructura, git log,
   dependencias y el estilo que ya usa el código. NO toques nada.
2. Clasificá la superficie de ataque con las seis preguntas de seguridad.md
   (R27) sobre lo que el proyecto YA hace, y decime qué niveles quedan activos.
3. Generá sdd/ completo reflejando lo que EXISTE, no lo que te gustaría que
   existiera. Si algo está a medias, que status.md lo diga con su % real.
4. Redactá la "prompt de arranque sintética": el contexto reconstruido como si
   el proyecto hubiera nacido con SDD.
5. ${sinR01
  ? "Presentame todo y esperá mi OK sobre el contenido (R08). El commit de los MD lo\n   hacés vos: tengo R01=OFF, así que no esperes mi OK para commitear."
  : "Presentame todo y esperá mi OK. Recién ahí commiteás los MD (R01)."}
6. Después de eso, y no antes: proponeme las 3 mejoras que más valor agregan,
   marcadas [MEJORA PROPUESTA] (R03), y las trabajamos por ciclos con HANDBACK.
${bloqueTecnologias(o.tecnologias, o.catalogo)}${bloqueIA(o)}
${lineaPlaybooks(pbs)}`;
  }

  function armar(o){
    if (o.brownfield) return brownfield(o);
    const pbs = playbooks(o.playbooks, o.ia), sinR01 = r01Apagada(o);
    const modo = o.lite
      ? "MODO: LITE (R18) — armá un solo sdd/sdd-lite.md tomando como base la plantilla\nsdd/prompts/sdd-lite.md (viene en el paquete)"
      : "MODO: que lo clasifiques vos (R18)";
    const cierre = sinR01
      ? "primer commit solo con los MD. Tengo R01=OFF: commiteá sin esperar mi OK, pero\nmostrame el resumen de cada commit después de hacerlo."
      : "primer commit solo con los MD (R01). Avisame, como siempre, que R01 es desactivable.";
    return `Pegá/adjuntá primero el SDD-MASTER (está en la lista de archivos de abajo). Aplicalo.

${lineaNivel(o.nivel, false)}
PERFIL: ${o.perfil} · ${modo} · Reglas apagadas: ${reglasApagadas(o)}${o.custom
  ? "\nTengo overrides propios en custom.md (va adjunto): leelo DESPUÉS del master y aplicá lo que pise."
  : ""}

TIPO DE PROYECTO: ${o.tipo.name}
${o.tipo.extra}

STACK: ${o.stack}
${bloqueTecnologias(o.tecnologias, o.catalogo)}${bloqueIA(o)}
${lineaPlaybooks(pbs)}

SEGURIDAD (R27): clasificá la superficie de este proyecto con las seis preguntas de
seguridad.md (¿login? ¿datos de personas? ¿plata? ¿IA con entrada del usuario?
¿archivos subidos? ¿API pública?), decime qué niveles quedan activos y por qué, y
registralo en security.md. No me pases el checklist entero: solo lo que aplica.

Arrancá con el cuestionario socrático (R04) sumando las preguntas propias de este tipo de proyecto. Después: propuesta de estructura y stack → mi OK → carpeta del repo (R10, con OK) → generás sdd/ → ${cierre}`;
  }

  return {armar, playbooks, r01Apagada, esLite, separarTecnologias, limpiarTecnologia, TIPOS_LITE, PB_IA};
})();
