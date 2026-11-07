import test from 'node:test';
import assert from 'node:assert/strict';
import { observeMobileViewport } from './mobileViewport.js';

function fixture() {
  const listeners = new Map();
  const events = {
    addEventListener(name, fn) { listeners.set(name, fn); },
    removeEventListener(name) { listeners.delete(name); },
  };
  const viewport = { ...events, scale: 1, height: 800, offsetTop: 0 };
  const view = { ...events, visualViewport: viewport, innerHeight: 800,
    requestAnimationFrame(fn) { fn(); return 1; }, cancelAnimationFrame() {} };
  const values = new Map();
  const style = { setProperty: (k,v) => values.set(k,v), removeProperty: k => values.delete(k) };
  return { view, viewport, values, style, resize: () => listeners.get('resize')?.() };
}

test('keyboard opening, panning and closing update visible height and inset', () => {
  const f = fixture();
  const stop = observeMobileViewport(f.view,f.style);
  assert.equal(f.values.get('--keyboard-inset'),'0px');
  f.viewport.height = 450;
  f.resize();
  assert.equal(f.values.get('--keyboard-inset'),'350px');
  assert.equal(f.values.get('--visible-viewport-height'),'450px');
  f.viewport.offsetTop = 40;
  f.resize();
  assert.equal(f.values.get('--keyboard-inset'),'310px');
  f.viewport.height = 800; f.viewport.offsetTop = 0;
  f.resize();
  assert.equal(f.values.get('--keyboard-inset'),'0px');
  stop();
  assert.equal(f.values.size,0);
});

test('pinch zoom is left alone, and Android resizing does not add keyboard inset twice', () => {
  const f = fixture(); observeMobileViewport(f.view,f.style);
  f.viewport.scale = 2; f.viewport.height = 400; f.resize();
  assert.equal(f.values.get('--visible-viewport-height'),'800px');
  f.viewport.scale = 1; f.view.innerHeight = 400; f.resize();
  assert.equal(f.values.get('--keyboard-inset'),'0px');
  assert.equal(f.values.get('--visible-viewport-height'),'400px');
});

test('browsers without VisualViewport retain the CSS fallback', () => {
  const f = fixture(); delete f.view.visualViewport;
  observeMobileViewport(f.view,f.style)();
  assert.equal(f.values.size,0);
});
