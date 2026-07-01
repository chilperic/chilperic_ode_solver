(function () {
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

      menu.addEventListener('mouseenter', () => {
        if (canHover()) openMenu(menu);
      });

      menu.addEventListener('pointerleave', () => {
        if (canHover()) scheduleClose(menu, 60);
      });

      menu.addEventListener('mouseleave', () => {
        if (canHover()) scheduleClose(menu, 60);
      });

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

    document.addEventListener('mousemove', (event) => {
      if (!canHover() || !activeMenu) return;
      const target = event.target;
      if (target instanceof Element && activeMenu.contains(target)) return;
      scheduleClose(activeMenu, 80);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeAll();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigationMenus);
  } else {
    initNavigationMenus();
  }
}());
