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

  function leeme(nombre, tipo, nivel, playbooks){
    return `# ${nombre}

Carpeta generada desde el catálogo del SDD Universal. Ya viene con todo en su lugar.

## Qué hacer ahora (3 pasos)

1. **Abrí tu agente de IA** (Claude, Codex/ChatGPT, Cursor, Copilot, Gemini…).
2. **Adjuntá o pegá \`sdd/SDD-MASTER.md\`.** Es el único archivo imprescindible${playbooks.length ? `, más los playbooks de \`sdd/playbooks/\` cuando el agente te los pida` : ""}.
3. **Pegá el contenido de \`PROMPT-DE-ARRANQUE.txt\`** como primer mensaje.

A partir de ahí el agente te hace un cuestionario, propone la estructura, espera tu OK, y recién entonces escribe código.

## Qué hay en esta carpeta

| | |
|---|---|
| \`sdd/SDD-MASTER.md\` | El núcleo: las reglas y el protocolo de lectura |
| \`sdd/seguridad.md\` | Los controles según lo que tu proyecto hace (R27). El agente lo usa solo, no hace falta que lo leas |${playbooks.length ? `\n| \`sdd/playbooks/\` | ${playbooks.length} receta(s) paso a paso: ${playbooks.join(", ")} |` : ""}
| \`PROMPT-DE-ARRANQUE.txt\` | Tu prompt, ya armado con las opciones que elegiste |
| \`.gitignore\` | Con \`.env\` adentro desde el minuto cero (R17) |
| \`AGENTS.md\` / \`CLAUDE.md\` | Una línea para que cualquier agente encuentre el SDD solo |

**Lo que todavía no está:** \`spec.md\`, \`design.md\`, \`contracts.md\` y compañía. Esos **los escribe el agente** sobre tu idea, en el paso 3. No se descargan de ningún lado porque todavía no existen.

## Sobre git

El agente puede correr \`git init\` y armar el primer commit por vos — pedíselo. Con la regla R01 activa te va a mostrar qué va a commitear y esperar tu OK. Si querés publicarlo en GitHub, pedile que siga el playbook \`publish-github-vercel\`.

---

Tipo de proyecto: **${tipo}** · Nivel: **${nivel}**
SDD Universal · https://sdd-universal.vercel.app
`;
  }

  /* Carpeta lista para trabajar: espejos, .gitignore, sdd/ y el prompt. */
  async function proyecto({nombre, tipoNombre, nivel, prompt, playbooks, custom, conTecnologias, conGuia}){
    const carpeta = slug(nombre);
    const archivos = [
      {nombre: `${carpeta}/LEEME.md`, contenido: leeme(nombre || carpeta, tipoNombre, nivel, playbooks)},
      {nombre: `${carpeta}/PROMPT-DE-ARRANQUE.txt`, contenido: prompt},
      {nombre: `${carpeta}/.gitignore`, contenido: GITIGNORE},
      {nombre: `${carpeta}/AGENTS.md`, contenido: ESPEJO("sdd/SDD-MASTER.md")},
      {nombre: `${carpeta}/CLAUDE.md`, contenido: ESPEJO("sdd/SDD-MASTER.md")},
      {nombre: `${carpeta}/sdd/SDD-MASTER.md`, contenido: await traer("../SDD-MASTER.md")},
      // seguridad.md va siempre: R27 lo necesita en el arranque para clasificar
      // la superficie, y es justo lo que nadie descarga si hay que elegirlo.
      {nombre: `${carpeta}/sdd/seguridad.md`, contenido: await traer("../seguridad.md")}
    ];

    if (custom)           archivos.push({nombre: `${carpeta}/sdd/custom.md`, contenido: custom});
    if (conTecnologias)   archivos.push({nombre: `${carpeta}/sdd/tecnologias.md`, contenido: await traer("../tecnologias.md")});
    if (conGuia)          archivos.push({nombre: `${carpeta}/sdd/GUIDE.md`, contenido: await traer("../GUIDE.md")});

    for (const p of playbooks)
      archivos.push({nombre: `${carpeta}/sdd/playbooks/${p}.md`, contenido: await traer(`../playbooks/${p}.md`)});

    Zip.descargar(`${carpeta}.zip`, archivos);
    return archivos.length;
  }

  /* Solo los MD, sueltos: para quien ya tiene su repo armado. */
  async function soloMd({playbooks, custom, conTecnologias, conGuia, prompt}){
    const archivos = [
      {nombre: "SDD-MASTER.md", contenido: await traer("../SDD-MASTER.md")},
      {nombre: "PROMPT-DE-ARRANQUE.txt", contenido: prompt}
    ];
    if (custom)         archivos.push({nombre: "custom.md", contenido: custom});
    if (conTecnologias) archivos.push({nombre: "tecnologias.md", contenido: await traer("../tecnologias.md")});
    if (conGuia)        archivos.push({nombre: "GUIDE.md", contenido: await traer("../GUIDE.md")});
    for (const p of playbooks)
      archivos.push({nombre: `playbooks/${p}.md`, contenido: await traer(`../playbooks/${p}.md`)});

    Zip.descargar("sdd-archivos.zip", archivos);
    return archivos.length;
  }

  return {proyecto, soloMd, slug};
})();
