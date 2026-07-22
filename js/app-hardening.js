(() => {
  const blockShortcuts = (event) => {
    const key = event.key?.toLowerCase();
    const modifier = event.ctrlKey || event.metaKey;
    const devtoolsShortcut = modifier && event.shiftKey && ['i', 'j', 'c'].includes(key);
    const viewSourceShortcut = modifier && key === 'u';
    const f12Shortcut = key === 'f12';

    if (devtoolsShortcut || viewSourceShortcut || f12Shortcut) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  document.addEventListener('keydown', blockShortcuts, true);
  document.addEventListener('contextmenu', (event) => event.preventDefault());

  let devtoolsOpen = false;
  const lockDown = () => {
    if (devtoolsOpen) return;
    devtoolsOpen = true;

    document.body.innerHTML = `
      <div style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#07131f;color:#f6f8fc;font-family:Arial,sans-serif;">
        <div style="max-width:520px;text-align:center;padding:28px;border:1px solid rgba(255,255,255,0.16);border-radius:20px;background:rgba(255,255,255,0.06);">
          <h1 style="font-size:1.5rem;margin-bottom:10px;">Access restricted</h1>
          <p style="line-height:1.6;color:rgba(255,255,255,0.75);">This application is protected from direct inspection. Please use the normal interface.</p>
        </div>
      </div>
    `;
  };

  setInterval(() => {
    const threshold = window.outerHeight - window.innerHeight > 180 || window.outerWidth - window.innerWidth > 180;
    if (threshold) lockDown();
  }, 500);
})();
