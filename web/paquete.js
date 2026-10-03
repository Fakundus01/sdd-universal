/* Arma la carpeta del proyecto y la baja como .zip.
 *
 * La idea: que la persona no tenga que entender qué archivo va dónde. Baja,
 * descomprime, abre el agente y pega el prompt. Todo lo demás ya está en su
 * lugar — incluido el .gitignore, que R17 exige como paso 0 y que es
 * justamente lo que más se olvida cuando se arma a mano.
 */
const Paquete = (() => {

  const slug = t => (t || "mi-proyecto")
    .toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "mi-proyecto";

  async function traer(ruta){
    const r = await fetch(ruta);
    if (!r.ok) throw new Error(`No se pudo leer ${ruta}`);
    return await r.text();
  }

  const ESPEJO = raiz => `Leé \`${raiz}\` y obedecé sus reglas.\n`;

  /* Skills para Claude Code: atajos /sdd-* que envuelven los prompts del
     master. Van en .claude/skills/ y Claude las descubre solo al abrir el
     repo. Son opcionales y solo-Claude: el SDD sigue siendo agnóstico (R22). */
  const SKILLS = [
    {n: "sdd-arranque",  d: "arranca el proyecto: cuestionario, MDs y OK"},
    {n: "sdd-ciclo",     d: "un ciclo de trabajo con su HANDBACK"},
    {n: "sdd-auditoria", d: "auditoría de mantenimiento (R19)"},
    {n: "relevo",        d: "guarda el trabajo en vuelo para seguir en sesión limpia"},
    {n: "harness-fix",   d: "mejora el arnés cuando un agente falló por el entorno", pro: true}
  ];

  /* El arnés ejecutable de R29/R30 (harness/ del paquete), sin sus tests:
     el README dice que se dejan afuera si no vas a tocar el arnés. Los
     dotfiles no se traen — sus reglas ya están en GITIGNORE y GITATTRIBUTES. */
  const HARNESS = [
    "README.md", "verify.py", "checks.py", "config.py", "repo.py", "report.py",
    "harness.config.example.json", "hooks/claude.py", "hooks/settings.example.json",
    "templates/current.md", "ci/verify.yml", "git-hooks/pre-commit"
  ];
  // Sin el bit de ejecución, git ignora el pre-commit en Linux/macOS.
  const EJECUTABLES = new Set(["git-hooks/pre-commit"]);

  /* Plantillas del loop de R30/R31 (tarjeta, handback, relevo): harness.md,
     orchestration.md, agents/ y el hook de contexto las citan como prompts/. */
  const PLANTILLAS = ["task-card", "handback", "relevo"];

  /* Prompts de rol de R31. Solo con nivel PRO: con NOVATO R31 va OFF. */
  const AGENTES = ["README", "leader", "implementer", "reviewer", "analytic",
                   "infra-implementer", "looper", "prompter"];

  /* Skills sueltas: sirven en cualquier proyecto, con o sin SDD. Chicas a
     propósito — cada una hace una cosa y se entiende en una leída. */
  const SKILLS_EXTRA = [
    {n: "plan-primero",     d: "mini-plan de 5–10 líneas y OK antes de codear"},
    {n: "menos-tokens",     d: "modo económico: leer y responder lo justo"},
    {n: "codigo-en-clases", d: "POO modular, archivos de 200–300 líneas"},
    {n: "commit-prolijo",   d: "el mensaje sale del diff real, con tu OK"},
    {n: "revisar-antes",    d: "pasada de bugs y secretos antes de cerrar"},
    {n: "arreglar-error",   d: "causa raíz antes que parche, sin escopetazos"},
    {n: "tests-minimos",    d: "pocos tests de alto valor, sin relleno"},
    {n: "explicame-simple", d: "lenguaje llano, de a un paso, sin jerga"},
    {n: "limpiar-repo",     d: "detecta lo muerto y propone; nunca borra solo"},
    {n: "resumen-sesion",   d: "cierre en 15 líneas para retomar mañana"},
    {n: "datos-ajenos",     d: "repos/APIs de terceros con copia propia"}
  ];

  /* Con N agentes o personas en paralelo, los archivos de historial chocan
     en cada merge: union junta las dos versiones en vez de pedir resolución
     a mano (S27, aprendido de IDA). */
  const GITATTRIBUTES = `* text=auto

# Los archivos de historial se escriben en cada ciclo: con trabajo en
# paralelo chocan siempre. merge=union junta las dos versiones.
sdd/changelog/*.md merge=union
sdd/status.md merge=union
CHANGELOG.md merge=union

# Los git hooks corren con sh: un CRLF en el shebang los rompe en Linux/macOS.
harness/git-hooks/* text eol=lf
`;

  const GITIGNORE = `# Secretos — R17: esto va ANTES del primer commit.
# Un .gitignore agregado después del primer secreto llega tarde: la clave
# ya quedó en el historial de git y sacarla de ahí es reescribir la historia.
.env
.env.*
!.env.example

# Dependencias
node_modules/
venv/
.venv/
__pycache__/

# Artefactos de build
dist/
build/
*.log

# Sistema operativo
.DS_Store
Thumbs.db
desktop.ini

# Editores
.vscode/
.idea/
`;

  function leeme(nombre, tipo, nivel, playbooks, brownfield, conSkills, conHarness, conAgentes){
    return `# ${nombre}

Carpeta generada desde el catálogo del SDD Universal. Ya viene con todo en su lugar.

## Qué hacer ahora (3 pasos)
${brownfield ? `
> **Tu proyecto ya existe**, así que esta carpeta no reemplaza a la tuya:
> copiá ${[ "\`sdd/\`", conAgentes && "\`agents/\`", conHarness && "\`harness/\`",
             conSkills && "\`.claude/skills/\`", "\`.gitattributes\`", "\`AGENTS.md\`" ]
             .filter(Boolean).join(", ")} y \`CLAUDE.md\` **dentro** del repo que ya tenés
> (si ya tenés un \`.gitattributes\`, sumale las líneas del de acá).
> Si tu repo no tiene \`.gitignore\`, llevate también el de acá.
` : ""}
1. **Abrí tu agente de IA** (Claude, Codex/ChatGPT, Cursor, Copilot, Gemini…)${brownfield ? ", parado en tu repo" : ""}.
2. **Adjuntá o pegá \`sdd/SDD-MASTER.md\`.** Es el único archivo imprescindible${playbooks.length ? `, más los playbooks de \`sdd/playbooks/\` cuando el agente te los pida` : ""}.
3. **Pegá el contenido de \`PROMPT-DE-ARRANQUE.txt\`** como primer mensaje.

${brownfield
  ? "A partir de ahí el agente analiza tu código **sin tocarlo** (regla R15), escribe el `sdd/` reflejando lo que ya existe, y espera tu OK antes de proponer cualquier cambio."
  : "A partir de ahí el agente te hace un cuestionario, propone la estructura, espera tu OK, y recién entonces escribe código."}

## Qué hay en esta carpeta

| | |
|---|---|
| \`sdd/SDD-MASTER.md\` | El núcleo: las reglas y el protocolo de lectura |
| \`sdd/seguridad.md\` | Los controles según lo que tu proyecto hace (R27). El agente lo usa solo, no hace falta que lo leas |
| \`sdd/harness.md\` | Cómo se demuestra que algo está terminado: test primero, evidencia literal y un reviewer que la re-ejecuta (R29, R30) |
| \`sdd/orchestration.md\` | Cómo se reparte el trabajo entre agentes con roles, cuando hace falta (R31) |
| \`sdd/prompts/\` | Plantillas de tarjeta, handback y relevo: las usa el agente al trabajar |${playbooks.length ? `\n| \`sdd/playbooks/\` | ${playbooks.length} receta(s) paso a paso: ${playbooks.join(", ")} |` : ""}
| \`PROMPT-DE-ARRANQUE.txt\` | Tu prompt, ya armado con las opciones que elegiste |
| \`.gitignore\` | Con \`.env\` adentro desde el minuto cero (R17) |
| \`AGENTS.md\` / \`CLAUDE.md\` | Una línea para que cualquier agente encuentre el SDD solo |${conSkills ? `
| \`.claude/skills/\` | Atajos para Claude Code: \`/sdd-arranque\`, \`/sdd-ciclo\`, \`/sdd-auditoria\`, \`/relevo\`, \`/harness-fix\`. Si usás otro agente, ignorala — no molesta |` : ""}${conAgentes ? `
| \`agents/\` | Los prompts de cada rol (leader, implementer, reviewer…). En Claude Code se copian a \`.claude/agents/\`: ver \`agents/README.md\` |` : ""}${conHarness ? `
| \`harness/\` | El arnés: \`verify.py\` por niveles, pre-commit, hooks y CI de ejemplo. Necesita Python 3.10+. **Lo instala el agente** siguiendo \`harness/README.md\` cuando haya código que verificar (en Windows, con \`git update-index --chmod=+x harness/git-hooks/pre-commit\` para que el hook siga siendo ejecutable en Linux/macOS) |` : ""}

