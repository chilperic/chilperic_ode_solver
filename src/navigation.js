(function () {
  // ── Shared theme control ──────────────────────────────────────────────────
  // The theme is applied on every page (boot script reads chilperic-theme) but
  // the picker markup was hand-placed on only four lab pages. Any page without
  // a control is a one-way door: a user on a dark theme who lands there cannot
  // switch back. We inject a single, consistent picker into the topbar of every
  // page that lacks one, wired to the same key and the same known-theme list.
  var KNOWN_THEMES = ['aurora', 'clarity', 'ocean', 'lavender', 'slate', 'midnight', 'paper', 'forest'];
  var THEME_LABELS = {
    aurora: 'Aurora', clarity: 'Clarity', ocean: 'Ocean', lavender: 'Lavender',
    slate: 'Slate', midnight: 'Midnight', paper: 'Paper', forest: 'Forest'
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
    var bar = document.querySelector('.topbar, .public-topbar, .home-topbar, .mw-topbar, .mw-brandbar');
    if (!bar) return;

    var wrap = document.createElement('div');
    wrap.className = 'theme-picker nav-injected-theme';
    wrap.style.marginLeft = 'auto';

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
    bar.appendChild(wrap);
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

  function boot() {
    injectThemeControl();
    initNavigationMenus();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}());
