/* Render the public analysis taxonomy from the same data used by lab capability cards. */
(function (root) {
  'use strict';
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character];
    });
  }
  function rows(entries) {
    return entries.map(function (entry) {
      const note = entry.scope || entry.reason || entry.runtime || '';
      return `<tr><th>${escapeHtml(entry.label)}</th><td><span class="taxonomy-status" data-status="${escapeHtml(entry.status)}">${escapeHtml(entry.status.replace(/-/g, ' '))}</span></td><td class="taxonomy-note">${escapeHtml(note)}</td></tr>`;
    }).join('');
  }
  function group(title, entries) {
    return `<details><summary>${escapeHtml(title)} · ${entries.length}</summary><table class="taxonomy-table"><thead><tr><th>Capability</th><th>Status</th><th>Boundary</th></tr></thead><tbody>${rows(entries)}</tbody></table></details>`;
  }
  function render() {
    const node = document.getElementById('analysisTaxonomyDocs');
    const taxonomy = root.FokoAnalysisTaxonomy;
    if (!node || !taxonomy) return;
    const sections = [
      ['Optimization plot types', taxonomy.optimization.plots],
      ['Optimization problems', taxonomy.optimization.problems],
      ['Multi-objective plot types', taxonomy.multiObjective.plots],
      ['Multi-objective problems', taxonomy.multiObjective.problems],
      ['Steady-state / algebraic plot types', taxonomy.steadyState.plots],
      ['Steady-state / algebraic problems', taxonomy.steadyState.problems],
    ];
    Object.keys(taxonomy.sensitivity).forEach(function (key) {
      const label = key === 'multiObjective' ? 'Multi-objective sensitivity' : (key === 'steadyState' ? 'Steady-state sensitivity' : `${key.charAt(0).toUpperCase()}${key.slice(1)} sensitivity`);
      sections.push([`${label} methods`, taxonomy.sensitivity[key].methods]);
      sections.push([`${label} plots`, taxonomy.sensitivity[key].plots]);
    });
    node.innerHTML = sections.map(function (section) { return group(section[0], section[1]); }).join('');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render, { once: true });
  else render();
})(typeof window !== 'undefined' ? window : globalThis);
