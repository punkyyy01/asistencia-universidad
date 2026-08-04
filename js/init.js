// ════════════════════════════════════════
// INIT
// ════════════════════════════════════════
applyTheme(S.theme);
render();
checkSyncLink();
window.addEventListener('hashchange', checkSyncLink);
window.addEventListener('load', refreshIcons);

if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('No se pudo registrar el Service Worker:', err);
    });
  });
}
