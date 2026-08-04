// ════════════════════════════════════════
// SYNC LINK — snapshot completo embebido en la URL, sin servidor
// ════════════════════════════════════════
function bytesToBase64Url(bytes){
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function base64UrlToBytes(str){
  const b64 = str.replace(/-/g,'+').replace(/_/g,'/').padEnd(str.length + (4 - str.length % 4) % 4, '=');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
// ponytail: gzip vía CompressionStream (nativo) para que el link no sea gigante; sin fallback no hay link corto en navegadores viejos, así que degradamos a sin comprimir
async function gzipText(text){
  if (!window.CompressionStream) return { data: new TextEncoder().encode(text), gz: false };
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return { data: new Uint8Array(await new Response(stream).arrayBuffer()), gz: true };
}
async function gunzipBytes(bytes, gz){
  if (!gz) return new TextDecoder().decode(bytes);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

async function generateSyncLink(){
  try {
    const payload = { app: 'control-asistencia', version: KEY, exportedAt: new Date().toISOString(), state: S };
    const { data, gz } = await gzipText(JSON.stringify(payload));
    const encoded = (gz ? 'z' : 'r') + bytesToBase64Url(data);
    const link = `${location.origin}${location.pathname}#sync=${encoded}`;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(link);
      toast('Link de sincronización copiado', 'ok');
    } else {
      prompt('Copia este link:', link);
    }
  } catch (err) {
    toast('No se pudo generar el link', 'error');
  }
}

async function checkSyncLink(){
  const m = location.hash.match(/^#sync=(.+)$/);
  if (!m) return;
  history.replaceState(null, '', location.pathname + location.search);
  try {
    const raw = m[1];
    const bytes = base64UrlToBytes(raw.slice(1));
    const text = await gunzipBytes(bytes, raw[0] === 'z');
    const payload = JSON.parse(text);
    const imported = normalizeImportedState(payload);
    if (!imported) throw new Error('invalid-sync-link');
    const when = payload?.exportedAt ? new Date(payload.exportedAt) : null;
    const ageMsg = when && !isNaN(when) ? ` Generado el ${when.toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'})} a las ${when.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}.` : '';
    if (!confirm(`Se detectó un link de sincronización.${ageMsg} Esto reemplazará todos los datos actuales. ¿Cargar?`)) return;
    S = imported;
    applyTheme(S.theme);
    saveState();
    toast('Datos sincronizados correctamente', 'ok');
  } catch (err) {
    toast('El link de sincronización no es válido', 'error');
  }
}

