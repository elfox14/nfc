// ── Toolbar Dropdowns: Tools & Download ────────────────────────────────────
        (function () {
            document.addEventListener('DOMContentLoaded', function () {
                const toolsWrap = document.getElementById('tools-dropdown-wrap');
                const toolsBtn = document.getElementById('tools-menu-btn');
                const dlWrap = document.querySelector('.download-container.tb-dropdown-wrap');
                const dlBtn = document.getElementById('download-options-btn');

                if (dlWrap) dlWrap.id = 'download-options-wrap';

                function toggleMenu(wrap, btn, forceState) {
                    if (!wrap || !btn) return;
                    const isOpen = wrap.classList.contains('open');
                    const nextState = (forceState !== undefined) ? forceState : !isOpen;

                    wrap.classList.toggle('open', nextState);
                    btn.setAttribute('aria-expanded', nextState);

                    // If opening this one, close the other
                    if (nextState) {
                        if (wrap === toolsWrap && dlWrap) toggleMenu(dlWrap, dlBtn, false);
                        if (wrap === dlWrap && toolsWrap) toggleMenu(toolsWrap, toolsBtn, false);
                    }
                }

                if (toolsBtn) {
                    toolsBtn.addEventListener('click', function (e) {
                        e.stopPropagation();
                        toggleMenu(toolsWrap, toolsBtn);
                    });
                }

                if (dlBtn) {
                    dlBtn.addEventListener('click', function (e) {
                        e.stopPropagation();
                        toggleMenu(dlWrap, dlBtn);
                    });
                }

                document.addEventListener('click', function (e) {
                    if (toolsWrap && toolsWrap.classList.contains('open') && !toolsWrap.contains(e.target)) {
                        toggleMenu(toolsWrap, toolsBtn, false);
                    }
                    if (dlWrap && dlWrap.classList.contains('open') && !dlWrap.contains(e.target)) {
                        toggleMenu(dlWrap, dlBtn, false);
                    }
                });

                document.addEventListener('keydown', function (e) {
                    if (e.key === 'Escape') {
                        toggleMenu(toolsWrap, toolsBtn, false);
                        toggleMenu(dlWrap, dlBtn, false);
                    }
                });

                // Close menu when a tool or download item is clicked
                document.querySelectorAll('.tb-dropdown-menu .tb-dropdown-item, .tb-dropdown-menu li button').forEach(item => {
                    item.addEventListener('click', () => {
                        setTimeout(() => {
                            toggleMenu(toolsWrap, toolsBtn, false);
                            toggleMenu(dlWrap, dlBtn, false);
                        }, 100);
                    });
                });

            });
        })();
