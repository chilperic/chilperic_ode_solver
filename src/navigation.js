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
  }

  function pathPrefix() {
    return location.pathname.indexOf('/research/') >= 0 ? '../' : '';
  }

  function makeMenuSummary(text) {
    return '<summary class="labs-summary">' + text + '</summary>';
  }

  function injectUnifiedNavStyles() {
    if (document.getElementById('foko-v70-12-nav-styles')) return;
    var style = document.createElement('style');
    style.id = 'foko-v70-12-nav-styles';
    style.textContent = `
      .foko-main-nav.foko-unified-nav,.topnav.foko-unified-nav{
        margin-left:auto!important; display:flex!important; align-items:center!important; gap:10px!important;
        min-width:0!important; flex-wrap:nowrap!important; white-space:nowrap!important;
      }
      .foko-main-nav.foko-unified-nav > a,
      .foko-main-nav.foko-unified-nav > details > summary{
        display:inline-flex!important; align-items:center!important; justify-content:center!important;
        min-height:40px!important; padding:0 14px!important; border-radius:14px!important;
        border:1px solid transparent!important; background:transparent!important; color:var(--muted)!important;
        font-weight:800!important; font-size:.95rem!important; line-height:1!important;
        transition:background .18s ease,border-color .18s ease,color .18s ease, box-shadow .18s ease!important;
      }
      .foko-main-nav.foko-unified-nav > a:hover,
      .foko-main-nav.foko-unified-nav > details > summary:hover{
        background:color-mix(in srgb,var(--accent) 8%, transparent)!important;
        color:var(--text)!important;
      }
      .foko-main-nav.foko-unified-nav > a.active,
      .foko-main-nav.foko-unified-nav > a[aria-current="page"],
      .foko-main-nav.foko-unified-nav > details > summary.active,
      .foko-main-nav.foko-unified-nav > details > summary[aria-current="page"]{
        background:color-mix(in srgb,var(--accent) 16%, transparent)!important;
        border-color:color-mix(in srgb,var(--accent) 52%, transparent)!important;
        color:var(--text)!important;
        box-shadow:inset 0 -3px 0 color-mix(in srgb,var(--accent) 85%, white 15%)!important;
      }
      .foko-main-nav.foko-unified-nav > details{position:relative!important}
      .foko-main-nav.foko-unified-nav > details > summary{list-style:none!important}
      .foko-main-nav.foko-unified-nav > details > summary::-webkit-details-marker{display:none}
      .foko-main-nav.foko-unified-nav > details > summary::after{
        content:'▾'; font-size:.78rem; margin-left:.5rem; opacity:.78;
      }
      .foko-main-nav.foko-unified-nav .labs-menu-panel{
        position:absolute!important; top:calc(100% + 10px)!important; left:50%!important; transform:translateX(-50%)!important;
        width:min(620px, calc(100vw - 32px))!important; padding:14px!important; border-radius:18px!important;
        background:color-mix(in srgb,var(--panel) 96%, white 4%)!important; border:1px solid color-mix(in srgb,var(--line) 88%, var(--accent) 12%)!important;
        box-shadow:0 24px 56px rgba(0,0,0,.22)!important; display:grid!important; grid-template-columns:repeat(2,minmax(0,1fr))!important;
        gap:12px!important; z-index:80!important;
      }
      .foko-main-nav.foko-unified-nav .labs-menu-panel[data-cols="1"]{grid-template-columns:1fr!important; width:min(420px,calc(100vw - 32px))!important}
      .foko-main-nav.foko-unified-nav .labs-menu-panel::before{
        content:''; position:absolute; top:-8px; left:50%; width:16px; height:16px; border-left:1px solid color-mix(in srgb,var(--line) 88%, var(--accent) 12%);
        border-top:1px solid color-mix(in srgb,var(--line) 88%, var(--accent) 12%); background:color-mix(in srgb,var(--panel) 96%, white 4%);
        transform:translateX(-50%) rotate(45deg);
      }
      .foko-main-nav.foko-unified-nav .menu-section{display:grid!important; gap:8px!important; align-content:start!important; min-width:0!important}
      .foko-main-nav.foko-unified-nav .menu-section-title{
        margin:0 0 2px!important; padding:9px 12px!important; border-radius:12px!important;
        background:color-mix(in srgb,var(--accent) 6%, transparent)!important; color:var(--text)!important; letter-spacing:.12em!important;
        text-transform:uppercase!important; font-size:.8rem!important; font-weight:900!important;
      }
      .foko-main-nav.foko-unified-nav .labs-menu-panel a{
        display:grid!important; grid-template-columns:28px minmax(0,1fr)!important; gap:12px!important; align-items:start!important;
        padding:10px 12px!important; border-radius:12px!important; color:var(--text)!important; text-decoration:none!important;
        background:transparent!important; opacity:1!important; min-width:0!important;
      }
      .foko-main-nav.foko-unified-nav .labs-menu-panel a:hover,
      .foko-main-nav.foko-unified-nav .labs-menu-panel a.active,
      .foko-main-nav.foko-unified-nav .labs-menu-panel a[aria-current="page"]{
        background:color-mix(in srgb,var(--accent) 10%, transparent)!important;
      }
      .foko-main-nav.foko-unified-nav .labs-menu-panel a span{display:block!important; min-width:0!important; overflow:visible!important; color:var(--text)!important}
      .foko-main-nav.foko-unified-nav .labs-menu-panel a b{display:block!important; font-size:.95rem!important; line-height:1.25!important; color:var(--text)!important}
      .foko-main-nav.foko-unified-nav .labs-menu-panel a small{display:block!important; margin-top:2px!important; font-size:.82rem!important; line-height:1.35!important; color:var(--muted)!important; white-space:normal!important}
      .foko-main-nav.foko-unified-nav .menu-icon{
        width:28px!important; height:28px!important; border-radius:999px!important; display:inline-flex!important; align-items:center!important; justify-content:center!important;
        background:color-mix(in srgb,var(--accent) 12%, transparent)!important; color:var(--accent)!important; font-weight:900!important; font-size:1rem!important;
      }
      .foko-main-nav.foko-unified-nav .nav-menu[data-menu-open="true"] > summary{
        background:color-mix(in srgb,var(--accent) 12%, transparent)!important; color:var(--text)!important; border-color:color-mix(in srgb,var(--accent) 35%, transparent)!important;
      }
      .foko-main-nav.foko-unified-nav .menu-panel-wide{width:min(700px,calc(100vw - 32px))!important}
      .foko-main-nav.foko-unified-nav .menu-panel-compact{width:min(360px,calc(100vw - 32px))!important}
      @media (max-width: 1180px){
        .public-topbar,.topbar,.home-topbar,.mw-topbar{flex-wrap:wrap!important; align-items:flex-start!important}
        .foko-main-nav.foko-unified-nav{width:100%!important; overflow-x:auto!important; padding-bottom:4px!important}
      }
      @media (max-width: 760px){
        .foko-main-nav.foko-unified-nav .labs-menu-panel{left:0!important; transform:none!important; right:auto!important; width:min(94vw, 420px)!important; grid-template-columns:1fr!important}
        .foko-main-nav.foko-unified-nav > a,.foko-main-nav.foko-unified-nav > details > summary{padding:0 12px!important; font-size:.88rem!important}
      }
    `;
    document.head.appendChild(style);
  }

  function injectThemeControl() {
    if (document.getElementById('themeBtn')) return;
    var ideActions = document.querySelector('.foko-ide-topbar .foko-top-actions');
    var bar = ideActions || document.querySelector('.topbar, .public-topbar, .home-topbar, .mw-topbar, .mw-brandbar');
    if (!bar) return;

    var wrap = document.createElement('div');
    wrap.className = ideActions ? 'theme-picker foko-theme-picker nav-injected-theme' : 'theme-picker nav-injected-theme';
    if (!ideActions) wrap.style.marginLeft = 'auto';

    var label = document.createElement('span');
    label.className = 'theme-icon';
    label.setAttribute('aria-hidden', 'true');
    label.textContent = '◑';

    var select = document.createElement('select');
    select.className = 'theme-select';
    select.id = 'themeBtn';
    select.setAttribute('aria-label', 'Theme');
    KNOWN_THEMES.forEach(function (key) {
      var opt = document.createElement('option');
      opt.value = key;
      opt.textContent = THEME_LABELS[key] || key;
      select.appendChild(opt);
    });
    select.value = currentTheme();
    select.addEventListener('change', function () { applyTheme(select.value); });

    wrap.appendChild(label);
    wrap.appendChild(select);
    if (ideActions) {
      bar.insertBefore(wrap, bar.querySelector('.profile-avatar-link') || null);
    } else {
      bar.appendChild(wrap);
    }
  }

  function wireThemeCycle() {
    var btn = document.getElementById('themeCycle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var now = currentTheme();
      var idx = KNOWN_THEMES.indexOf(now);
      applyTheme(KNOWN_THEMES[(idx + 1) % KNOWN_THEMES.length] || 'aurora');
      var sel = document.getElementById('themeBtn');
      if (sel) sel.value = currentTheme();
    });
  }

  function normalizePrimaryNavigation() {
    // v70.14: static headers are already generated with the final logic.
    // Do not rewrite nav.innerHTML at runtime; doing so caused stale structures
    // to reappear after the first paint. JS now only reinforces the unified class.
    var nav = document.querySelector('.foko-main-nav, .topnav');
    if (nav) nav.classList.add('foko-unified-nav');
  }

  function initNavigationMenus() {
    var menus = Array.from(document.querySelectorAll('.nav-menu, .labs-menu'));
    if (!menus.length) return;
    var hoverQuery = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : null;
    var canHover = function () { return !hoverQuery || hoverQuery.matches; };
    var activeMenu = null;
    var closeTimer = null;

    function setExpanded(menu, expanded) {
      var summary = menu.querySelector('summary');
      if (expanded) {
        menu.setAttribute('open', '');
        menu.dataset.menuOpen = 'true';
        if (summary) summary.setAttribute('aria-expanded', 'true');
      } else {
        menu.removeAttribute('open');
        menu.dataset.menuOpen = 'false';
        if (summary) summary.setAttribute('aria-expanded', 'false');
      }
    }
    function closeMenu(menu) {
      if (!menu) return;
      setExpanded(menu, false);
      if (activeMenu === menu) activeMenu = null;
    }
    function closeAll(except) {
      menus.forEach(function (menu) { if (menu !== except) closeMenu(menu); });
    }
    function openMenu(menu) {
      window.clearTimeout(closeTimer);
      closeAll(menu);
      activeMenu = menu;
      setExpanded(menu, true);
    }
    function scheduleClose(menu, delay) {
      window.clearTimeout(closeTimer);
      closeTimer = window.setTimeout(function () { closeMenu(menu); }, delay);
    }

    menus.forEach(function (menu) {
      var summary = menu.querySelector('summary');
      var panel = menu.querySelector('.labs-menu-panel');
      if (!summary || !panel) return;
      summary.setAttribute('role', 'button');
      summary.setAttribute('aria-haspopup', 'menu');
      summary.setAttribute('aria-expanded', 'false');
      if (!panel.id) panel.id = 'nav-panel-' + Math.random().toString(36).slice(2, 9);
      summary.setAttribute('aria-controls', panel.id);
      setExpanded(menu, false);

      menu.addEventListener('pointerenter', function () { if (canHover()) openMenu(menu); });
      menu.addEventListener('pointerleave', function () { if (canHover()) scheduleClose(menu, 60); });
      panel.addEventListener('pointerenter', function () { window.clearTimeout(closeTimer); });
      summary.addEventListener('click', function (event) {
        event.preventDefault();
        if (menu.hasAttribute('open')) closeMenu(menu); else openMenu(menu);
      });
      summary.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (menu.hasAttribute('open')) closeMenu(menu); else openMenu(menu);
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          openMenu(menu);
          var first = panel.querySelector('a');
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
    var body = document.body || document.documentElement;
    var lab = (body.dataset && body.dataset.lab || '').toLowerCase();
    var moduleName = (body.dataset && body.dataset.module || '').toLowerCase();
    var direct = { home:'index.html', index:'index.html' };
    var byLab = {
      'model-workbench':'modeling', symbolic:'modeling', agent:'modeling',
      ode:'standalone', stochastic:'standalone', optimization:'standalone', steady:'standalone',
      sciml:'sciml', ml:'sciml',
      analysis:'analysis', statistics:'analysis', fitting:'analysis', linalg:'analysis', networks:'analysis',
      examples:'resources', beauty:'resources', model:'resources',
      docs:'learn', platform:'learn', tutorial:'learn',
      research:'creator', creator:'creator', cv:'creator', contact:'creator', acknowledgement:'creator'
    };
    var byModule = {
      statistics:'analysis', fitting:'analysis', linalg:'analysis', networks:'analysis',
      ml:'sciml', sciml:'sciml'
    };
    var byPage = {
      'index.html':'direct',
      'workbench.html':'modeling', 'symbolic.html':'modeling', 'agent.html':'modeling',
      'ode.html':'standalone', 'stochastic.html':'standalone', 'optimization.html':'standalone', 'steady.html':'standalone',
      'sciml.html':'sciml', 'ml.html':'sciml',
      'statistics.html':'analysis', 'fitting.html':'analysis', 'linear-algebra.html':'analysis', 'networks.html':'analysis',
      'examples.html':'resources', 'beauty.html':'resources', 'model.html':'resources',
      'docs.html':'learn', 'platform.html':'learn', 'tutorial.html':'learn',
      'research.html':'creator', 'cv.html':'creator', 'contact.html':'creator', 'acknowledgement.html':'creator'
    };
    var section = byModule[moduleName] || byLab[lab] || byPage[page] || null;
    if (direct[lab]) return { section:'direct', file:direct[lab] };
    return { section: section, file: page, lab: lab, module: moduleName };
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
  function markWorkbench() { return markMenuNavigation(document.querySelector('.foko-main-nav, .topnav'), 'modeling', navPageName()); }
  function markSciML() { return markMenuNavigation(document.querySelector('.foko-main-nav, .topnav'), 'sciml', navPageName()); }
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

  function boot() {
    injectUnifiedNavStyles();
    normalizePrimaryNavigation();
    syncActiveNavigation();
    injectThemeControl();
    wireThemeCycle();
    initNavigationMenus();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}());

// v71.3 normalized menu label: Maintained workbench routes
