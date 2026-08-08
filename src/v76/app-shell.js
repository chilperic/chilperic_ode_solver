(function initFokoV76Shell(root) {
  'use strict';

  function boundedPopoverGeometry(triggerLeft, requestedWidth, viewportWidth) {
    const gutter = 12;
    const width = Math.max(0, Math.min(requestedWidth, viewportWidth - gutter * 2));
    const maximumLeft = Math.max(gutter, viewportWidth - width - gutter);
    const left = Math.min(Math.max(gutter, triggerLeft), maximumLeft);
    return { width: Math.round(width), left: Math.round(left) };
  }

  if (typeof module === 'object' && module.exports) {
    module.exports = { boundedPopoverGeometry };
  }

  const doc = root.document;
  if (!doc) return;
  const shellScript = doc.currentScript;
  const scriptPath = shellScript?.getAttribute('src') || '';
  const ROOT_PREFIX = scriptPath.replace(/src\/v76\/app-shell\.js(?:\?.*)?$/i, '');

  function route(href) {
    if (!href || /^(?:https?:|mailto:|#)/i.test(href)) return href;
    return ROOT_PREFIX + href;
  }

  /* Authoritative subject/lab identity; plots keep semantic palettes. */
  const SUBJECTS = Object.freeze({
    platform: ['Scientific modeling', 'platform'],
    'model-engineering': ['Model engineering', 'model'],
    'dynamical-systems': ['Dynamical systems', 'dynamics'],
    'populations-evolution': ['Populations & evolution', 'populations'],
    'inference-uncertainty': ['Inference & uncertainty', 'inference'],
    'scientific-intelligence': ['Scientific intelligence', 'intelligence'],
    'mathematical-structure': ['Mathematical structure', 'structure'],
    resources: ['Evidence & resources', 'resources']
  });

  const LAB_IDENTITIES = Object.freeze({
    home: ['platform', 'Workspace'],
    studio: ['model-engineering', 'Model Studio'],
    workbench: ['model-engineering', 'Workbench'],
    ode: ['dynamical-systems', 'ODE Lab'],
    stochastic: ['dynamical-systems', 'Stochastic Lab'],
    steady: ['dynamical-systems', 'Steady-State Lab'],
    bifurcation: ['dynamical-systems', 'Bifurcation Lab'],
    agent: ['populations-evolution', 'Agent Lab'],
    'population-genetics': ['populations-evolution', 'Population Genetics'],
    evolution: ['populations-evolution', 'Evolution Lab'],
    sensitivity: ['inference-uncertainty', 'Sensitivity'],
    optimization: ['inference-uncertainty', 'Optimization'],
    fitting: ['inference-uncertainty', 'Curve Fitting'],
    statistics: ['inference-uncertainty', 'Statistics'],
    'advanced-methods': ['inference-uncertainty', 'Advanced Methods'],
    'ai-modeling': ['scientific-intelligence', 'AI Modeling'],
    sciml: ['scientific-intelligence', 'SciML'],
    ml: ['scientific-intelligence', 'Machine Learning'],
    linalg: ['mathematical-structure', 'Linear Algebra'],
    networks: ['mathematical-structure', 'Networks'],
    symbolic: ['mathematical-structure', 'Symbolic'],
    examples: ['resources', 'Model Atlas'],
    docs: ['resources', 'Documentation'],
    tutorial: ['resources', 'Modeling Guides'],
    trust: ['resources', 'Trust & Validation'],
    research: ['resources', 'Research'],
    creator: ['resources', 'Creator'],
    contact: ['resources', 'Contact'],
    acknowledgement: ['resources', 'Acknowledgements'],
    resources: ['resources', 'External Resource'],
    beauty: ['mathematical-structure', 'Mathematical Beauty']
  });

  const PAGE_LAB_ALIASES = Object.freeze({
    'index': 'home',
    'linear-algebra': 'linalg',
    'photosynthesis': 'research',
    'fatty-acid-metabolism': 'research',
    'tcell-proliferation': 'research',
    'software': 'research',
    'cv': 'creator'
  });

  function labFromHref(href) {
    if (!href || /^https?:/i.test(href)) return 'resources';
    const page = href.split('#')[0].split('?')[0].split('/').pop().replace(/\.html$/i, '') || 'home';
    return PAGE_LAB_ALIASES[page] || page;
  }

  function identityFor(lab) {
    const normalized = LAB_IDENTITIES[lab] ? lab : (PAGE_LAB_ALIASES[lab] || 'home');
    const [subject, labLabel] = LAB_IDENTITIES[normalized] || LAB_IDENTITIES.home;
    return { lab: normalized, labLabel, subject, subjectLabel: SUBJECTS[subject][0] };
  }

  function currentIdentity() {
    return identityFor(doc.body.dataset.lab || labFromHref(pathName()));
  }

  function identityAttributes(href) {
    const identity = identityFor(labFromHref(href));
    return ` data-lab-target="${identity.lab}" data-subject-target="${identity.subject}"`;
  }

  function adaptiveBrandMarkup() {
    const identity = currentIdentity();
    return `<span class="foko-brand-mark" aria-hidden="true"><svg viewBox="0 0 64 64" focusable="false">
      <path d="M32 4 57 17 32 30 7 17Z" class="foko-brand-observe-top"/>
      <path d="M12 18C18 14 23 16 28 13C33 9 36 14 41 11C46 8 51 13 55 15" class="foko-brand-manifold"/>
      <path d="M32 21 53 32 32 43 11 32Z" class="foko-brand-observe-mid"/>
      <path d="M18 32C23 28 28 28 32 30C36 28 41 28 46 32C41 36 36 36 32 34C28 36 23 36 18 32Z" class="foko-brand-inference"/>
      <path d="M32 36 50 46 32 56 14 46Z" class="foko-brand-observe-bottom"/>
      <path d="M20 43 38 53M26 40 44 50M20 49 38 39M26 52 44 42" class="foko-brand-lattice"/>
      <path d="M32 11V53" class="foko-brand-state-axis"/>
      <path d="M32 14 36 18 32 22 28 18ZM32 28 36 32 32 36 28 32ZM32 42 36 46 32 50 28 46Z" class="foko-brand-state"/>
    </svg></span><span class="foko-brand-copy"><span class="foko-brand-name">Foko <b>Lab</b></span><span class="foko-brand-context"><span>${identity.subjectLabel}</span><i></i><em>${identity.labLabel}</em></span></span>`;
  }

  const GROUPS = {
    experiment: {
      title: 'Run an experiment',
      note: 'Choose a computation compatible with your model.',
      sections: [
        {
          title: 'Continuous and stochastic dynamics',
          items: [
            ['∿', 'ODE simulation', 'Trajectories, sweeps and solver evidence.', 'ode.html?module=ode'],
            ['∴', 'Stochastic simulation', 'Seeded ensembles, events and uncertainty.', 'stochastic.html'],
            ['⇌', 'Steady state', 'Roots, admissibility and local stability.', 'steady.html'],
            ['⋔', 'Bifurcation', 'Branches, stability and vector fields.', 'bifurcation.html']
          ]
        },
        {
          title: 'Populations, space and evolution',
          items: [
            ['◎', 'Agent models', 'Rules, lattice dynamics and contextual 3D.', 'agent.html'],
            ['2N', 'Population genetics', 'Selection, drift, mutation and migration.', 'population-genetics.html'],
            ['⌁', 'Evolution landscapes', 'Fitness surfaces, paths and lineages.', 'evolution.html'],
            ['▦', 'Experiment workbench', 'Compare compatible runs and views.', 'workbench.html']
          ]
        }
      ]
    },
    analyze: {
      title: 'Analyze the active model',
      note: 'Methods remain attached to model inputs and provenance.',
      sections: [
        {
          title: 'Inference and explanation',
          items: [
            ['∂', 'Sensitivity', 'Local, Morris, Sobol and multi-output GSA.', 'sensitivity.html'],
            ['◇', 'Optimization and CMA-ES', 'Search, constraints and covariance evidence.', 'optimization.html'],
            ['ƒ', 'Parameter fitting', 'Residuals, profiles and identifiability.', 'fitting.html'],
            ['σ', 'Statistics', 'Data quality, inference and uncertainty.', 'statistics.html']
          ]
        },
        {
          title: 'Advanced and data-driven',
          items: [
            ['B', 'Bayesian and advanced', 'Posterior, design, PDE, SDE and continuation.', 'advanced-methods.html'],
            ['AI', 'AI modeling', 'Surrogates, active sampling and diagnostics.', 'ai-modeling.html'],
            ['∂x', 'SciML', 'Equation discovery and inverse modeling.', 'sciml.html'],
            ['μ', 'Machine learning', 'Validation, calibration, PCA and explanation.', 'ml.html']
          ]
        },
        {
          title: 'Mathematical structure',
          items: [
            ['A', 'Linear algebra', 'Solves, spectra, conditioning and PCA.', 'linear-algebra.html'],
            ['⟠', 'Networks', 'Graph structure, paths and resilience.', 'networks.html'],
            ['Σ', 'Symbolic analysis', 'Exact derivatives, Jacobians and export.', 'symbolic.html']
          ]
        }
      ]
    },
    project: {
      title: 'Project',
      note: 'Start from your system; templates are optional.',
      sections: [
        {
          title: 'Model project',
          items: [
            ['+', 'New model', 'Create an editable model from an empty project.', 'studio.html?new=1'],
            ['↗', 'Open Model Studio', 'Continue editing model and experiment settings.', 'studio.html'],
            ['▦', 'Start from template', 'Load a validated model as an editable project.', 'examples.html'],
            ['⇩', 'Import model', 'Open Model Studio and import TXT/ODE, JSON, a data-only dictionary, YAML, CSV or the validated SBML subset.', 'studio.html#import']
          ]
        }
      ]
    },
    profile: {
      title: 'Foko Lab',
      note: 'Documentation, trust and creator information.',
      sections: [
        {
          title: 'Help and provenance',
          items: [
            ['?', 'Documentation', 'Inputs, outputs, diagnostics and boundaries.', 'docs.html'],
            ['✓', 'Trust and validation', 'Capability matrix, tests and limitations.', 'trust.html'],
            ['⌁', 'Research', 'Scientific projects behind the platform.', 'research.html'],
            ['CF', 'Creator profile', 'Dr. Chilperic Armel Foko Kuate.', 'cv.html']
          ]
        },
        {
          title: 'Resources',
          items: [
            ['▣', 'Modeling guides', 'Failure-driven workflows for modelers.', 'tutorial.html'],
            ['∞', 'Mathematical beauty', 'Interactive mathematical structures.', 'beauty.html'],
            ['GH', 'Source repository', 'Inspect the public Foko Lab source.', 'https://github.com/chilperic/FokoLab']
          ]
        }
      ]
    }
  };

  const ACTIVE_FAMILIES = {
    studio: 'model',
    ode: 'experiment',
    stochastic: 'experiment',
    steady: 'experiment',
    bifurcation: 'experiment',
    agent: 'experiment',
    'population-genetics': 'experiment',
    evolution: 'experiment',
    workbench: 'evidence',
    sensitivity: 'analyze',
    optimization: 'analyze',
    fitting: 'analyze',
    statistics: 'analyze',
    'advanced-methods': 'analyze',
    'ai-modeling': 'analyze',
    sciml: 'analyze',
    ml: 'analyze',
    linalg: 'analyze',
    networks: 'analyze',
    symbolic: 'analyze',
    examples: 'atlas'
  };

  const RUN_IDS = [
    'runStudio', 'runBtn', 'solveSteady', 'runStochastic', 'runOptimization',
    'runAgent', 'runSensitivity', 'runFitting', 'runStatistics', 'runLinalg',
    'runNetworks', 'runML', 'runSymbolic', 'runAdvanced', 'runAIModeling',
    'runEvolution', 'runPopulationGenetics', 'runBifurcation', 'runWorkbench'
  ];

  const chevron = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 6 5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const icons = {
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.5 10.5 8.5-7 8.5 7V20h-6v-5h-5v5h-6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    model: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5m0 7h5m2-7h9v14h-9z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    experiment: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 19V5l13 7-13 7Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    evidence: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V9m6 10V5m6 14v-7m4 7H2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
  };

  let openTrigger = null;
  const popovers = new Map();

  function pathName() {
    return (root.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  }

  function isHome() {
    return pathName() === '' || pathName() === 'index.html';
  }

  function activeFamily() {
    if (isHome()) return 'home';
    return ACTIVE_FAMILIES[doc.body.dataset.lab] || (
      pathName() === 'examples.html' ? 'atlas' :
      pathName() === 'studio.html' ? 'model' :
      pathName() === 'workbench.html' ? 'evidence' : ''
    );
  }

  function itemMarkup(item) {
    const [icon, label, note, href] = item;
    const external = /^https?:/i.test(href);
    return `<a href="${route(href)}"${external ? ' target="_blank" rel="noopener"' : ''} role="menuitem"${identityAttributes(href)}><span class="v76-popover-icon">${icon}</span><span><b>${label}</b><small>${note}</small></span></a>`;
  }

  function popoverMarkup(key, group) {
    return `<section class="v76-popover" id="v76-${key}-menu" data-v76-popover="${key}" data-open="false" aria-label="${group.title}">
      <div class="v76-popover-head"><b>${group.title}</b><span>${group.note}</span></div>
      <div class="v76-popover-grid">${group.sections.map(section => `<section class="v76-popover-section" data-subject-target="${identityFor(labFromHref(section.items[0][3])).subject}"><h2>${section.title}</h2>${section.items.map(itemMarkup).join('')}</section>`).join('')}</div>
    </section>`;
  }

  function headerMarkup() {
    const active = activeFamily();
    return `
      <a class="v76-brand" href="${route('index.html')}" aria-label="Foko Lab home">
        ${adaptiveBrandMarkup()}
      </a>
      <nav class="v76-primary-nav" aria-label="Primary navigation">
        <a class="v76-nav-link" href="${route('index.html')}"${active === 'home' ? ' aria-current="page"' : ''}>Home</a>
        <a class="v76-nav-link" href="${route('studio.html')}"${active === 'model' ? ' aria-current="page"' : ''}>Model Studio</a>
        <button class="v76-nav-trigger" type="button" data-v76-trigger="experiment" aria-expanded="false" aria-controls="v76-experiment-menu"${active === 'experiment' ? ' data-active="true"' : ''}>Simulate ${chevron}</button>
        <button class="v76-nav-trigger" type="button" data-v76-trigger="analyze" aria-expanded="false" aria-controls="v76-analyze-menu"${active === 'analyze' ? ' data-active="true"' : ''}>Analyze ${chevron}</button>
        <a class="v76-nav-link" href="${route('examples.html')}"${active === 'atlas' ? ' aria-current="page"' : ''}>Atlas</a>
        <a class="v76-nav-link" href="${route('workbench.html')}"${active === 'evidence' ? ' aria-current="page"' : ''}>Evidence</a>
      </nav>
      <div class="v76-app-actions">
        <button class="v76-command" type="button" data-v76-command aria-label="Find a model or method"><span aria-hidden="true">⌘</span> Find</button>
        <button class="v76-run-action" type="button" data-v76-run>Run</button>
        <button class="v76-profile" type="button" data-v76-trigger="profile" aria-expanded="false" aria-label="Open creator, help and trust menu">
          <img src="${route('assets/profile-chilperic.webp')}" alt="Creator profile"/>
        </button>
        <button class="v76-mobile-trigger" type="button" data-v76-mobile-open aria-label="Open navigation">${icons.menu}</button>
      </div>`;
  }

  function mobileMarkup() {
    const navSections = [
      ['Model project', GROUPS.project.sections[0].items],
      ['Experiments', GROUPS.experiment.sections.flatMap(section => section.items)],
      ['Analysis', GROUPS.analyze.sections.flatMap(section => section.items)],
      ['Help and provenance', GROUPS.profile.sections.flatMap(section => section.items)]
    ];
    return `<section class="v76-mobile-sheet" data-v76-mobile-sheet data-open="false" aria-label="Foko Lab navigation" aria-hidden="true">
      <header class="v76-mobile-sheet-head"><a class="v76-brand" href="${route('index.html')}" aria-label="Foko Lab home">${adaptiveBrandMarkup()}</a><button class="v76-mobile-close" data-v76-mobile-close type="button" aria-label="Close navigation">×</button></header>
      <div class="v76-mobile-sheet-body">
        <a class="v76-mobile-home" href="${route('index.html')}">${icons.home}<span>Home</span></a>
        <div class="v76-mobile-project-actions"><a href="${route('studio.html?new=1')}">New model</a><a href="${route('studio.html')}">Open project</a></div>
        ${navSections.map(([title, items]) => `<section class="v76-mobile-nav-section"><h2>${title}</h2><nav>${items.map(item => `<a href="${route(item[3])}"${identityAttributes(item[3])}>${item[1]}</a>`).join('')}</nav></section>`).join('')}
      </div>
    </section>
    <nav class="v76-bottom-nav" aria-label="Mobile primary navigation">
      <a href="${route('index.html')}"${activeFamily() === 'home' ? ' aria-current="page"' : ''}>${icons.home}<span>Home</span></a>
      <a href="${route('studio.html')}">${icons.model}<span>Model</span></a>
      <button type="button" data-v76-mobile-open>${icons.experiment}<span>Experiment</span></button>
      <button class="v76-bottom-run" type="button" data-v76-run>${icons.experiment}<span>Run</span></button>
      <a href="${route('workbench.html')}">${icons.evidence}<span>Evidence</span></a>
    </nav>`;
  }

  function commandMarkup() {
    const entries = Object.values(GROUPS).flatMap(group => group.sections.flatMap(section => section.items));
    const unique = new Map(entries.map(item => [item[3], item]));
    return `<section class="v76-command-dialog" data-v76-command-dialog hidden aria-label="Find models and methods">
      <button class="v76-command-backdrop" type="button" data-v76-command-close tabindex="-1" aria-label="Close search"></button>
      <div class="v76-command-panel" role="dialog" aria-modal="true" aria-labelledby="v76CommandTitle">
        <div class="v76-command-search"><span aria-hidden="true">⌕</span><label class="sr-only" for="v76CommandInput" id="v76CommandTitle">Find a model or method</label><input id="v76CommandInput" data-v76-command-input type="search" placeholder="Find a model, experiment or analysis…" autocomplete="off"/><button class="v76-command-close-button" type="button" data-v76-command-close aria-label="Close search">Esc ×</button></div>
        <div class="v76-command-results" data-v76-command-results>${Array.from(unique.values()).map(item => `<a href="${route(item[3])}" data-command-text="${(item[1] + ' ' + item[2]).toLowerCase()}"${identityAttributes(item[3])}><span class="v76-popover-icon">${item[0]}</span><span><b>${item[1]}</b><small>${item[2]}</small></span></a>`).join('')}</div>
      </div>
    </section>`;
  }

  function closePopovers(options) {
    popovers.forEach(popover => {
      popover.dataset.open = 'false';
      popover.setAttribute('aria-hidden', 'true');
    });
    doc.querySelectorAll('[data-v76-trigger]').forEach(trigger => trigger.setAttribute('aria-expanded', 'false'));
    if (options && options.restoreFocus && openTrigger) openTrigger.focus();
    openTrigger = null;
  }

  function positionPopover(trigger, popover) {
    const rect = trigger.getBoundingClientRect();
    const viewportWidth = doc.documentElement.clientWidth;
    const geometry = boundedPopoverGeometry(rect.left, keyWidth(popover), viewportWidth);
    /*
     * The positioning width and rendered width must be identical. Previously
     * profile/project menus were positioned as 430 px panels while the shared
     * CSS still rendered them at 620 px, which necessarily overflowed beside
     * right-edge triggers.
     */
    popover.style.width = `${geometry.width}px`;
    popover.style.left = `${geometry.left}px`;
    popover.style.top = `${Math.round(rect.bottom + 8)}px`;
  }

  function keyWidth(popover) {
    return popover.dataset.v76Popover === 'profile' || popover.dataset.v76Popover === 'project' ? 430 : 620;
  }

  function togglePopover(trigger) {
    const key = trigger.dataset.v76Trigger;
    const popover = popovers.get(key);
    if (!popover) return;
    const willOpen = popover.dataset.open !== 'true';
    closePopovers();
    if (!willOpen) return;
    openTrigger = trigger;
    positionPopover(trigger, popover);
    popover.dataset.open = 'true';
    popover.setAttribute('aria-hidden', 'false');
    trigger.setAttribute('aria-expanded', 'true');
  }

  function visibleRunTarget() {
    for (const id of RUN_IDS) {
      const node = doc.getElementById(id);
      if (!node || node.disabled || node.hidden) continue;
      const style = root.getComputedStyle(node);
      if (style.display !== 'none' && style.visibility !== 'hidden') return node;
    }
    return doc.querySelector('button[data-run]:not([disabled]), button[id^="run"]:not([disabled])');
  }

  function runActiveModel() {
    const target = visibleRunTarget();
    if (target) {
      target.scrollIntoView({ block: 'center', behavior: root.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      target.click();
      return;
    }
    root.location.href = route('studio.html');
  }

  function setMobile(open) {
    const sheet = doc.querySelector('[data-v76-mobile-sheet]');
    if (!sheet) return;
    sheet.dataset.open = open ? 'true' : 'false';
    sheet.setAttribute('aria-hidden', open ? 'false' : 'true');
    doc.body.dataset.v76MenuOpen = open ? 'true' : 'false';
    if (open) sheet.querySelector('[data-v76-mobile-close]').focus();
  }

  function setCommand(open) {
    const dialog = doc.querySelector('[data-v76-command-dialog]');
    if (!dialog) return;
    dialog.hidden = !open;
    dialog.style.display = open ? '' : 'none';
    doc.body.dataset.v76MenuOpen = open ? 'true' : 'false';
    if (open) {
      const input = dialog.querySelector('[data-v76-command-input]');
      input.value = '';
      dialog.querySelectorAll('[data-command-text]').forEach(node => { node.hidden = false; });
      root.setTimeout(() => input.focus(), 0);
    }
  }

  function bind() {
    doc.querySelectorAll('[data-v76-trigger]').forEach(trigger => {
      trigger.addEventListener('click', event => {
        event.stopPropagation();
        togglePopover(trigger);
      });
    });
    doc.querySelectorAll('[data-v76-run]').forEach(button => button.addEventListener('click', runActiveModel));
    doc.querySelectorAll('[data-v76-mobile-open]').forEach(button => button.addEventListener('click', () => setMobile(true)));
    doc.querySelector('[data-v76-mobile-close]')?.addEventListener('click', () => setMobile(false));
    doc.querySelector('[data-v76-command]')?.addEventListener('click', () => setCommand(true));
    doc.querySelectorAll('[data-v76-command-close]').forEach(button => button.addEventListener('click', () => setCommand(false)));
    const commandInput = doc.querySelector('[data-v76-command-input]');
    commandInput?.addEventListener('input', () => {
      const query = commandInput.value.trim().toLowerCase();
      doc.querySelectorAll('[data-command-text]').forEach(node => {
        node.hidden = query && !node.dataset.commandText.includes(query);
      });
    });
    doc.addEventListener('click', event => {
      if (!event.target.closest('.v76-popover') && !event.target.closest('[data-v76-trigger]')) closePopovers();
    });
    doc.addEventListener('keydown', event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommand(true);
      }
      if (event.key === 'Escape') {
        closePopovers({ restoreFocus: true });
        setMobile(false);
        setCommand(false);
      }
    });
    root.addEventListener('resize', () => {
      if (openTrigger) {
        const popover = popovers.get(openTrigger.dataset.v76Trigger);
        if (popover) positionPopover(openTrigger, popover);
      }
      if (root.innerWidth > 780) setMobile(false);
    }, { passive: true });
    root.addEventListener('scroll', () => {
      if (openTrigger) {
        const popover = popovers.get(openTrigger.dataset.v76Trigger);
        if (popover) positionPopover(openTrigger, popover);
      }
    }, { passive: true });
  }

  function installWorkspaceSizing() {
    if (doc.body.dataset.v72Shell !== 'true') return;
    const layout = doc.querySelector('main.layout');
    const controls = layout?.querySelector('.work-panel.controls, .controls-panel');
    const workspace = layout?.querySelector('.v72-workspace, .workspace-area, .workspace');
    if (!layout || !controls || !workspace || layout.querySelector('.v76-workspace-splitter')) return;
    const lab = doc.body.dataset.lab || pathName().replace(/\.html$/, '') || 'model';
    const key = `fokolab:v77:input-width:${lab}`;
    const minimum = 268, maximum = 560, defaultWidth = lab === 'studio' ? 340 : 318;
    controls.id ||= `v76-${lab}-model-panel`;
    workspace.id ||= `v76-${lab}-results-panel`;

    const splitter = doc.createElement('div');
    splitter.className = 'v76-workspace-splitter';
    splitter.tabIndex = 0;
    splitter.setAttribute('role', 'separator');
    splitter.setAttribute('aria-orientation', 'vertical');
    splitter.setAttribute('aria-label', 'Resize model input and plotting panels');
    splitter.setAttribute('aria-controls', `${controls.id} ${workspace.id}`);
    splitter.innerHTML = '<span aria-hidden="true"></span>';
    layout.insertBefore(splitter, workspace);

    const toolbar = doc.createElement('div');
    toolbar.className = 'v76-panel-size-controls';
    toolbar.setAttribute('role', 'group');
    toolbar.setAttribute('aria-label', 'Model panel width');
    toolbar.innerHTML = '<span>Model panel</span><button type="button" data-panel-width="min" aria-label="Use compact model panel">−</button><button type="button" data-panel-width="reset">Reset</button><button type="button" data-panel-width="max" aria-label="Use wide model panel">＋</button>';
    controls.prepend(toolbar);

    function clamp(value) { return Math.max(minimum, Math.min(maximum, Math.round(Number(value) || defaultWidth))); }
    function notifyPlots() {
      root.dispatchEvent(new Event('resize'));
      doc.querySelectorAll('.js-plotly-plot').forEach(node => {
        if (root.FokoPlotLifecycle) root.FokoPlotLifecycle.resize(node);
        else if (root.Plotly?.Plots) { try { root.Plotly.Plots.resize(node); } catch (_) { /* geometry can still be settling */ } }
      });
    }
    let width = clamp(localStorage.getItem(key) || defaultWidth), frame = 0;
    function apply(value, persist) {
      width = clamp(value);
      layout.style.setProperty('--v76-input-width', `${width}px`);
      splitter.setAttribute('aria-valuemin', String(minimum));
      splitter.setAttribute('aria-valuemax', String(maximum));
      splitter.setAttribute('aria-valuenow', String(width));
      splitter.setAttribute('aria-valuetext', `${width} pixels`);
      toolbar.querySelector('[data-panel-width="min"]').setAttribute('aria-pressed', String(width === minimum));
      toolbar.querySelector('[data-panel-width="reset"]').setAttribute('aria-pressed', String(width === defaultWidth));
      toolbar.querySelector('[data-panel-width="max"]').setAttribute('aria-pressed', String(width === maximum));
      if (persist) localStorage.setItem(key, String(width));
      if (frame) root.cancelAnimationFrame(frame);
      frame = root.requestAnimationFrame(notifyPlots);
    }
    apply(width, false);

    let drag = null;
    splitter.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      drag = { x: event.clientX, width };
      splitter.setPointerCapture?.(event.pointerId);
      splitter.dataset.dragging = 'true';
      event.preventDefault();
    });
    splitter.addEventListener('pointermove', event => {
      if (!drag) return;
      apply(drag.width + event.clientX - drag.x, false);
    });
    function finishDrag() {
      if (!drag) return;
      drag = null;
      splitter.dataset.dragging = 'false';
      apply(width, true);
    }
    splitter.addEventListener('pointerup', finishDrag);
    splitter.addEventListener('pointercancel', finishDrag);
    splitter.addEventListener('dblclick', () => apply(defaultWidth, true));
    splitter.addEventListener('keydown', event => {
      const step = event.shiftKey ? 48 : 16;
      if (event.key === 'ArrowLeft') apply(width - step, true);
      else if (event.key === 'ArrowRight') apply(width + step, true);
      else if (event.key === 'Home') apply(minimum, true);
      else if (event.key === 'End') apply(maximum, true);
      else if (event.key === 'Enter') apply(defaultWidth, true);
      else return;
      event.preventDefault();
    });
    toolbar.addEventListener('click', event => {
      const button = event.target.closest('[data-panel-width]');
      if (!button) return;
      const target = button.dataset.panelWidth;
      apply(target === 'min' ? minimum : target === 'max' ? maximum : defaultWidth, true);
    });
    root.FokoWorkspaceSizing = Object.freeze({ get width() { return width; }, set: value => apply(value, true), reset: () => apply(defaultWidth, true) });
  }

  function install() {
    if (doc.body.dataset.v76Ready === 'true') return;
    doc.body.dataset.v76Ready = 'true';
    doc.body.dataset.v76Shell = 'true';
    const identity = currentIdentity();
    if (!doc.body.dataset.lab) doc.body.dataset.lab = identity.lab;
    doc.body.dataset.subject = identity.subject;
    doc.body.dataset.identityLab = identity.lab;
    doc.documentElement.dataset.theme = 'woven-state';

    let header = doc.querySelector('header.topbar, header.public-topbar');
    if (!header) {
      header = doc.createElement('header');
      doc.body.prepend(header);
    }
    header.className = 'topbar v76-appbar';
    header.dataset.v76Appbar = 'true';
    header.innerHTML = headerMarkup();

    if (doc.body.dataset.lab === 'studio') {
      const controls = doc.querySelector('.studio-controls');
      const catalogue = doc.getElementById('catalogueBlock');
      if (controls && catalogue) controls.appendChild(catalogue);
      const catalogueTitle = catalogue?.querySelector('h2');
      if (catalogueTitle) catalogueTitle.textContent = 'Validated model templates';
      const loadTemplate = doc.getElementById('loadStudioPreset');
      if (loadTemplate) loadTemplate.textContent = 'Use as editable model';
    }

    const portal = doc.createElement('div');
    portal.dataset.v76Portal = 'true';
    portal.innerHTML = Object.entries(GROUPS).map(([key, group]) => popoverMarkup(key, group)).join('') + mobileMarkup() + commandMarkup();
    doc.body.appendChild(portal);
    portal.querySelectorAll('[data-v76-popover]').forEach(node => {
      node.setAttribute('aria-hidden', 'true');
      popovers.set(node.dataset.v76Popover, node);
    });

    bind();
    installWorkspaceSizing();
    doc.dispatchEvent(new CustomEvent('foko:v76-shell-ready'));
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})(typeof window !== 'undefined' ? window : globalThis);
