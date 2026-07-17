/* Foko Lab v72 ODE workspace controller.
 * Sole owner of ODE Two-up / Focus state. Plot selection never changes layout.
 */
(function (root) {
  'use strict';
  const STORAGE_KEY = 'fokolab:v72:ode-layout';
  const VALID_LAYOUTS = new Set(['two', 'focus']);
  const VALID_SIDES = new Set(['left', 'right']);
  let preferredLayout = 'two';
  let focusSide = 'left';
  let lastEffectiveLayout = '';
  let lastFocusSide = '';

  function byId(id) { return document.getElementById(id); }
  function plotGrid() { return byId('plotGrid'); }
  function safeParse(value) { try { return JSON.parse(value); } catch (_) { return null; } }
  function storedState() {
    const saved = safeParse(localStorage.getItem(STORAGE_KEY));
    if (saved && VALID_LAYOUTS.has(saved.layout)) preferredLayout = saved.layout;
    if (saved && VALID_SIDES.has(saved.focus)) focusSide = saved.focus;
  }
  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ layout: preferredLayout, focus: focusSide }));
  }
  function effectiveLayout() {
    return window.innerWidth < 1024 ? 'focus' : preferredLayout;
  }
  function reportLayout(effective) {
    return {
      preferred: preferredLayout,
      effective: effective || effectiveLayout(),
      focus: focusSide,
      reason: (effective || effectiveLayout()) === preferredLayout ? 'user-' + preferredLayout : 'narrow-viewport'
    };
  }
  function render() {
    const grid = plotGrid();
    if (!grid) return reportLayout();
    const layout = effectiveLayout();
    grid.dataset.preferredLayout = preferredLayout;
    grid.dataset.layout = layout;
    grid.dataset.layoutReason = layout === preferredLayout ? 'user-' + preferredLayout : 'narrow-viewport';
    grid.dataset.focusSide = focusSide;
    document.querySelectorAll('[data-layout-mode]').forEach(function (button) {
      const active = button.dataset.layoutMode === preferredLayout;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('[data-focus-side]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.focusSide === focusSide && layout === 'focus'));
    });
    if (layout !== lastEffectiveLayout || focusSide !== lastFocusSide) {
      lastEffectiveLayout = layout;
      lastFocusSide = focusSide;
      document.dispatchEvent(new CustomEvent('foko:layout-change', { detail: reportLayout(layout) }));
    }
    if (root.FokoScientificRegistry) root.FokoScientificRegistry.notifyRendered('ode');
    return reportLayout(layout);
  }
  function chooseLayout(layout) {
    if (!VALID_LAYOUTS.has(layout)) return;
    preferredLayout = layout;
    persist();
    render();
  }
  function chooseFocus(side) {
    if (!VALID_SIDES.has(side)) return;
    focusSide = side;
    preferredLayout = 'focus';
    persist();
    render();
  }
  function setText(id, value) {
    const node = byId(id);
    if (node) node.textContent = value == null || value === '' ? '—' : String(value);
  }
  function updateProvenance(detail) {
    const d = detail || {};
    setText('provenanceStatus', d.status || 'Not computed');
    setText('provenanceEngine', d.engine || 'FokoODECore worker');
    setText('provenanceMethod', d.method || '—');
    setText('provenanceScope', d.scope || 'Browser RK methods; stiff solvers are export-only.');
    const warning = byId('provenanceWarning');
    if (warning) {
      warning.hidden = !d.warning;
      warning.textContent = d.warning || '';
    }
  }
  function bind() {
    storedState();
    document.querySelectorAll('[data-layout-mode]').forEach(function (button) {
      button.addEventListener('click', function () { chooseLayout(button.dataset.layoutMode); });
    });
    document.querySelectorAll('.focus-card[data-focus-side]').forEach(function (button) {
      button.addEventListener('click', function () { chooseFocus(button.dataset.focusSide); });
    });
    document.addEventListener('foko:provenance', function (event) { updateProvenance(event.detail); });
    window.addEventListener('resize', render, { passive: true });
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();

  root.FokoODEWorkspace = { render: render, chooseLayout: chooseLayout, chooseFocus: chooseFocus, updateProvenance: updateProvenance, reportLayout: reportLayout };
}(typeof window !== 'undefined' ? window : globalThis));
/* Lazy local loader for optional v72.24-v72.25 trust tools. */
(function(root){
  'use strict';
  let promise=null;
  function load(src){return new Promise(function(resolve,reject){if(document.querySelector(`script[data-foko-trust-src="${src}"]`)){resolve();return;}const script=document.createElement('script');script.src=src;script.defer=true;script.dataset.fokoTrustSrc=src;script.onload=resolve;script.onerror=function(){reject(new Error(`Unable to load optional trust module: ${src}`));};document.head.appendChild(script);});}
  function ensure(){
    if(promise)return promise;
    promise=(async function(){
      await load('src/core/scipy-verification.js?v=72.47.0');
      await load('src/core/model-report-card.js?v=72.47.0');
      await load('src/v72/scipy-verifier.js?v=72.47.0');
      if(!root.FokoSciPyVerifier||!root.FokoModelReportCard)throw new Error('Optional trust modules did not initialize.');
      return {verifier:root.FokoSciPyVerifier,report:root.FokoModelReportCard};
    })().catch(function(error){promise=null;throw error;});
    return promise;
  }
  root.FokoTrustTools={ensure};
})(window);
