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
    home: ['platform', 'Overview'],
    'plant-growth': ['model-engineering', 'Plant growth'],
    'leaf-physiology': ['model-engineering', 'Leaf physiology'],
    adaptation: ['populations-evolution', 'Seasonal adaptation'],
    lipids: ['model-engineering', 'Fatty acids & lipids'],
    tcell: ['populations-evolution', 'T-cell populations'],
    randomness: ['dynamical-systems', 'Randomness'],
    branching: ['populations-evolution', 'Branching processes'],
    diffusion: ['dynamical-systems', 'Spatial diffusion'],
    fractals: ['mathematical-structure', 'Fractals'],
    practice: ['resources', 'Worked companions'],
    workspace: ['model-engineering', 'Connected experiment'],
    learn: ['resources', 'Learn & practice'],
    library: ['resources', 'Model library'],
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
    return `<span class="foko-brand-mark" aria-hidden="true"><img src="${route('assets/brand/foko-lab-micro.svg')}" width="38" height="38" alt=""></span><span class="foko-brand-copy"><span class="foko-brand-name">FokoLab</span><span class="foko-brand-context"><em>${identity.labLabel}</em></span></span>`;
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
            ['↗', 'Model Studio', 'Equations, examples, solver selection and scientific plots.', 'studio.html'],
            ['+', 'New model', 'Start from your own equations.', 'studio.html?new=1'],
            ['⇩', 'Import model', 'Open the supported model import controls.', 'studio.html#import'],
            ['▤', 'Model Atlas', 'The complete example catalogue, linked to original labs.', 'examples.html'],
            ['▦', 'All labs & methods', 'Browse every scientific workspace.', 'labs.html'],
            ['→', 'Guided workflow (optional)', 'A connected investigation alongside the original labs.', 'workspace.html?resume=last']
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
            ['▤', 'Book & materials', 'Read the companion book without leaving the platform.', 'book.html'],
            ['▦', 'All labs & methods', 'Find the original laboratories and their examples.', 'labs.html'],
            ['↗', 'Career programme', 'Book chapters, evidence gates and research transfer.', 'programme.html'],
            ['▤', 'Learn & practice', 'Worked scientific-ML lessons, exercises and runnable investigations.', 'learn.html'],
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
            ['GH', 'Source repository', 'Inspect the public Foko Lab source.', 'https://github.com/chilperic/chilperic_ode_solver']
          ]
        }
      ]
    }
  };

  // Additive 79.2 routes. Original menu items and destinations remain unchanged.
  GROUPS.experiment.sections.unshift({title:'Living systems & seasonal environments',items:[
    ['↟','Plant growth','Finite carbon, water and nitrogen budgets; explicit seasons.','plant-growth.html'],
    ['☼','Leaf physiology','C3 gas exchange and dynamic leaf energy balance.','leaf-physiology.html'],
    ['⌁','Seasonal adaptation','Mutation–fixation paths and declared trait landscapes.','adaptation.html'],
    ['⇄','Fatty acids & lipids','Original 18-state FADNS and four-state metabolism.','lipids.html'],
    ['◎','T-cell populations','Generation-resolved teaching model and original research tools.','tcell.html']
  ]});
  GROUPS.experiment.sections.push({title:'Randomness, space & mathematical structure',items:[
    ['⚄','Randomness','Dice, Brownian motion, OU and birth–death processes.','randomness.html'],
    ['⋔','Branching','Seeded Galton–Watson replicates and extinction.','branching.html'],
    ['▦','Diffusion','Conservative spatial balance and boundary conditions.','diffusion.html'],
    ['△','Fractals','Iterated-function systems and escape-time geometry.','fractals.html']
  ]});
  GROUPS.profile.sections[0].items.splice(4,0,['∑','Worked companions','Additional calculations; original book/practice links retained.','practice.html']);
  const ACTIVE_FAMILIES = {
    'plant-growth':'experiment','leaf-physiology':'experiment',adaptation:'experiment',lipids:'experiment',tcell:'experiment',randomness:'experiment',branching:'experiment',diffusion:'experiment',fractals:'experiment',
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
    'u-run', 'runStudio', 'runBtn', 'solveSteady', 'runStochastic', 'runOptimization',
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
    return `<a href="${route(href)}"${external ? ' target="_blank" rel="noopener"' : ''}${identityAttributes(href)}><span class="v76-popover-icon">${icon}</span><span><b>${label}</b><small>${note}</small></span></a>`;
  }

  function popoverMarkup(key, group) {
    return `<section class="v76-popover" id="v76-${key}-menu" data-v76-popover="${key}" data-open="false" aria-label="${group.title}">
      <div class="v76-popover-head"><b>${group.title}</b><span>${group.note}</span>${key === 'experiment' || key === 'analyze' ? `<a class="recovery-all-labs" href="${route('labs.html')}">All labs &amp; methods →</a>` : ''}</div>
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
        <a class="v76-nav-link" href="${route('examples.html')}"${active === 'atlas' ? ' aria-current="page"' : ''}>Model Atlas</a>
        <a class="v76-nav-link" href="${route('book.html')}">Book</a>
      </nav>
      <div class="v76-app-actions">
        <button class="v76-command" type="button" data-v76-command aria-label="Search models, labs and help"><span aria-hidden="true">⌕</span> Find</button>
        <button class="v76-run-action" type="button" data-v76-run>${RUN_IDS.some(id => doc.getElementById(id)) ? 'Run' : 'Open Studio'}</button>
        <button class="v76-profile" type="button" data-v76-trigger="profile" aria-expanded="false" aria-label="Help, appearance and creator" aria-controls="v76-profile-menu">
          <img src="${route('assets/profile-chilperic.webp')}" alt=""/>
        </button>
        <button class="v76-mobile-trigger" type="button" data-v76-mobile-open aria-expanded="false" aria-controls="v76MobileSheet" aria-label="Open navigation">${icons.menu}</button>
      </div>`;
  }

  function mobileMarkup() {
    const navSections = [
      ['Model project', GROUPS.project.sections[0].items],
      ['Experiments', GROUPS.experiment.sections.flatMap(section => section.items)],
      ['Analysis', GROUPS.analyze.sections.flatMap(section => section.items)],
      ['Help and provenance', GROUPS.profile.sections.flatMap(section => section.items)]
    ];
    return `<section class="v76-mobile-sheet" id="v76MobileSheet" role="dialog" aria-modal="true" tabindex="-1" data-v76-mobile-sheet data-open="false" aria-label="Foko Lab navigation" aria-hidden="true">
      <header class="v76-mobile-sheet-head"><a class="v76-brand" href="${route('index.html')}" aria-label="Foko Lab home">${adaptiveBrandMarkup()}</a><button class="v76-mobile-close" data-v76-mobile-close type="button" aria-label="Close navigation">×</button></header>
      <div class="v76-mobile-sheet-body">
        <a class="v76-mobile-home" href="${route('index.html')}">${icons.home}<span>Home</span></a>
        <div class="v76-mobile-project-actions"><a href="${route('studio.html?new=1')}">New model</a><a href="${route('studio.html')}">Open project</a></div>
        ${navSections.map(([title, items], i) => i === 0 ? `<section class="v76-mobile-nav-section"><h2>${title}</h2><nav>${items.map(item => `<a href="${route(item[3])}"${identityAttributes(item[3])}>${item[1]}</a>`).join('')}</nav></section>` : `<details class="v76-mobile-nav-section"><summary>${title}</summary><nav>${items.map(item => `<a href="${route(item[3])}"${identityAttributes(item[3])}>${item[1]}</a>`).join('')}</nav></details>`).join('')}
      </div>
    </section>
    ${doc.body.dataset.v72Shell === 'true' ? '' : `<nav class="v76-bottom-nav v77-public-bottom" aria-label="Mobile primary navigation">
      <a href="${route('index.html')}">${icons.home}<span>Home</span></a>
      <a href="${route('studio.html')}">${icons.model}<span>Model</span></a>
      <button type="button" data-v76-command>${icons.menu}<span>Find</span></button>
      <a href="${route('docs.html#quick-start')}">${icons.evidence}<span>Help</span></a>
    </nav>`}`;
  }

  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function commandMarkup() {
    const entries = Object.values(GROUPS).flatMap(group => group.sections.flatMap(section => section.items));
    for(const item of root.FokoSearchIndex||[])entries.push(['∿',item.title,item.note,item.href,item.search]);
    for(const item of root.FokoDiscoveryIndex||[])entries.push(['▤',item.title,item.note,item.href,item.search]);
    const unique=new Map(entries.map(item=>[item[3],item]));
    return `<section class="v76-command-dialog" data-v76-command-dialog hidden aria-label="Search models and methods">
      <button class="v76-command-backdrop" type="button" data-v76-command-close tabindex="-1" aria-label="Close search"></button>
      <div class="v76-command-panel" role="dialog" aria-modal="true" aria-labelledby="v76CommandTitle" tabindex="-1">
        <div class="v76-command-search"><span aria-hidden="true">⌕</span><label class="sr-only" for="v76CommandInput" id="v76CommandTitle">Search models, labs and help</label><input id="v76CommandInput" data-v76-command-input type="search" placeholder="Try logistic growth, fatty acids, or sensitivity…" autocomplete="off"/><button class="v76-command-close-button" type="button" data-v76-command-close aria-label="Close search">Close ×</button></div>
        <p class="v77-search-summary" id="v77SearchSummary" role="status">Search by model name, scientific topic, or method.</p>
        <p class="v77-search-empty" data-command-empty hidden>No matching models or methods. Try a broader term, or open Documentation from Help.</p>
        <div class="v76-command-results" data-v76-command-results>${Array.from(unique.values()).map(item=>`<a href="${escapeHtml(route(item[3]))}" data-command-text="${escapeHtml((item[1]+' '+item[2]+' '+(item[4]||'')).toLowerCase())}"${identityAttributes(item[3])}><span class="v76-popover-icon" aria-hidden="true">${item[0]}</span><span><b>${escapeHtml(item[1])}</b><small>${escapeHtml(item[2])}</small></span></a>`).join('')}</div><nav class="identity-search-pages" aria-label="Search result pages"><button type="button" data-find-prev>← Previous</button><button type="button" data-find-next>Next →</button></nav>
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

  let modal=null;
  function endModal(restore=true){
    if(!modal)return;
    const previous=modal;modal=null;
    previous.inert.forEach(([node,wasInert])=>{node.inert=wasInert;});
    if(restore&&previous.opener?.isConnected)previous.opener.focus();
    doc.body.dataset.v76MenuOpen='false';
  }
  function beginModal(node,first){
    if(modal?.node===node)return;
    endModal(false);
    const opener=doc.activeElement,inert=[];
    for(let branch=node;branch&&branch!==doc.body;branch=branch.parentElement){
      for(const sibling of branch.parentElement?.children||[]){
        if(sibling===branch||['SCRIPT','STYLE','LINK'].includes(sibling.tagName))continue;
        inert.push([sibling,sibling.inert]);sibling.inert=true;
      }
    }
    modal={node,opener,inert};doc.body.dataset.v76MenuOpen='true';(first||node).focus();
  }
  function modalFocusables(){return modal?Array.from(modal.node.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(node=>node.tabIndex>=0&&node.getClientRects().length&&!node.closest('[hidden],[inert]')):[];}
  function setMobile(open) {
    const sheet = doc.querySelector('[data-v76-mobile-sheet]');if(!sheet)return;
    if(open){setCommand(false);closePopovers();}
    const wasOpen=sheet.dataset.open==='true';
    sheet.dataset.open=open?'true':'false';sheet.setAttribute('aria-hidden',String(!open));
    doc.querySelectorAll('[data-v76-mobile-open]').forEach(button=>button.setAttribute('aria-expanded',String(open)));
    if(open)beginModal(sheet,sheet.querySelector('[data-v76-mobile-close]'));else if(wasOpen&&modal?.node===sheet)endModal();
  }
  let discoveryLoading=null;
  function ensureBookDestinations(){
    if(discoveryLoading)return discoveryLoading;
    discoveryLoading=new Promise(resolve=>{
      const script=doc.createElement('script');script.src=route('src/platform/discovery-index.js?v=79.2.0&identity=79.1');
      script.onload=()=>{
        const host=doc.querySelector('[data-v76-command-results]');
        for(const item of root.FokoDiscoveryIndex||[]){
          const a=doc.createElement('a');a.href=route(item.href);a.dataset.commandText=(item.title+' '+item.note+' '+item.search).toLowerCase();
          const glyph=doc.createElement('span');glyph.className='v76-popover-icon';glyph.setAttribute('aria-hidden','true');glyph.textContent='▤';
          const content=doc.createElement('span'),title=doc.createElement('b'),note=doc.createElement('small');title.textContent=item.title;note.textContent=item.note;content.append(title,note);a.append(glyph,content);host?.append(a);
        }
        filterCommands();resolve(true);
      };
      script.onerror=()=>{discoveryLoading=null;script.remove();resolve(false);};doc.head.append(script);
    });return discoveryLoading;
  }
  let commandPage=0;
  function filterCommands(reset=true){
    if(reset)commandPage=0;
    const dialog=doc.querySelector('[data-v76-command-dialog]');if(!dialog)return;
    const terms=(dialog.querySelector('[data-v76-command-input]').value||'').toLowerCase().trim().split(/\s+/).filter(Boolean);
    const all=[...dialog.querySelectorAll('[data-command-text]')];
    const matches=all.filter(node=>terms.every(term=>node.dataset.commandText.includes(term)));
    const size=12,pages=Math.max(1,Math.ceil(matches.length/size));commandPage=Math.min(commandPage,pages-1);
    const visible=new Set(matches.slice(commandPage*size,(commandPage+1)*size));
    all.forEach(node=>{node.hidden=!visible.has(node);});
    dialog.querySelector('[data-command-empty]').hidden=matches.length>0;
    doc.getElementById('v77SearchSummary').textContent=matches.length+' destinations'+(matches.length?' · showing '+(commandPage*size+1)+'–'+Math.min((commandPage+1)*size,matches.length):'');
    const prev=dialog.querySelector('[data-find-prev]'),next=dialog.querySelector('[data-find-next]');
    if(prev){prev.disabled=commandPage===0;next.disabled=commandPage>=pages-1;prev.parentElement.hidden=pages===1;}
  }
  function setCommand(open) {
    const dialog=doc.querySelector('[data-v76-command-dialog]');if(!dialog)return;
    if(open){setMobile(false);closePopovers();}
    const wasOpen=!dialog.hidden;
    dialog.hidden=!open;
    if(open){
      const input=dialog.querySelector('[data-v76-command-input]');input.value='';
      filterCommands();
      beginModal(dialog,input);
      ensureBookDestinations().then(ok=>{if(!ok&&!dialog.hidden)doc.getElementById('v77SearchSummary').textContent+=' · Book index unavailable; open Book & learning.';});
    }else if(wasOpen&&modal?.node===dialog)endModal();
  }
  function appearanceMarkup(){return '<div class="v77-appearance" role="group" aria-label="Appearance"><span>Appearance</span><button type="button" data-appearance="light">Light</button><button type="button" data-appearance="dark">Dark</button><button type="button" data-appearance="contrast">High contrast</button></div>';}
  function setAppearance(value){
    const mode=['light','dark','contrast'].includes(value)?value:'light';
    doc.documentElement.dataset.appearance=mode;
    doc.querySelectorAll('button[data-appearance]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.appearance===mode)));
    root.FokoStorage?.local.setItem('fokolab:appearance',mode);
    root.dispatchEvent(new CustomEvent('foko:appearance',{detail:{mode}}));root.dispatchEvent(new Event('resize'));
  }
  function adoptTaskNavigation(){
    const bar=doc.querySelector('.v72-mobile-taskbar');if(!bar)return;
    bar.classList.add('v76-bottom-nav');bar.setAttribute('aria-label','Current lab navigation');
    const home=doc.createElement('a');home.href=route('index.html');home.innerHTML=icons.home+'<span>Home</span>';bar.prepend(home);
    for(const button of bar.querySelectorAll('[data-mobile-panel-target]')){const label=button.textContent;button.innerHTML=(label==='Setup'?icons.model:icons.evidence)+'<span>'+label+'</span>';}
    const run=doc.createElement('button');run.type='button';run.className='v76-bottom-run';run.dataset.v76Run='';run.innerHTML=icons.experiment+'<span>Run</span>';run.addEventListener('click',runActiveModel);bar.append(run);
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
    doc.querySelectorAll('[data-v76-command]').forEach(button=>button.addEventListener('click', () => setCommand(true)));
    doc.querySelectorAll('button[data-appearance]').forEach(button=>button.addEventListener('click',()=>setAppearance(button.dataset.appearance)));
    doc.querySelectorAll('[data-v76-command-close]').forEach(button => button.addEventListener('click', () => setCommand(false)));
    const commandInput = doc.querySelector('[data-v76-command-input]');
    commandInput?.addEventListener('input',()=>filterCommands());
    doc.querySelector('[data-find-prev]')?.addEventListener('click',()=>{commandPage=Math.max(0,commandPage-1);filterCommands(false);});
    doc.querySelector('[data-find-next]')?.addEventListener('click',()=>{commandPage++;filterCommands(false);});
    doc.addEventListener('click', event => {
      if (!event.target.closest('.v76-popover') && !event.target.closest('[data-v76-trigger]')) closePopovers();
    });
    doc.addEventListener('focusin',event=>{if(modal&&!modal.node.contains(event.target)){const targets=modalFocusables();(targets[0]||modal.node).focus();}});
    doc.addEventListener('keydown', event => {
      if(modal&&event.key==='Tab'){
        const targets=modalFocusables(),first=targets[0],last=targets.at(-1);
        if(!first){event.preventDefault();modal.node.focus();}
        else if(event.shiftKey&&(doc.activeElement===first||!modal.node.contains(doc.activeElement))){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first.focus();}
      }
      const trigger=event.target.closest('[data-v76-trigger]');
      if(trigger&&event.key==='ArrowDown'){event.preventDefault();if(trigger.getAttribute('aria-expanded')!=='true')togglePopover(trigger);popovers.get(trigger.dataset.v76Trigger)?.querySelector('a')?.focus();}
      const menu=event.target.closest('.v76-popover');
      if(menu&&['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
        const entries=Array.from(menu.querySelectorAll('a,button')),index=entries.indexOf(doc.activeElement);
        event.preventDefault();entries[event.key==='Home'?0:event.key==='End'?entries.length-1:(index+(event.key==='ArrowDown'?1:-1)+entries.length)%entries.length]?.focus();
      }
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
      if (root.innerWidth > 1100) setMobile(false);
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
    let width = clamp(root.FokoStorage?.local.getItem(key) || defaultWidth), frame = 0;
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
      if (persist) root.FokoStorage?.local.setItem(key, String(width));
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

  function prepareReadingNavigation(){
    doc.querySelectorAll('.guide-toc,.guide-lab-links').forEach(node=>{
      const disclosure=doc.createElement('details'),summary=doc.createElement('summary');
      disclosure.className='v77-reading-navigation';summary.textContent=node.classList.contains('guide-toc')?'On this page':'Open a scientific workspace';
      node.before(disclosure);disclosure.append(summary,node);
      const media=root.matchMedia('(max-width: 900px)');disclosure.open=!media.matches;
      media.addEventListener('change',()=>{disclosure.open=!media.matches;});
    });
  }
  function install() {
    if (doc.body.dataset.v76Ready === 'true') return;
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
      // Do not demote the example selector below every model/method control.
      const identity = doc.getElementById('identityBlock');
      if (controls && catalogue && identity) identity.insertAdjacentElement('afterend', catalogue);
      const catalogueTitle = catalogue?.querySelector('h2');
      if (catalogueTitle) catalogueTitle.textContent = 'Editable example models';
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

    portal.querySelector('[data-v76-popover="profile"]').insertAdjacentHTML('beforeend',appearanceMarkup());
    portal.querySelector('.v76-mobile-sheet-body').insertAdjacentHTML('beforeend',appearanceMarkup());
    bind();
    adoptTaskNavigation();
    installWorkspaceSizing();
    setAppearance(root.FokoStorage?.local.getItem('fokolab:appearance')||'light');
    prepareReadingNavigation();
    doc.body.dataset.v76Ready = 'true';
    doc.dispatchEvent(new CustomEvent('foko:v76-shell-ready'));
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})(typeof window !== 'undefined' ? window : globalThis);

/* BEGIN GENERATED VISUAL IDENTITY 79.1 */
if(typeof window!=='undefined'){
/* source: src/platform/identity-map.js */
/* Canonical presentation identities; colors never confer scientific status. */
(function(r){const d={"families":{"foundation":{"label":"Model & mathematics","color":"#245e7b","dark":"#96cdea","soft":"#eaf2f7","icon":"structure"},"dynamics":{"label":"Dynamical systems","color":"#166d79","dark":"#87d5dc","soft":"#e6f3f4","icon":"trajectory"},"living":{"label":"Populations & living systems","color":"#486b44","dark":"#b2d3a8","soft":"#edf3e9","icon":"population"},"inference":{"label":"Inference & uncertainty","color":"#655198","dark":"#cbbbed","soft":"#f0edf7","icon":"inference"},"decisions":{"label":"Optimization & decisions","color":"#9e4928","dark":"#f0b69a","soft":"#f9eee7","icon":"optimization"},"intelligence":{"label":"Machine learning & scientific AI","color":"#435ca0","dark":"#b3c6ff","soft":"#edf1fc","icon":"intelligence"},"learning":{"label":"Book, learning & research","color":"#7c5b24","dark":"#e4cd9b","soft":"#f5f0e4","icon":"book"}},"pages":{"index":"foundation","studio":"foundation","workbench":"foundation","workspace":"foundation","linear-algebra":"foundation","symbolic":"foundation","beauty":"foundation","ode":"dynamics","stochastic":"dynamics","steady":"dynamics","bifurcation":"dynamics","networks":"living","agent":"living","population-genetics":"living","evolution":"living","photosynthesis":"living","fatty-acid-metabolism":"living","tcell-proliferation":"living","sensitivity":"inference","statistics":"inference","fitting":"inference","advanced-methods":"inference","optimization":"decisions","ml":"intelligence","sciml":"intelligence","ai-modeling":"intelligence","book":"learning","book-observations":"learning","learn":"learning","programme":"learning","docs":"learning","tutorial":"learning","research":"learning","examples":"foundation","library":"foundation","labs":"foundation"},"parts":{"I":"foundation","II":"dynamics","III":"inference","IV":"decisions","V":"intelligence","VI":"living","VII":"learning"},"icons":["home","studio","workbench","ode","stochastic","steady","bifurcation","agent","population-genetics","evolution","sensitivity","optimization","fitting","statistics","advanced-methods","ai-modeling","sciml","ml","linear-algebra","networks","symbolic","examples","book","programme","learn","research","docs","workspace","labs","beauty"],"bookParts":{"I":{"source":"#2374a6","color":"#21668e","dark":"#99cfee","soft":"#edf4f8","sourcePage":28},"II":{"source":"#4055a8","color":"#4055a8","dark":"#b8c6ff","soft":"#eff1fb","sourcePage":99},"III":{"source":"#2f7d4a","color":"#286e40","dark":"#ace0bc","soft":"#edf6ef","sourcePage":131},"IV":{"source":"#c56a1a","color":"#8e4810","dark":"#f0c29b","soft":"#faf0e7","sourcePage":205},"V":{"source":"#6842a6","color":"#6842a6","dark":"#d1baf4","soft":"#f3eef9","sourcePage":247},"VI":{"source":"#a63c3c","color":"#a03939","dark":"#f0b7b7","soft":"#fbefef","sourcePage":297},"VII":{"source":"#b3861b","color":"#7b5b12","dark":"#eed29d","soft":"#f8f2e6","sourcePage":378}}};if(typeof module!=="undefined"&&module.exports)module.exports=d;if(r)r.FokoIdentityMap=d;})(typeof window!=="undefined"?window:globalThis);

;
/* source: src/platform/visual-identity.js */
/* Presentation only. Does not alter model state, selector options, solver settings,
 * plot families or experiment data. Source chapter links are optional companions. */
(function(root){'use strict';
 const doc=root.document,I=root.FokoIdentityMap;if(!doc||!I)return;
 const script=doc.currentScript?.getAttribute('src')||'',prefix=script.replace(/src\/(?:platform\/visual-identity|research\/shell|v76\/app-shell)\.js(?:\?.*)?$/,'');
 const base=prefix===script?'':prefix;
 const page=doc.body.dataset.pageKey||'index';
 const family=I.pages[page]||'learning';
 const safeHref=h=>h&&!/^(?:https?:|mailto:|#|data:)/i.test(h);
 const routeKey=h=>String(h||'').split('?')[0].split('#')[0].split('/').pop().replace(/\.html$/,'');
 const iconKey=k=>I.icons.includes(k)?k:(k==='index'?'home':k==='library'?'examples':'docs');
 function icon(key,size=40){const image=doc.createElement('img');image.className='identity-icon';image.src=base+'assets/lab-logos/'+(doc.documentElement.dataset.appearance==='dark'?'dark/':'')+iconKey(key)+'.svg';image.alt='';image.width=size;image.height=size;image.setAttribute('aria-hidden','true');return image;}
 function decorate(scope=doc){
  scope.querySelectorAll('.directory-item:not([data-identity-ready])').forEach(card=>{
   const key=routeKey(card.querySelector('a')?.getAttribute('href'));card.dataset.colorFamily=I.pages[key]||'learning';card.dataset.identityReady='true';
   const head=card.querySelector('.directory-item-heading');if(head){const holder=doc.createElement('span');holder.className='lab-emblem';holder.append(icon(key,44));head.prepend(holder);}
  });
  scope.querySelectorAll('.v72-atlas-card:not([data-identity-ready]),.library-item:not([data-identity-ready])').forEach(card=>{
   const key=routeKey(card.querySelector('a[href*=".html"]')?.getAttribute('href'));card.dataset.colorFamily=I.pages[key]||'foundation';card.dataset.identityReady='true';
  });
  scope.querySelectorAll('.core-lab-shortcuts>a,.side-links>a,.v76-popover a,.v76-mobile-nav-section a').forEach(a=>{
   if(a.dataset.identityReady)return;const h=a.getAttribute('href');if(!safeHref(h))return;const key=routeKey(h);a.dataset.colorFamily=I.pages[key]||'learning';a.dataset.identityReady='true';
   const holder=a.querySelector('.v76-popover-icon,.nav-icon');if(holder){holder.replaceChildren(icon(key,24));holder.classList.add('lab-emblem','small');}
  });
  scope.querySelectorAll('.book-part[data-book-part]').forEach(el=>el.removeAttribute('data-color-family'));
 }
 const chapters={studio:[1,5],workbench:[1,24],ode:[5,4],stochastic:[14,15],steady:[3,5],bifurcation:[5,18],agent:[15,14],'population-genetics':[14,15],evolution:[17,18],sensitivity:[4,12],optimization:[17,18],fitting:[11,2],statistics:[11,13],'advanced-methods':[13,16],'ai-modeling':[21,23],sciml:[20,21,22],ml:[19,20],'linear-algebra':[2,3],networks:[15,2],symbolic:[4,3]};
 const chapterMeta=[{"title":"Book · 1. Scientific Models as Executable Arguments","href":"book.html?chapter=1"},{"title":"Book · 2. Linear Algebra, Information Geometry, and Inverse Problems","href":"book.html?chapter=2"},{"title":"Book · 3. Krylov Solvers, Sparse Systems, and Numerical Evidence","href":"book.html?chapter=3"},{"title":"Book · 4. Differentiation, Automatic Differentiation, and Sensitivity","href":"book.html?chapter=4"},{"title":"Book · 5. Dynamical Systems, ODE/DAE/PDE Solvers, and Verification","href":"book.html?chapter=5"},{"title":"Book · 6. Scientific Python I: Contracts, State, and Diagnostic Testing","href":"book.html?chapter=6"},{"title":"Book · 7. Scientific Python II: Interfaces, Types, and Trust Boundaries","href":"book.html?chapter=7"},{"title":"Book · 8. Scientific Python III: Array Thinking, Vectorization, and Numerical Types","href":"book.html?chapter=8"},{"title":"Book · 9. Scientific Python IV: Reproducible Experiments, Failures, and Randomness","href":"book.html?chapter=9"},{"title":"Book · 10. Scientific Python V: Callables, Packaging, and the Project Bridge","href":"book.html?chapter=10"},{"title":"Book · 11. Parameter Estimation, Identifiability, and PEtab Workflows","href":"book.html?chapter=11"},{"title":"Book · 12. Global Sensitivity, Uncertainty Quantification, and Experimental Design","href":"book.html?chapter=12"},{"title":"Book · 13. Bayesian Workflow, State Estimation, and Simulation-Based Inference","href":"book.html?chapter=13"},{"title":"Book · 14. Stochastic Processes from CTMCs to SDEs","href":"book.html?chapter=14"},{"title":"Book · 15. Agent-Based Models, Temporal Networks, and Calibration","href":"book.html?chapter=15"},{"title":"Book · 16. Multiscale Modelling, Reduction, and Scientific Digital Twins","href":"book.html?chapter=16"},{"title":"Book · 17. Optimization Geometry, Constraints, and Reliable Algorithms","href":"book.html?chapter=17"},{"title":"Book · 18. Robust Decisions, Multiobjective Design, Optimal Control, and MPC","href":"book.html?chapter=18"},{"title":"Book · 19. Statistical Machine Learning on Real and Biological Data","href":"book.html?chapter=19"},{"title":"Book · 20. Deep Learning as Differentiable Computation","href":"book.html?chapter=20"},{"title":"Book · 21. Scientific Machine Learning and Hybrid Mechanistic-Neural Models","href":"book.html?chapter=21"},{"title":"Book · 22. Equation Discovery, Model Discrimination, and Causal Reasoning","href":"book.html?chapter=22"},{"title":"Book · 23. Transformers, Retrieval, and Verifiable Scientific Agents","href":"book.html?chapter=23"},{"title":"Book · 24. Scientific Software Architecture, Contracts, and Testing","href":"book.html?chapter=24"},{"title":"Book · 25. Performance, HPC, Reproducibility, FAIR, and Deployment","href":"book.html?chapter=25"},{"title":"Book · 26. Integrated Scientific Cases: From Evidence to Decision","href":"book.html?chapter=26"},{"title":"Book · 27. Portfolio Integration and Technical Defense","href":"book.html?chapter=27"}];
 if(chapters[page]){
  const target=doc.querySelector('.v72-inspector')||doc.querySelector('.work-panel.controls');
  if(target&&!doc.getElementById('identityReading')){
   const details=doc.createElement('details');details.className='identity-reading';details.id='identityReading';
   const summary=doc.createElement('summary');summary.textContent='Related reading · V6.17';details.append(summary);
   const intro=doc.createElement('p');intro.textContent='Source chapters and worked practice. These links do not certify the lab’s implementation.';details.append(intro);
   for(const n of chapters[page]){const record=chapterMeta.find(x=>x.href==='book.html?chapter='+n);if(!record)continue;const a=doc.createElement('a');a.href=base+record.href;a.textContent=record.title.replace('Book · ','Chapter ');details.append(a);}
   target.append(details);
  }
 }
 // The lab identity is named as well as colored. No category depends on color alone.
 function syncTheme(){
  const mode=doc.documentElement.dataset.appearance||'light';
  const img=mode==='dark'?'foko-lab-mark-reversed.svg':'foko-lab-micro.svg';
  doc.querySelectorAll('.brand>img,.foko-brand-mark>img').forEach(x=>{const src=base+'assets/brand/'+img;if(!x.getAttribute('src')?.endsWith(img))x.src=src;});
  doc.querySelectorAll('img[src*="assets/lab-logos/"]').forEach(x=>{const name=x.getAttribute('src').split('/').pop();x.src=base+'assets/lab-logos/'+(mode==='dark'?'dark/':'')+name;});
  doc.querySelectorAll('.identity-guide-mark>img').forEach(x=>{const name=x.getAttribute('src').split('/').pop().replace('-dark','');x.src=base+'assets/brand/'+name.replace('.svg',(mode==='dark'?'-dark':'')+'.svg');});
  // Keep appearance usable when storage is denied.

  try{localStorage.setItem('foko:appearance',JSON.stringify(doc.getElementById('appearance')?.value||mode));localStorage.setItem('fokolab:appearance',mode);}catch(_){/* Appearance continues without persistence. */}
 }
 const attr=new MutationObserver(m=>{if(m.some(x=>x.attributeName==='data-appearance'))syncTheme();});attr.observe(doc.documentElement,{attributes:true,attributeFilter:['data-appearance']});
 decorate();syncTheme();
 let queued=false;
 const observer=new MutationObserver(mutations=>{
  if(queued||!mutations.some(m=>m.addedNodes.length))return;queued=true;
  requestAnimationFrame(()=>{queued=false;decorate();});
 });
 // Observe only collections / overlays, never the numerical chart subtree.
 ['labDirectory','atlasGridV72','libraryResults','commandResults','v76-shell-portal'].forEach(id=>{const el=doc.getElementById(id);if(el)observer.observe(el,{subtree:true,childList:true});});
 // Small, explicit page helpers; do not alter run callbacks or interpretation.
 root.FokoVisualIdentity={version:'79.1.0-design',family,decorate};
})(window);

}
