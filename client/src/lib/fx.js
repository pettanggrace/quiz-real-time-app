// Bus d'événements pour déclencher des gerbes de particules depuis n'importe où
export function burst(x, y, kind = 'good') {
  window.dispatchEvent(new CustomEvent('fx:burst', { detail: { x, y, kind } }));
}

export function burstFrom(el, kind) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, kind);
}
