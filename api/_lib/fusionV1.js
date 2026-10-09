'use strict';
/* La fusión v1: concatenación plana, sin IA. La usa el modo "simulada"
 * (AC2: sin ANTHROPIC_API_KEY, o el modelo falló) y es la base sobre la que
 * el modo "ia" le pide a Claude que fusione con más criterio. El formato de
 * cada archivo es {nombre, contenido}, igual que ya usa web/paquete.js. */

function armarConcatenacionV1({ tipo, stack, tecnologias = [], playbooks = [], custom = '', descripcion = '' }) {
  const partes = [
    '# Pedido del combinador',
    `Tipo: ${tipo}`,
    `Stack: ${stack}`,
    tecnologias.length ? `Tecnologías: ${tecnologias.join(', ')}` : null,
    playbooks.length ? `Playbooks: ${playbooks.join(', ')}` : null,
    custom ? `\n## Reglas (custom.md)\n${custom}` : null,
    descripcion ? `\n## Descripción libre\n${descripcion}` : null,
  ].filter((x) => x !== null && x !== undefined);
  const contenido = partes.join('\n') + '\n';
  return [{ nombre: 'sdd/custom.md', contenido }];
}

module.exports = { armarConcatenacionV1 };
