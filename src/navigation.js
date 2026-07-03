(function () {
  // ── Shared theme control ──────────────────────────────────────────────────
  // The theme is applied on every page (boot script reads chilperic-theme) but
  // the picker markup was hand-placed on only four lab pages. Any page without
  // a control is a one-way door: a user on a dark theme who lands there cannot
  // switch back. We inject a single, consistent picker into the topbar of every
  // page that lacks one, wired to the same key and the same known-theme list.
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
    try { localStorage.setItem('chilperic-theme', t); } catch (e) { /* ignore */ }
    // Notify any page-local plot code that theme changed (core labs listen).
    window.dispatchEvent(new CustomEvent('foko-theme-change', { detail: { theme: t } }));
  }

  function injectThemeControl() {
    // If the page already ships a picker (the four core labs), leave it alone —
    // its own handler manages plot re-rendering. Only inject where missing.
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

  function initNavigationMenus() {
    const menus = Array.from(document.querySelectorAll('.nav-menu, .labs-menu'));
    if (!menus.length) return;

    const hoverQuery = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : null;
    const canHover = () => !hoverQuery || hoverQuery.matches;
    let activeMenu = null;
    let closeTimer = null;

    const setExpanded = (menu, expanded) => {
      const summary = menu.querySelector('summary');
      if (expanded) {
        menu.setAttribute('open', '');
        menu.dataset.menuOpen = 'true';
        if (summary) summary.setAttribute('aria-expanded', 'true');
      } else {
        menu.removeAttribute('open');
        menu.dataset.menuOpen = 'false';
        if (summary) summary.setAttribute('aria-expanded', 'false');
      }
    };

    const closeMenu = (menu) => {
      if (!menu) return;
      setExpanded(menu, false);
      if (activeMenu === menu) activeMenu = null;
    };

    const closeAll = (except) => {
      menus.forEach((menu) => {
        if (menu !== except) closeMenu(menu);
      });
    };

    const openMenu = (menu) => {
      window.clearTimeout(closeTimer);
      closeAll(menu);
      activeMenu = menu;
      setExpanded(menu, true);
    };

    const scheduleClose = (menu, delay) => {
      window.clearTimeout(closeTimer);
      closeTimer = window.setTimeout(() => closeMenu(menu), delay);
    };

    menus.forEach((menu) => {
      const summary = menu.querySelector('summary');
      const panel = menu.querySelector('.labs-menu-panel');
      if (!summary || !panel) return;

      summary.setAttribute('role', 'button');
      summary.setAttribute('aria-haspopup', 'menu');
      summary.setAttribute('aria-expanded', menu.hasAttribute('open') ? 'true' : 'false');
      if (!panel.id) panel.id = 'nav-panel-' + Math.random().toString(36).slice(2, 9);
      summary.setAttribute('aria-controls', panel.id);
      setExpanded(menu, false);

      menu.addEventListener('pointerenter', () => {
        if (canHover()) openMenu(menu);
      });

      // FIX: guard mouseenter behind a PointerEvent feature-detection check.
      // On browsers that support Pointer Events (all modern desktop/mobile),
      // pointerenter fires first and is sufficient.  Registering mouseenter
      // unconditionally causes openMenu() to be called twice per hover — once
      // per event type — triggering unnecessary closeAll() + DOM churn.
      if (!window.PointerEvent) {
        menu.addEventListener('mouseenter', () => {
          if (canHover()) openMenu(menu);
        });
      }

      menu.addEventListener('pointerleave', () => {
        if (canHover()) scheduleClose(menu, 60);
      });

      // FIX: same guard for pointerleave/mouseleave pair.
      if (!window.PointerEvent) {
        menu.addEventListener('mouseleave', () => {
          if (canHover()) scheduleClose(menu, 60);
        });
      }

      summary.addEventListener('click', (event) => {
        event.preventDefault();
        if (menu.hasAttribute('open')) {
          closeMenu(menu);
        } else {
          openMenu(menu);
        }
      });

      summary.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (menu.hasAttribute('open')) closeMenu(menu);
          else openMenu(menu);
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          openMenu(menu);
          const firstLink = panel.querySelector('a');
          if (firstLink) firstLink.focus();
        }
      });

      // FIX: panel hover events keep both pointer and mouse for broad compat —
      // clearTimeout is idempotent so double-fire here is harmless.
      panel.addEventListener('pointerenter', () => window.clearTimeout(closeTimer));
      panel.addEventListener('mouseenter', () => window.clearTimeout(closeTimer));

      menu.addEventListener('focusout', (event) => {
        if (!menu.contains(event.relatedTarget)) scheduleClose(menu, 0);
      });

      panel.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => closeMenu(menu));
      });
    });

    document.addEventListener('pointerdown', (event) => {
      if (!event.target.closest('.nav-menu, .labs-menu')) closeAll();
    });

    // FIX: {passive: true} is required here.  This listener fires on every
    // mouse movement globally.  Without passive:true the browser must pause
    // rendering to wait for the handler before deciding whether to scroll,
    // causing frame drops whenever a dropdown is open.
    document.addEventListener('mousemove', (event) => {
      if (!canHover() || !activeMenu) return;
      const target = event.target;
      if (target instanceof Element && activeMenu.contains(target)) return;
      scheduleClose(activeMenu, 80);
    }, { passive: true });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeAll();
    });
  }




  function normalizeWorkbenchMenuPanel() {
    var html = ''+
      '<div class="menu-section menu-section-primary">'+
        '<p class="menu-section-title">Workbench</p>'+
        '<a href="workbench.html?model=sir" role="menuitem"><span class="menu-icon">∿</span><span><b>ODE Lab</b><small>Deterministic ODEs</small></span></a>'+
        '<a href="workbench.html?model=stoch-sir" role="menuitem"><span class="menu-icon">∴</span><span><b>Stochastic Lab</b><small>CTMC & Gillespie</small></span></a>'+
        '<a href="workbench.html?model=quadratic" role="menuitem"><span class="menu-icon">◎</span><span><b>Optimization Lab</b><small>Bounds, starts & algorithms</small></span></a>'+
        '<a href="workbench.html?model=enzyme-steady" role="menuitem"><span class="menu-icon">⇌</span><span><b>Steady-State Lab</b><small>Equilibria and roots</small></span></a>'+
        '<a href="symbolic.html" role="menuitem"><span class="menu-icon">Σ</span><span><b>Symbolic Lab</b><small>Algebra and exact inspection</small></span></a>'+
        '<a href="agent.html" role="menuitem"><span class="menu-icon">♙</span><span><b>Agent Lab</b><small>Rules and emergent behavior</small></span></a>'+
      '</div>'+
      '<div class="menu-section menu-section-classic">'+
        '<p class="menu-section-title">Standalone labs</p>'+
        '<a class="legacy-workbench-link" href="ode.html?module=ode" role="menuitem"><span class="menu-icon">∿</span><span><b>Standalone ODE Lab</b><small>Focused deterministic solver</small></span></a>'+
        '<a class="legacy-workbench-link" href="stochastic.html" role="menuitem"><span class="menu-icon">∴</span><span><b>Standalone Stochastic Lab</b><small>Focused CTMC workspace</small></span></a>'+
        '<a class="legacy-workbench-link" href="optimization.html" role="menuitem"><span class="menu-icon">◎</span><span><b>Standalone Optimization Lab</b><small>Focused optimization page</small></span></a>'+
        '<a class="legacy-workbench-link" href="steady.html" role="menuitem"><span class="menu-icon">⇌</span><span><b>Standalone Steady-State Lab</b><small>Focused root-finding page</small></span></a>'+
      '</div>';
    Array.prototype.forEach.call(document.querySelectorAll('.workbench-menu .v70-workbench-panel'), function (panel) {
      if (!panel || panel.dataset.normalized === 'true') return;
      panel.innerHTML = html;
      panel.dataset.normalized = 'true';
      panel.setAttribute('role', 'menu');
      panel.setAttribute('aria-label', 'Workbench and standalone modeling labs');
    });
  }

  function syncActiveNavigation() {
    var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    var lab = (document.body && document.body.dataset && document.body.dataset.lab) || '';
    var nav = document.querySelector('.foko-main-nav, .topnav');
    if (!nav) return;

    Array.prototype.forEach.call(nav.querySelectorAll('a.active, summary.active, a[aria-current="page"]'), function (el) {
      el.classList.remove('active');
      el.removeAttribute('aria-current');
    });

    function markLink(partial) {
      var links = Array.prototype.slice.call(nav.querySelectorAll('a[href]'));
      var found = links.find(function (a) { return (a.getAttribute('href') || '').toLowerCase().split('?')[0].split('#')[0] === partial; });
      if (found) {
        found.classList.add('active');
        found.setAttribute('aria-current', 'page');
      }
      return found;
    }
    function markWorkbench() {
      var summary = nav.querySelector('[data-nav-menu="workbench"] > summary, .workbench-menu > summary');
      if (summary) summary.classList.add('active');
    }

    var workbenchPages = ['workbench.html','ode.html','stochastic.html','optimization.html','steady.html','symbolic.html','agent.html'];
    if (page === 'index.html' || page === '') markLink('index.html');
    else if (workbenchPages.indexOf(page) >= 0 || lab === 'model-workbench') markWorkbench();
    else if (page === 'examples.html' || page === 'model.html') markLink('examples.html');
    else if (page === 'sciml.html') markLink('sciml.html');
    else if (page === 'docs.html' || page === 'platform.html') markLink('docs.html');
    else if (page === 'tutorial.html') markLink('tutorial.html');
    else if (page === 'research.html') markLink('research.html');
    else if (['contact.html','acknowledgement.html','beauty.html'].indexOf(page) >= 0) markLink('contact.html') || markLink('index.html');
  }


  function boot() {
    normalizeWorkbenchMenuPanel();
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
