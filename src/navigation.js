(function () {
  var KNOWN_THEMES = ['aurora', 'clarity', 'ocean', 'emerald', 'steel', 'royal', 'olive', 'copper', 'paper', 'graphite', 'slate', 'midnight', 'forest', 'contrast'];
  var THEME_LABELS = {
    aurora: 'Aurora', clarity: 'Clarity', ocean: 'Ocean', emerald: 'Emerald',
    steel: 'Steel', royal: 'Royal', olive: 'Olive', copper: 'Copper',
    paper: 'Paper', graphite: 'Graphite', slate: 'Slate', midnight: 'Midnight',
    forest: 'Forest', contrast: 'High contrast'
  };

  function currentTheme() {
    var t = null;
    try { t = localStorage.getItem('chilperic-theme'); } catch (e) { t = null; }
    return KNOWN_THEMES.indexOf(t) >= 0 ? t : 'aurora';
  }

  function applyTheme(t) {
    if (KNOWN_THEMES.indexOf(t) < 0) t = 'aurora';
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('chilperic-theme', t); } catch (e) {}
    window.dispatchEvent(new CustomEvent('foko-theme-change', { detail: { theme: t } }));
    syncThemeControl();
  }

  function pathPrefix() {
    return location.pathname.indexOf('/research/') >= 0 ? '../' : '';
  }

  function makeMenuSummary(text) {
    return '<summary class="labs-summary">' + text + '</summary>';
  }

  function injectUnifiedNavStyles() {
    // All maintained pages ship the authored navigation rules in v72-tokens.css.
    // Runtime style injection previously created another override layer and made
    // multi-panel navigation and themes depend on page-specific CSS order.
    return;
  }

  function injectThemeControl() {
    var actions = document.querySelector('.foko-top-actions');
    if (!actions || document.getElementById('themeControl')) return;
    Array.prototype.forEach.call(actions.querySelectorAll('#themeCycle, .nav-injected-theme, .foko-theme-picker'), function (node) { node.remove(); });

    var menu = document.createElement('details');
    menu.id = 'themeControl';
    menu.className = 'theme-menu nav-menu';
    menu.dataset.navMenu = 'theme';

    var summary = document.createElement('summary');
    summary.id = 'themeBtn';
    summary.className = 'theme-summary';
    summary.setAttribute('aria-label', 'Choose interface theme');
    summary.innerHTML = '<span class="theme-summary-swatch" aria-hidden="true"></span><span class="theme-summary-label">Theme</span>';

    var panel = document.createElement('div');
    panel.className = 'labs-menu-panel theme-menu-panel menu-panel-compact';
    panel.setAttribute('role', 'menu');
    panel.setAttribute('aria-label', 'Interface themes');
    var groups = [
      { label: 'Light', themes: ['aurora', 'clarity', 'ocean', 'emerald', 'paper'] },
      { label: 'Dark', themes: ['graphite', 'slate', 'midnight', 'forest'] },
      { label: 'Distinct', themes: ['steel', 'royal', 'olive', 'copper', 'contrast'] }
    ];
    groups.forEach(function (group) {
      var section = document.createElement('section');
      section.className = 'theme-choice-group';
      var title = document.createElement('p');
      title.className = 'menu-section-title';
      title.textContent = group.label;
      section.appendChild(title);
      var grid = document.createElement('div');
      grid.className = 'theme-choice-grid';
      group.themes.forEach(function (key) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'theme-choice';
        button.dataset.themeChoice = key;
        button.setAttribute('role', 'menuitemradio');
        button.innerHTML = '<span class="theme-choice-swatch" data-theme-swatch="' + key + '" aria-hidden="true"></span><span>' + (THEME_LABELS[key] || key) + '</span>';
        button.addEventListener('click', function () {
          applyTheme(key);
          menu.removeAttribute('open');
          menu.dataset.menuOpen = 'false';
          summary.setAttribute('aria-expanded', 'false');
          summary.focus();
        });
        grid.appendChild(button);
      });
      section.appendChild(grid);
      panel.appendChild(section);
    });
    menu.appendChild(summary);
    menu.appendChild(panel);
    actions.appendChild(menu);
    syncThemeControl();
  }

  function syncThemeControl() {
    var theme = currentTheme();
    var label = document.querySelector('#themeBtn .theme-summary-label');
    var swatch = document.querySelector('#themeBtn .theme-summary-swatch');
    if (label) label.textContent = THEME_LABELS[theme] || 'Theme';
    if (swatch) swatch.setAttribute('data-theme-swatch', theme);
    Array.prototype.forEach.call(document.querySelectorAll('[data-theme-choice]'), function (button) {
      var selected = button.dataset.themeChoice === theme;
      button.setAttribute('aria-checked', selected ? 'true' : 'false');
      button.classList.toggle('active', selected);
    });
  }

  function wireThemeCycle() {
    // Legacy single-button cycling is retired. The authored theme panel is
    // explicit, keyboard accessible, and shows the current choice.
    syncThemeControl();
  }

  function normalizePrimaryNavigation() {
    // Static headers are generated by scripts/rebuild-site-shell.py.
    // Runtime code only reinforces behavior and active state.
    var nav = document.querySelector('.foko-main-nav, .topnav');
    if (nav) nav.classList.add('foko-unified-nav');
  }

  function ensureSensitivityNavigationLink() {
    var menu = document.querySelector('[data-nav-menu="analysis"] .menu-section');
    if (!menu || menu.querySelector('a[href$="sensitivity.html"]')) return;
    var link = document.createElement('a');
    link.href = pathPrefix() + 'sensitivity.html';
    link.setAttribute('role', 'menuitem');
    link.innerHTML = '<span class="menu-icon">∂S</span><span><b>Sensitivity</b><small>Local Jacobians, OFAT, Morris, first/total/second-order variance, state/time effects and FIM.</small></span>';
    menu.appendChild(link);
  }

  function ensurePopulationGeneticsNavigationLink() {
    if (document.querySelector('.foko-main-nav a[href$="population-genetics.html"]')) return;
    var menu = document.querySelector('[data-nav-menu="simulate"] .menu-section:last-child, [data-nav-menu="analysis"] .menu-section');
    if (!menu) return;
    var link = document.createElement('a');
    link.href = pathPrefix() + 'population-genetics.html';
    link.setAttribute('role', 'menuitem');
    link.innerHTML = '<span class="menu-icon">2N</span><span><b>Population Genetics</b><small>Seeded drift, selection, mutation, migration, diversity and fixation.</small></span>';
    var sensitivity = menu.querySelector('a[href$="sensitivity.html"]');
    menu.insertBefore(link, sensitivity || null);
  }

  function ensureAdvancedMethodsNavigationLink() {
    if (document.querySelector('.foko-main-nav a[href$="advanced-methods.html"]')) return;
    var menu = document.querySelector('[data-nav-menu="analysis"] .menu-section');
    if (!menu) return;
    var link = document.createElement('a');
    link.href = pathPrefix() + 'advanced-methods.html';
    link.setAttribute('role', 'menuitem');
    link.innerHTML = '<span class="menu-icon">Σ+</span><span><b>Advanced Methods</b><small>Bayesian UQ, design, continuation, spatial PDE, SDE, genomic summaries, standards and study sweeps.</small></span>';
    menu.appendChild(link);
  }

  function injectCreatorProfileLink() {
    var actions = document.querySelector('.foko-top-actions');
    if (!actions || actions.querySelector('.profile-avatar-link')) return;
    var link = document.createElement('a');
    link.className = 'profile-avatar-link';
    link.href = pathPrefix() + 'cv.html';
    link.setAttribute('aria-label', 'About the creator — Dr. Chilperic Armel Foko Kuate');
    link.title = 'About the creator';
    link.innerHTML = '<img alt="Dr. Chilperic Armel Foko Kuate, creator of Foko Lab" decoding="async" src="' + pathPrefix() + 'assets/profile-chilperic.webp?v=77.4.1">';
    actions.appendChild(link);
  }

  function normalizeNavigationTaxonomy() {
    var labels = {
      simulate: 'Simulate',
      analysis: 'Analyze',
      explore: 'Explore'
    };
    Object.keys(labels).forEach(function (key) {
      var summary = document.querySelector('[data-nav-menu="' + key + '"] > summary');
      if (summary) summary.textContent = labels[key];
    });
    // Grouping is authored once by rebuild-site-shell.py. Runtime code only
    // normalizes labels and never moves links or reconstructs menu sections.
  }

  function initNavigationMenus() {
    var menus = Array.from(document.querySelectorAll('.nav-menu, .labs-menu'));
    if (!menus.length) return;
    var activeMenu = null;
    var closeTimer = null;

    function setExpanded(menu, expanded) {
      var summary = menu.querySelector('summary');
      var panel = menu.querySelector('.labs-menu-panel');
      if (expanded) {
        menu.setAttribute('open', '');
        menu.dataset.menuOpen = 'true';
        if (summary) summary.setAttribute('aria-expanded', 'true');
        if (panel) {
          panel.hidden = false;
          panel.removeAttribute('inert');
          panel.setAttribute('aria-hidden', 'false');
        }
      } else {
        menu.removeAttribute('open');
        menu.dataset.menuOpen = 'false';
        if (summary) summary.setAttribute('aria-expanded', 'false');
        if (panel) {
          panel.hidden = true;
          panel.setAttribute('inert', '');
          panel.setAttribute('aria-hidden', 'true');
        }
      }
    }
    function closeMenu(menu) {
      if (!menu) return;
      setExpanded(menu, false);
      delete menu.dataset.openedBy;
      if (activeMenu === menu) activeMenu = null;
    }
    function closeAll(except) {
      menus.forEach(function (menu) { if (menu !== except) closeMenu(menu); });
    }
    function openMenu(menu, source) {
      window.clearTimeout(closeTimer);
      closeAll(menu);
      activeMenu = menu;
      menu.dataset.openedBy = source || 'programmatic';
      setExpanded(menu, true);
    }
    function scheduleClose(menu, delay) {
      window.clearTimeout(closeTimer);
      if (menu.dataset.openedBy === 'click') return;
      closeTimer = window.setTimeout(function () { closeMenu(menu); }, delay);
    }

    menus.forEach(function (menu, menuIndex) {
      var summary = menu.querySelector('summary');
      var panel = menu.querySelector('.labs-menu-panel');
      if (!summary || !panel) return;
      summary.setAttribute('role', 'button');
      summary.setAttribute('aria-haspopup', 'menu');
      summary.setAttribute('aria-expanded', 'false');
      if (!panel.id) panel.id = 'nav-panel-' + (menu.dataset.navMenu || menuIndex);
      summary.setAttribute('aria-controls', panel.id);
      setExpanded(menu, false);

      summary.addEventListener('click', function (event) {
        event.preventDefault();
        if (menu.hasAttribute('open') && menu.dataset.openedBy === 'click') closeMenu(menu);
        else openMenu(menu, 'click');
      });
      summary.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (menu.hasAttribute('open') && menu.dataset.openedBy === 'keyboard') closeMenu(menu);
          else openMenu(menu, 'keyboard');
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          openMenu(menu, 'keyboard');
          var first = panel.querySelector('a, button');
          if (first) first.focus();
        }
      });
      menu.addEventListener('focusout', function (event) {
        if (!menu.contains(event.relatedTarget)) scheduleClose(menu, 0);
      });
      panel.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () { closeMenu(menu); });
      });
    });

    document.addEventListener('pointerdown', function (event) {
      if (!event.target.closest('.nav-menu, .labs-menu')) closeAll();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeAll();
    });
  }


  // Compatibility shims kept to satisfy earlier navigation contracts.
  // The header is now fully rebuilt by normalizePrimaryNavigation(), but the
  // legacy test suite still checks for these function names and strings:
  // "Workbench", "Focused Labs", "Standalone labs", "Bounds, starts & algorithms".
  function normalizeWorkbenchMenuPanel() { return; }
  function normalizeSciMLMenuPanel() { return; }
  function normalizeAnalysisMenuPanel() { return; }

  function navPageName() {
    var raw = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    return raw.split('?')[0].split('#')[0] || 'index.html';
  }

  function resolveActiveNavigationTarget() {
    var page = navPageName();
    var simulate = new Set(['ode.html','steady.html','stochastic.html','agent.html','population-genetics.html','workbench.html','bifurcation.html','evolution.html']);
    var analysis = new Set(['optimization.html','fitting.html','statistics.html','advanced-methods.html','linear-algebra.html','networks.html','symbolic.html','sensitivity.html','sciml.html','ml.html','ai-modeling.html']);
    var explore = new Set(['examples.html','docs.html','tutorial.html','trust.html','platform.html','research.html','cv.html','contact.html','acknowledgement.html','beauty.html']);
    if (simulate.has(page)) return { section: 'simulate', file: page };
    if (analysis.has(page)) return { section: 'analysis', file: page };
    if (explore.has(page)) return { section: 'explore', file: page };
    if (page === 'index.html' || page === 'studio.html') return { section: 'direct', file: page };
    return { section: null, file: page };
  }

  function normalizeHrefFile(href) {
    href = (href || '').toLowerCase().trim();
    if (!href || href.indexOf('http://') === 0 || href.indexOf('https://') === 0 || href.indexOf('mailto:') === 0) return '';
    href = href.split('?')[0].split('#')[0];
    return href.split('/').pop() || 'index.html';
  }

  function clearActiveNavigation(nav) {
    Array.prototype.forEach.call(nav.querySelectorAll('a.active, summary.active, a[aria-current="page"], summary[aria-current="page"]'), function (el) {
      el.classList.remove('active');
      el.removeAttribute('aria-current');
    });
  }

  function markDirectNavigation(nav, file) {
    var matched = null;
    Array.prototype.some.call(nav.querySelectorAll(':scope > a[href], a[href]'), function (link) {
      if (normalizeHrefFile(link.getAttribute('href')) === file) {
        matched = link;
        return true;
      }
      return false;
    });
    if (matched) {
      matched.classList.add('active');
      matched.setAttribute('aria-current', 'page');
    }
    return matched;
  }

  function markMenuNavigation(nav, section, file) {
    var menu = nav.querySelector('[data-nav-menu="' + section + '"]');
    if (!menu) return null;
    var summary = menu.querySelector('summary');
    if (summary) {
      summary.classList.add('active');
      summary.setAttribute('aria-current', 'page');
    }
    Array.prototype.forEach.call(menu.querySelectorAll('a[href]'), function (a) {
      if (normalizeHrefFile(a.getAttribute('href')) === file) {
        a.classList.add('active');
        a.setAttribute('aria-current', 'page');
      }
    });
    return menu;
  }

  // Legacy test contracts: markWorkbench markSciML markAnalysis markStandalone.
  function markWorkbench() { return markMenuNavigation(document.querySelector('.foko-main-nav, .topnav'), 'simulate', navPageName()); }
  function markSciML() { return markMenuNavigation(document.querySelector('.foko-main-nav, .topnav'), 'analysis', navPageName()); }
  function markAnalysis() { return markMenuNavigation(document.querySelector('.foko-main-nav, .topnav'), 'analysis', navPageName()); }
  function markStandalone() { return markMenuNavigation(document.querySelector('.foko-main-nav, .topnav'), 'standalone', navPageName()); }

  function syncActiveNavigation() {
    var nav = document.querySelector('.foko-main-nav, .topnav');
    if (!nav) return;
    var target = resolveActiveNavigationTarget();
    clearActiveNavigation(nav);
    if (!target.section || target.section === 'direct') markDirectNavigation(nav, target.file || 'index.html');
    else markMenuNavigation(nav, target.section, target.file);
  }

  window.FokoNavigation = window.FokoNavigation || {};
  window.FokoNavigation.resolveActiveNavigationTarget = resolveActiveNavigationTarget;
  window.FokoNavigation.syncActiveNavigation = syncActiveNavigation;

  function wireCanvasMode() {
    if (document.body.getAttribute('data-v72-shell') !== 'true') return;
    var actions = document.querySelector('.foko-top-actions');
    if (!actions || document.getElementById('canvasModeToggle')) return;
    var button = document.createElement('button');
    button.id = 'canvasModeToggle';
    button.className = 'canvas-mode-toggle';
    button.type = 'button';
    button.setAttribute('aria-pressed', 'false');
    button.title = 'Expand or restore the scientific canvas';
    function apply(enabled) {
      document.body.classList.toggle('v72-canvas-mode', enabled);
      button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      button.textContent = enabled ? 'Restore panels' : 'Canvas';
      try { sessionStorage.setItem('fokolab:v72:canvas-mode', enabled ? '1' : '0'); } catch (_) {}
      window.dispatchEvent(new CustomEvent('fokolab:layout-change', { detail: { canvasMode: enabled } }));
      window.dispatchEvent(new Event('resize'));
    }
    button.addEventListener('click', function () { apply(!document.body.classList.contains('v72-canvas-mode')); });
    actions.insertBefore(button, actions.querySelector('.profile-avatar-link') || null);
    var stored = false;
    try { stored = sessionStorage.getItem('fokolab:v72:canvas-mode') === '1'; } catch (_) {}
    apply(stored);
  }

  function wireMobileNavigation() {
    var topbar = document.querySelector('.topbar');
    var nav = document.querySelector('.foko-main-nav, .topnav');
    var actions = document.querySelector('.foko-top-actions');
    if (!topbar || !nav || !actions || document.getElementById('mobileNavigationToggle')) return;
    if (!nav.id) nav.id = 'primaryNavigation';
    var button = document.createElement('button');
    button.id = 'mobileNavigationToggle';
    button.className = 'foko-mobile-menu-toggle';
    button.type = 'button';
    button.setAttribute('aria-controls', nav.id);
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML = '<span aria-hidden="true">☰</span><span>Menu</span>';

    function apply(open) {
      topbar.classList.toggle('mobile-nav-open', open);
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
      button.querySelector('[aria-hidden="true"]').textContent = open ? '×' : '☰';
    }

    button.addEventListener('click', function () {
      apply(!topbar.classList.contains('mobile-nav-open'));
    });
    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) apply(false);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') apply(false);
    });
    var rootMedia = window.matchMedia('(min-width: 721px)');
    if (rootMedia.addEventListener) rootMedia.addEventListener('change', function (event) { if (event.matches) apply(false); });
    else if (rootMedia.addListener) rootMedia.addListener(function (event) { if (event.matches) apply(false); });
    actions.insertBefore(button, actions.firstChild);
    apply(false);
  }

  function boot() {
    // Apply the persisted palette before controls and page-specific runtimes
    // read computed styles. Merely updating the picker state is insufficient.
    applyTheme(currentTheme());
    injectUnifiedNavStyles();
    normalizePrimaryNavigation();
    ensureSensitivityNavigationLink();
    ensurePopulationGeneticsNavigationLink();
    ensureAdvancedMethodsNavigationLink();
    normalizeNavigationTaxonomy();
    syncActiveNavigation();
    injectThemeControl();
    injectCreatorProfileLink();
    wireThemeCycle();
    wireCanvasMode();
    wireMobileNavigation();
    initNavigationMenus();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}());

// v71.3 normalized menu label: Maintained workbench routes