**Lo que todavía no está:** \`spec.md\`, \`design.md\`, \`contracts.md\` y compañía. Esos **los escribe el agente** sobre tu idea, en el paso 3. No se descargan de ningún lado porque todavía no existen.

## Sobre git

El agente puede correr \`git init\` y armar el primer commit por vos — pedíselo. Con la regla R01 activa te va a mostrar qué va a commitear y esperar tu OK. Si querés publicarlo en GitHub, pedile que siga el playbook \`publish-github-vercel\`.

---

Tipo de proyecto: **${tipo}** · Nivel: **${nivel}**
SDD Universal · https://sdd-universal.vercel.app
`;
  }

  /* Carpeta lista para trabajar: espejos, .gitignore, sdd/ y el prompt. */
  async function proyecto({nombre, tipoNombre, nivel, prompt, playbooks, custom, conTecnologias, conGuia, brownfield, conSkills, conHarness, onPaso}){
    const carpeta = slug(nombre);
    const conAgentes = nivel !== "NOVATO";
    // progreso real: quien arma el zip sabe cuantos archivos va a buscar
    const skills = SKILLS.filter(s => conAgentes || !s.pro);
    const total = 4 + PLANTILLAS.length + (conTecnologias ? 1 : 0) + (conGuia ? 1 : 0) + playbooks.length
                + (conSkills ? skills.length : 0)
                + (conHarness ? HARNESS.length : 0) + (conAgentes ? AGENTES.length : 0);
    let hecho = 0;
    const paso = () => onPaso && onPaso(++hecho, total);
    const traerP = async r => { const t = await traer(r); paso(); return t; };
    const archivos = [
      {nombre: `${carpeta}/LEEME.md`, contenido: leeme(nombre || carpeta, tipoNombre, nivel, playbooks, brownfield, conSkills, conHarness, conAgentes)},
      {nombre: `${carpeta}/PROMPT-DE-ARRANQUE.txt`, contenido: prompt},
      {nombre: `${carpeta}/.gitignore`, contenido: GITIGNORE},
      {nombre: `${carpeta}/.gitattributes`, contenido: GITATTRIBUTES},
      {nombre: `${carpeta}/AGENTS.md`, contenido: ESPEJO("sdd/SDD-MASTER.md")},
      {nombre: `${carpeta}/CLAUDE.md`, contenido: ESPEJO("sdd/SDD-MASTER.md")},
      {nombre: `${carpeta}/sdd/SDD-MASTER.md`, contenido: await traerP("../SDD-MASTER.md")},
      // seguridad.md va siempre: R27 lo necesita en el arranque para clasificar
      // la superficie, y es justo lo que nadie descarga si hay que elegirlo.
      {nombre: `${carpeta}/sdd/seguridad.md`, contenido: await traerP("../seguridad.md")},
      // Mismo criterio: R30 es fija y el master manda a harness.md para todo
      // cierre; orchestration.md lo cita R31. Un master que apunta a archivos
      // que no vinieron en el ZIP es un agente que improvisa.
      {nombre: `${carpeta}/sdd/harness.md`, contenido: await traerP("../harness.md")},
      {nombre: `${carpeta}/sdd/orchestration.md`, contenido: await traerP("../orchestration.md")}
    ];
    for (const t of PLANTILLAS)
      archivos.push({nombre: `${carpeta}/sdd/prompts/${t}.md`, contenido: await traerP(`../prompts/${t}.md`)});

    if (custom)           archivos.push({nombre: `${carpeta}/sdd/custom.md`, contenido: custom});
    if (conTecnologias)   archivos.push({nombre: `${carpeta}/sdd/tecnologias.md`, contenido: await traerP("../tecnologias.md")});
    if (conGuia)          archivos.push({nombre: `${carpeta}/sdd/GUIDE.md`, contenido: await traerP("../GUIDE.md")});

    for (const p of playbooks)
      archivos.push({nombre: `${carpeta}/sdd/playbooks/${p}.md`, contenido: await traerP(`../playbooks/${p}.md`)});

    if (conSkills)
      for (const s of skills)
        archivos.push({nombre: `${carpeta}/.claude/skills/${s.n}/SKILL.md`,
                       contenido: await traerP(`../skills/${s.n}/SKILL.md`)});

    if (conAgentes)
      for (const a of AGENTES)
        archivos.push({nombre: `${carpeta}/agents/${a}.md`, contenido: await traerP(`../agents/${a}.md`)});

    if (conHarness)
      for (const h of HARNESS)
        archivos.push({nombre: `${carpeta}/harness/${h}`, contenido: await traerP(`../harness/${h}`),
                       ejecutable: EJECUTABLES.has(h)});

    Zip.descargar(`${carpeta}.zip`, archivos);
    return archivos.length;
  }

  /* Todas las skills (SDD + sueltas), para sumarlas a un proyecto que ya
     está andando: se descomprime en la raíz del repo y listo. */
  async function soloSkills(){
    const archivos = [];
    for (const s of [...SKILLS, ...SKILLS_EXTRA])
      archivos.push({nombre: `.claude/skills/${s.n}/SKILL.md`,
                     contenido: await traer(`../skills/${s.n}/SKILL.md`)});
    Zip.descargar("skills-claude.zip", archivos);
    return archivos.length;
  }

  /* Solo los MD, sueltos: para quien ya tiene su repo armado. */
  async function soloMd({playbooks, custom, conTecnologias, conGuia, prompt}){
    const archivos = [
      {nombre: "SDD-MASTER.md", contenido: await traer("../SDD-MASTER.md")},
      {nombre: "seguridad.md", contenido: await traer("../seguridad.md")},
      {nombre: "harness.md", contenido: await traer("../harness.md")},
      {nombre: "orchestration.md", contenido: await traer("../orchestration.md")},
      {nombre: "PROMPT-DE-ARRANQUE.txt", contenido: prompt}
    ];
    for (const t of PLANTILLAS)
      archivos.push({nombre: `prompts/${t}.md`, contenido: await traer(`../prompts/${t}.md`)});
    if (custom)         archivos.push({nombre: "custom.md", contenido: custom});
    if (conTecnologias) archivos.push({nombre: "tecnologias.md", contenido: await traer("../tecnologias.md")});
    if (conGuia)        archivos.push({nombre: "GUIDE.md", contenido: await traer("../GUIDE.md")});
    for (const p of playbooks)
      archivos.push({nombre: `playbooks/${p}.md`, contenido: await traer(`../playbooks/${p}.md`)});

    Zip.descargar("sdd-archivos.zip", archivos);
    return archivos.length;
  }

  return {proyecto, soloMd, soloSkills, slug, SKILLS, SKILLS_EXTRA, HARNESS};
})();
