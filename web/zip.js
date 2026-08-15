/* Generador de ZIP en el navegador, sin librerías.
 *
 * Escribe el formato a mano con el método "store" (sin compresión). Traer
 * una librería de 90 KB para juntar 6 archivos de texto contradiría el
 * constraint C2 del proyecto (cero dependencias en el front), y comprimir
 * Markdown que ya pesa nada no cambiaría el tamaño de la descarga.
 *
 * Formato: cabecera local por archivo → directorio central → fin del
 * directorio. Es la especificación mínima que abre en Windows, macOS y
 * Linux sin herramientas extra.
 */
const Zip = (() => {
  const TABLA = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++){
      let c = i;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[i] = c >>> 0;
    }
    return t;
  })();

  const crc32 = b => {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < b.length; i++) c = TABLA[(c ^ b[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  };

  const utf8 = new TextEncoder();

  /* El ZIP guarda la fecha en formato MS-DOS: 2 bytes de hora, 2 de fecha,
     con los segundos divididos por 2 (por eso solo hay precisión de 2 seg). */
  function fechaDos(d = new Date()){
    return {
      hora: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
      fecha: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
    };
  }

  function crear(archivos){
    const {hora, fecha} = fechaDos();
    const cuerpo = [], central = [];
    let offset = 0;

    for (const a of archivos){
      const nombre = utf8.encode(a.nombre);
      const datos = typeof a.contenido === "string" ? utf8.encode(a.contenido) : a.contenido;
      const crc = crc32(datos);

      const local = new Uint8Array(30 + nombre.length);
      const v = new DataView(local.buffer);
      v.setUint32(0, 0x04034b50, true);   // firma de cabecera local
      v.setUint16(4, 20, true);           // versión mínima
      v.setUint16(6, 0x0800, true);       // nombres en UTF-8
      v.setUint16(8, 0, true);            // método 0 = sin compresión
      v.setUint16(10, hora, true);
      v.setUint16(12, fecha, true);
      v.setUint32(14, crc, true);
      v.setUint32(18, datos.length, true);
      v.setUint32(22, datos.length, true);
      v.setUint16(26, nombre.length, true);
      local.set(nombre, 30);
      cuerpo.push(local, datos);

      const cen = new Uint8Array(46 + nombre.length);
      const w = new DataView(cen.buffer);
      w.setUint32(0, 0x02014b50, true);   // firma de directorio central
      w.setUint16(4, 20, true);
      w.setUint16(6, 20, true);
      w.setUint16(8, 0x0800, true);
      w.setUint16(10, 0, true);
      w.setUint16(12, hora, true);
      w.setUint16(14, fecha, true);
      w.setUint32(16, crc, true);
      w.setUint32(20, datos.length, true);
      w.setUint32(24, datos.length, true);
      w.setUint16(28, nombre.length, true);
      w.setUint32(42, offset, true);      // dónde empieza su cabecera local
      cen.set(nombre, 46);
      central.push(cen);

      offset += local.length + datos.length;
    }

    const tamDirectorio = central.reduce((n, c) => n + c.length, 0);
    const fin = new Uint8Array(22);
    const f = new DataView(fin.buffer);
    f.setUint32(0, 0x06054b50, true);
    f.setUint16(8, archivos.length, true);
    f.setUint16(10, archivos.length, true);
    f.setUint32(12, tamDirectorio, true);
    f.setUint32(16, offset, true);

    return new Blob([...cuerpo, ...central, fin], {type: "application/zip"});
  }

  function descargar(nombreZip, archivos){
    const url = URL.createObjectURL(crear(archivos));
    const a = document.createElement("a");
    a.href = url;
    a.download = nombreZip;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  return {crear, descargar};
})();
