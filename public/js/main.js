/* JIS – Judiciary Information System | Client-side Shell & UI Behaviour */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Auto-dismiss dismissible flash alerts after 6 seconds
  const alerts = document.querySelectorAll('.alert.alert-dismissible');
  alerts.forEach(alert => {
    setTimeout(() => {
      if (typeof bootstrap !== 'undefined' && bootstrap.Alert) {
        const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
        if (bsAlert) bsAlert.close();
      }
    }, 6000);
  });

  // 2. Active Navigation Highlighting in Sidebar & Public Topbar
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('[data-nav-path]');
  let bestMatch = null;
  let bestMatchLen = -1;

  navLinks.forEach(link => {
    const navPath = link.getAttribute('data-nav-path');
    const isExact = link.getAttribute('data-nav-exact') === 'true';

    if (isExact) {
      if (currentPath === navPath) {
        bestMatch = link;
        bestMatchLen = navPath.length + 100;
      }
    } else if (currentPath === navPath || (navPath !== '/' && currentPath.startsWith(navPath))) {
      if (navPath.length > bestMatchLen) {
        bestMatch = link;
        bestMatchLen = navPath.length;
      }
    }
  });

  if (bestMatch) {
    bestMatch.classList.add('active');
    bestMatch.setAttribute('aria-current', 'page');
  }

  // 3. Mobile Sidebar Drawer Toggle (< 992px)
  const toggleBtn = document.getElementById('jisSidebarToggleBtn');
  const closeBtn = document.getElementById('jisSidebarCloseBtn');
  const backdrop = document.getElementById('jisSidebarBackdrop');

  function openSidebar() {
    document.body.classList.add('jis-sidebar-open');
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
  }

  function closeSidebar() {
    document.body.classList.remove('jis-sidebar-open');
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
  }

  if (toggleBtn) toggleBtn.addEventListener('click', openSidebar);
  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
  if (backdrop) backdrop.addEventListener('click', closeSidebar);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('jis-sidebar-open')) {
      closeSidebar();
    }
  });

  // 4. Visual Variant Switcher (Variant A vs Variant B)
  const variantBtns = document.querySelectorAll('[data-set-variant]');
  variantBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetVariant = btn.getAttribute('data-set-variant') === 'b' ? 'b' : 'a';
      document.documentElement.setAttribute('data-jis-variant', targetVariant);
      try {
        localStorage.setItem('jis_ui_variant', targetVariant);
      } catch (_) {}
    });
  });
});

