(function (root) {
  'use strict';
  const Core = root.FokoPopulationGeneticsCore;
  const PRESETS = root.FokoPopulationGeneticsPresets || {};
  const $ = function (id) { return document.getElementById(id); };
  if (!Core) return;
  let result = null;
  let currentExample = Object.keys(PRESETS)[0] || '';

  const plotOptions = [
    { id: 'frequency', label: 'Allele-frequency ensemble' },
    { id: 'deme-means', label: 'Deme-specific frequencies' },
    { id: 'sample-paths', label: 'Retained replicate paths' },
    { id: 'phase', label: 'Deme phase trajectories' },
    { id: 'diversity', label: 'Diversity and differentiation' },
    { id: 'divergence', label: 'Deme divergence through time' },
    { id: 'absorption', label: 'Fixation, loss and polymorphism' },
    { id: 'absorption-time', label: 'Fixation and loss times' },
    { id: 'final', label: 'Final frequency distribution' },
    { id: 'final-demes', label: 'Final deme relationship' }
  ];
  const evidence = {
    frequency: 'Mean, median, and pointwise 95% empirical interval across both demes and all finite replicates. It is not a confidence or credible interval.',
    'deme-means': 'Deme-specific ensemble means and pointwise 95% empirical intervals expose migration-driven homogenization and asymmetric starting conditions.',
    'sample-paths': 'A fixed subset of at most 12 seeded replicates is retained for visualization. It is not selected for representativeness.',
    phase: 'Each retained path is projected into the p₁–p₂ plane. Movement toward the diagonal indicates homogenization, while drift can scatter paths.',
    diversity: 'Expected heterozygosity is 2p(1−p). FST is the mean elementary two-deme frequency-variance ratio and is not sampling corrected.',
    divergence: 'Mean |p₁−p₂| and elementary FST summarize different notions of differentiation and should not be interpreted as interchangeable estimators.',
    absorption: 'Fixation and loss require both demes to be exactly 1 or 0. Mutation can make these states non-absorbing.',
    'absorption-time': 'Only replicates reaching joint fixation or loss inside the simulated horizon contribute a time. Right-censored replicates are not shown as events.',
    final: 'Each replicate contributes both final deme frequencies. Dependence within a replicate remains present.',
    'final-demes': 'One point per replicate compares the two final deme frequencies. The diagonal is equality, not a fitted relationship.'
  };

  function readConfig() {
    return {
      populationSize: $('pgPopulation').value,
      generations: $('pgGenerations').value,
      replicates: $('pgReplicates').value,
      initialP1: $('pgInitialP1').value,
      initialP2: $('pgInitialP2').value,
      selection: $('pgSelection').value,
      dominance: $('pgDominance').value,
      mutationForward: $('pgMutationForward').value,
      mutationReverse: $('pgMutationReverse').value,
      migration: $('pgMigration').value,
      seed: $('pgSeed').value
    };
  }

  function applyConfig(config) {
    const mapping = {
      pgPopulation: 'populationSize', pgGenerations: 'generations', pgReplicates: 'replicates',
      pgInitialP1: 'initialP1', pgInitialP2: 'initialP2', pgSelection: 'selection',
      pgDominance: 'dominance', pgMutationForward: 'mutationForward',
      pgMutationReverse: 'mutationReverse', pgMigration: 'migration', pgSeed: 'seed'
    };
    Object.keys(mapping).forEach(function (id) {
      if (config[mapping[id]] != null) $(id).value = config[mapping[id]];
    });
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character];
    });
  }

  function renderExampleLibrary() {
    const keys = Object.keys(PRESETS);
    const select = $('pgExampleSelect');
    if (!select) return;
    select.innerHTML = keys.map(function (key) { return '<option value="' + escapeHtml(key) + '">' + escapeHtml(PRESETS[key].title) + '</option>'; }).join('');
    if (PRESETS[currentExample]) select.value = currentExample;
    const families = Array.from(new Set(keys.map(function (key) { return PRESETS[key].family; }))).sort();
    const family = $('pgFamilyFilter');
    const previousFamily = family.value || 'all';
    family.innerHTML = '<option value="all">All families</option>' + families.map(function (name) { return '<option value="' + escapeHtml(name) + '">' + escapeHtml(name) + '</option>'; }).join('');
    family.value = families.includes(previousFamily) ? previousFamily : 'all';
    const query = String($('pgExampleSearch').value || '').trim().toLowerCase();
    const filtered = keys.filter(function (key) {
      const preset = PRESETS[key];
      const haystack = [preset.title, preset.family, preset.summary, preset.scientificNote].join(' ').toLowerCase();
      return (family.value === 'all' || preset.family === family.value) && (!query || haystack.includes(query));
    });
    $('pgExampleCount').textContent = filtered.length + ' of ' + keys.length + ' examples';
    $('pgExampleDeck').innerHTML = filtered.length ? filtered.map(function (key) {
      const preset = PRESETS[key];
      return '<button class="model-card ' + (key === currentExample ? 'active' : '') + '" data-pg-example="' + escapeHtml(key) + '" type="button"><b>' + escapeHtml(preset.title) + '</b><small>' + escapeHtml(preset.family) + '</small><span class="preset-action">Load &amp; run</span></button>';
    }).join('') : '<p class="field-help">No population-genetics example matches this filter.</p>';
    const selected = PRESETS[currentExample];
    $('pgExampleSummary').textContent = selected ? selected.summary : 'Custom configuration';
    $('pgExampleNote').textContent = selected ? selected.scientificNote : '';
  }

  function loadExample(key, updateUrl, shouldRun) {
    if (!PRESETS[key]) key = Object.keys(PRESETS)[0];
    if (!key || !PRESETS[key]) return;
    currentExample = key;
    applyConfig(PRESETS[key].config);
    if (updateUrl) history.replaceState(null, '', '?example=' + encodeURIComponent(key));
    renderExampleLibrary();
    setStatus('Loaded “' + PRESETS[key].title + '”.', false);
    if (shouldRun) run();
  }

  function setStatus(message, bad) {
    $('pgStatus').textContent = message;
    $('pgStatus').classList.toggle('bad', Boolean(bad));
  }

  function layout(title, x, y) {
    return {
      title: title,
      xaxis: { title: x }, yaxis: { title: y },
      margin: { l: 62, r: 24, t: 28, b: 62 },
      paper_bgcolor: '#fff', plot_bgcolor: '#fff', hovermode: 'x unified'
    };
  }

  function tracesFor(kind) {
    const rows = result.history;
    const x = rows.map(function (row) { return row.generation; });
    if (kind === 'frequency') return {
      traces: [
        { x: x, y: rows.map(function (r) { return r.q025; }), name: '2.5%', mode: 'lines', line: { width: 0 }, hoverinfo: 'skip', showlegend: false },
        { x: x, y: rows.map(function (r) { return r.q975; }), name: 'Pointwise 95% interval', mode: 'lines', line: { width: 0 }, fill: 'tonexty', fillcolor: 'rgba(0,139,146,.16)' },
        { x: x, y: rows.map(function (r) { return r.meanFrequency; }), name: 'Mean frequency', mode: 'lines', line: { color: '#008b92', width: 3 } },
        { x: x, y: rows.map(function (r) { return r.median; }), name: 'Median frequency', mode: 'lines', line: { color: '#7c3aed', width: 2, dash: 'dot' } }
      ], layout: Object.assign(layout('Allele-frequency ensemble', 'Generation', 'Allele A frequency'), { yaxis: { title: 'Allele A frequency', range: [0, 1] } })
    };
    if (kind === 'deme-means') return {
      traces: [
        { x: x, y: rows.map(function (r) { return r.deme1Q025; }), mode: 'lines', line: { width: 0 }, showlegend: false, hoverinfo: 'skip' },
        { x: x, y: rows.map(function (r) { return r.deme1Q975; }), mode: 'lines', line: { width: 0 }, fill: 'tonexty', fillcolor: 'rgba(0,139,146,.12)', name: 'Deme 1 95% interval' },
        { x: x, y: rows.map(function (r) { return r.meanP1; }), mode: 'lines', line: { color: '#008b92', width: 3 }, name: 'Deme 1 mean' },
        { x: x, y: rows.map(function (r) { return r.deme2Q025; }), mode: 'lines', line: { width: 0 }, showlegend: false, hoverinfo: 'skip' },
        { x: x, y: rows.map(function (r) { return r.deme2Q975; }), mode: 'lines', line: { width: 0 }, fill: 'tonexty', fillcolor: 'rgba(124,58,237,.10)', name: 'Deme 2 95% interval' },
        { x: x, y: rows.map(function (r) { return r.meanP2; }), mode: 'lines', line: { color: '#7c3aed', width: 3 }, name: 'Deme 2 mean' }
      ], layout: Object.assign(layout('Deme-specific allele frequencies', 'Generation', 'Allele A frequency'), { yaxis: { title: 'Allele A frequency', range: [0, 1] } })
    };
    if (kind === 'sample-paths') return {
      traces: result.sampleTrajectories.reduce(function (all, path) {
        all.push({ x: x, y: path.p1, mode: 'lines', line: { width: 1 }, opacity: .55, name: 'r' + path.replicate + ' deme 1', legendgroup: 'r' + path.replicate, showlegend: path.replicate <= 3 });
        all.push({ x: x, y: path.p2, mode: 'lines', line: { width: 1, dash: 'dot' }, opacity: .55, name: 'r' + path.replicate + ' deme 2', legendgroup: 'r' + path.replicate, showlegend: path.replicate <= 3 });
        return all;
      }, []), layout: Object.assign(layout('Retained seeded replicate paths', 'Generation', 'Allele A frequency'), { yaxis: { title: 'Allele A frequency', range: [0, 1] } })
    };
    if (kind === 'phase') return {
      traces: result.sampleTrajectories.map(function (path) { return { x: path.p1, y: path.p2, mode: 'lines+markers', marker: { size: 3 }, line: { width: 1 }, opacity: .58, name: 'replicate ' + path.replicate, showlegend: path.replicate <= 5 }; }).concat([{ x: [0, 1], y: [0, 1], mode: 'lines', line: { dash: 'dash', color: '#64748b' }, name: 'equal deme frequency' }]),
      layout: Object.assign(layout('Deme-frequency phase trajectories', 'Deme 1 frequency', 'Deme 2 frequency'), { xaxis: { title: 'Deme 1 frequency', range: [0, 1] }, yaxis: { title: 'Deme 2 frequency', range: [0, 1], scaleanchor: 'x' }, hovermode: 'closest' })
    };
    if (kind === 'diversity') return {
      traces: [
        { x: x, y: rows.map(function (r) { return r.heterozygosity; }), name: 'Expected heterozygosity', mode: 'lines', line: { color: '#008b92', width: 3 } },
        { x: x, y: rows.map(function (r) { return r.fst; }), name: 'Elementary FST', mode: 'lines', line: { color: '#d97706', width: 2 } }
      ], layout: Object.assign(layout('Diversity and differentiation', 'Generation', 'Statistic'), { yaxis: { title: 'Statistic', rangemode: 'tozero' } })
    };
    if (kind === 'divergence') return {
      traces: [
        { x: x, y: rows.map(function (r) { return r.meanAbsoluteDifference; }), name: 'Mean |p₁−p₂|', mode: 'lines', line: { color: '#315f9f', width: 3 } },
        { x: x, y: rows.map(function (r) { return r.fst; }), name: 'Elementary FST', mode: 'lines', line: { color: '#d97706', width: 2 } }
      ], layout: Object.assign(layout('Deme divergence through time', 'Generation', 'Differentiation statistic'), { yaxis: { title: 'Differentiation statistic', rangemode: 'tozero' } })
    };
    if (kind === 'absorption') return {
      traces: [
        { x: x, y: rows.map(function (r) { return r.fixedFraction; }), name: 'Fixed in both demes', mode: 'lines', line: { color: '#047857', width: 2 } },
        { x: x, y: rows.map(function (r) { return r.lostFraction; }), name: 'Lost in both demes', mode: 'lines', line: { color: '#b42318', width: 2 } },
        { x: x, y: rows.map(function (r) { return r.polymorphicFraction; }), name: 'Other states', mode: 'lines', line: { color: '#315f9f', width: 2 } }
      ], layout: Object.assign(layout('Finite-ensemble state fractions', 'Generation', 'Fraction of replicates'), { yaxis: { title: 'Fraction of replicates', range: [0, 1] } })
    };
    if (kind === 'absorption-time') {
      const fixationTimes = result.absorption.map(function (row) { return row.fixationGeneration; }).filter(function (value) { return value != null; });
      const lossTimes = result.absorption.map(function (row) { return row.lossGeneration; }).filter(function (value) { return value != null; });
      return { traces: [
        { x: fixationTimes, type: 'histogram', opacity: .72, name: 'Joint fixation time', marker: { color: '#047857' } },
        { x: lossTimes, type: 'histogram', opacity: .72, name: 'Joint loss time', marker: { color: '#b42318' } }
      ], layout: Object.assign(layout('Observed absorption times', 'Generation', 'Replicate events'), { barmode: 'overlay' }) };
    }
    if (kind === 'final-demes') return {
      traces: [{ x: result.finalStates.map(function (state) { return state[0]; }), y: result.finalStates.map(function (state) { return state[1]; }), mode: 'markers', type: 'scatter', marker: { size: 7, opacity: .55, color: '#008b92' }, name: 'replicate endpoint' }, { x: [0, 1], y: [0, 1], mode: 'lines', line: { dash: 'dash', color: '#64748b' }, name: 'p₁ = p₂' }],
      layout: Object.assign(layout('Final deme-frequency relationship', 'Deme 1 frequency', 'Deme 2 frequency'), { xaxis: { title: 'Deme 1 frequency', range: [0, 1] }, yaxis: { title: 'Deme 2 frequency', range: [0, 1], scaleanchor: 'x' }, hovermode: 'closest' })
    };
    const values = result.finalStates.reduce(function (all, state) { return all.concat(state); }, []);
    return {
      traces: [{ x: values, type: 'histogram', name: 'Final deme frequencies', nbinsx: 25, marker: { color: '#008b92' } }],
      layout: Object.assign(layout('Final allele-frequency distribution', 'Allele A frequency', 'Deme count'), { bargap: 0.05, xaxis: { title: 'Allele A frequency', range: [0, 1] } })
    };
  }

  function renderSide(side) {
    const select = $(side + 'PgPlotType');
    const host = $(side + 'PgPlot');
    const choice = plotOptions.find(function (option) { return option.id === select.value; }) || plotOptions[0];
    $(side + 'PgPlotTitle').textContent = choice.label;
    $(side + 'PgEvidence').textContent = evidence[choice.id];
    const view = tracesFor(choice.id);
    const renderer = root.FokoPlotLifecycle && root.FokoPlotLifecycle.render;
    if (renderer) renderer(host, view.traces, view.layout, { responsive: true, displaylogo: false });
    else host.replaceChildren(Object.assign(document.createElement('div'), { className: 'diagnostics empty', textContent: 'Shared plot renderer is unavailable.' }));
  }

  function render() {
    const final = result.history[result.history.length - 1];
    $('pgTopStatus').textContent = 'Computed';
    $('pgRuntime').textContent = result.runtimeMs.toFixed(1) + ' ms';
    $('pgBudget').textContent = result.config.bernoulliDraws.toLocaleString() + ' draws';
    $('pgMean').textContent = final.meanFrequency.toFixed(4);
    $('pgHeterozygosity').textContent = final.heterozygosity.toFixed(4);
    $('pgFst').textContent = final.fst.toFixed(4);
    $('pgFixed').textContent = (100 * final.fixedFraction).toFixed(1) + '%';
    $('pgLost').textContent = (100 * final.lostFraction).toFixed(1) + '%';
    $('pgResultKind').textContent = result.config.replicates + ' seeded replicates · two demes';
    $('pgDiagnostics').classList.remove('empty');
    $('pgDiagnostics').textContent = result.methodEvidence + '\n\n' + result.limitations.map(function (item) { return '• ' + item; }).join('\n');
    $('provenanceStatus').textContent = 'Computed';
    $('provenanceMethod').textContent = 'Two-deme Wright–Fisher ensemble';
    $('provenanceReproducibility').textContent = 'Seed ' + result.config.seed + ' · exact drift draws';
    $('provenanceWarning').textContent = 'Finite-ensemble browser evidence; no demographic or evolutionary-history inference is claimed.';
    renderSide('left');
    renderSide('right');
  }

  function run() {
    setStatus('Computing exact-drift ensemble…', false);
    $('pgProgress').style.width = '35%';
    root.requestAnimationFrame(function () {
      try {
        result = Core.simulate(readConfig());
        render();
        $('pgProgress').style.width = '100%';
        setStatus('Computed ' + result.config.replicates + ' seeded replicates.', false);
      } catch (error) {
        $('pgProgress').style.width = '0';
        $('pgTopStatus').textContent = 'Input error';
        setStatus(error.message || String(error), true);
      }
    });
  }

  function download(name, type, text) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([text], { type: type }));
    link.download = name;
    link.click();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 0);
  }

  function init() {
    plotOptions.forEach(function (option) {
      ['leftPgPlotType', 'rightPgPlotType'].forEach(function (id) {
        const node = document.createElement('option'); node.value = option.id; node.textContent = option.label; $(id).appendChild(node);
      });
    });
    $('leftPgPlotType').value = 'frequency';
    $('rightPgPlotType').value = 'diversity';
    $('leftPgPlotType').addEventListener('change', function () { if (result) renderSide('left'); });
    $('rightPgPlotType').addEventListener('change', function () { if (result) renderSide('right'); });
    $('runPopulationGenetics').addEventListener('click', run);
    $('resetPopulationGenetics').addEventListener('click', function () { loadExample(Object.keys(PRESETS)[0], true, false); setStatus('Neutral-drift defaults restored. Run the simulation.', false); });
    $('loadPgExample').addEventListener('click', function () { loadExample($('pgExampleSelect').value, true, true); });
    $('pgExampleSelect').addEventListener('change', function () {
      currentExample = $('pgExampleSelect').value;
      const preset = PRESETS[currentExample];
      $('pgExampleSummary').textContent = preset.summary;
      $('pgExampleNote').textContent = preset.scientificNote;
      renderExampleLibrary();
    });
    $('pgExampleSearch').addEventListener('input', renderExampleLibrary);
    $('pgFamilyFilter').addEventListener('change', renderExampleLibrary);
    $('pgExampleDeck').addEventListener('click', function (event) {
      const button = event.target.closest('[data-pg-example]');
      if (button) loadExample(button.dataset.pgExample, true, true);
    });
    $('savePgSession').addEventListener('click', function () { localStorage.setItem('fokolab:population-genetics', JSON.stringify(readConfig())); setStatus('Configuration saved locally.', false); });
    $('restorePgSession').addEventListener('click', function () { const raw = localStorage.getItem('fokolab:population-genetics'); if (raw) applyConfig(JSON.parse(raw)); setStatus(raw ? 'Configuration restored; rerun to compute.' : 'No saved configuration found.', !raw); });
    $('exportPgJson').addEventListener('click', function () { if (result) download('population-genetics-result.json', 'application/json', JSON.stringify(result, null, 2)); });
    $('exportPgCsv').addEventListener('click', function () {
      if (!result) return;
      const keys = Object.keys(result.history[0]);
      download('population-genetics-history.csv', 'text/csv', keys.join(',') + '\n' + result.history.map(function (row) { return keys.map(function (key) { return row[key]; }).join(','); }).join('\n'));
    });
    document.querySelectorAll('[data-layout-mode]').forEach(function (button) {
      button.addEventListener('click', function () {
        $('plotGrid').dataset.layout = button.dataset.layoutMode;
        document.querySelectorAll('[data-layout-mode]').forEach(function (item) { item.classList.toggle('active', item === button); });
        root.dispatchEvent(new Event('resize'));
      });
    });
    document.querySelectorAll('[data-focus-side]').forEach(function (button) {
      if (!button.classList.contains('focus-card')) return;
      button.addEventListener('click', function () {
        $('plotGrid').dataset.focusSide = button.dataset.focusSide;
        $('plotGrid').dataset.layout = 'focus';
        document.querySelectorAll('[data-layout-mode]').forEach(function (item) { item.classList.toggle('active', item.dataset.layoutMode === 'focus'); });
        root.dispatchEvent(new Event('resize'));
      });
    });
    document.querySelectorAll('.side-nav [data-jump]').forEach(function (button) {
      button.addEventListener('click', function () {
        const target = document.querySelector(button.dataset.jump);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.querySelectorAll('.side-nav .nav-item').forEach(function (item) { item.classList.toggle('active', item === button); });
      });
    });
    const requested = new URLSearchParams(location.search).get('example');
    loadExample(PRESETS[requested] ? requested : currentExample, false, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}(typeof window !== 'undefined' ? window : globalThis));
