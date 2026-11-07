// Keep bottom-sheet actions above the keyboard without interfering with pinch zoom.
export function observeMobileViewport(view, style) {
  const viewport = view.visualViewport;
  if (!viewport) return () => {};
  let frame;
  const update = () => {
    if (Math.abs(viewport.scale - 1) > 0.01) return;
    style.setProperty('--visible-viewport-height', `${viewport.height}px`);
    style.setProperty('--keyboard-inset', `${Math.max(0, view.innerHeight - viewport.height - viewport.offsetTop)}px`);
  };
  const schedule = () => {
    view.cancelAnimationFrame(frame);
    frame = view.requestAnimationFrame(update);
  };
  update();
  viewport.addEventListener('resize', schedule);
  viewport.addEventListener('scroll', schedule);
  view.addEventListener('resize', schedule);
  return () => {
    view.cancelAnimationFrame(frame);
    viewport.removeEventListener('resize', schedule);
    viewport.removeEventListener('scroll', schedule);
    view.removeEventListener('resize', schedule);
    style.removeProperty('--visible-viewport-height');
    style.removeProperty('--keyboard-inset');
  };
}
