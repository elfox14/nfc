// ── Accordion Init & Global Fixes ──────────────────────────────────────────
        document.addEventListener('DOMContentLoaded', function () {

            // 1. Close all top-level fieldset-accordion panels
            document.querySelectorAll('details.fieldset-accordion').forEach(function (d) {
                d.removeAttribute('open');
            });

            // 2. Fix social-controls-wrapper: JS sets display:block but parent is flex,
            //    so we upgrade it to display:flex + column
            var scw = document.getElementById('social-controls-wrapper');
            if (scw) {
                var observer = new MutationObserver(function (mutations) {
                    mutations.forEach(function (m) {
                        if (m.attributeName === 'style') {
                            if (scw.style.display === 'block') {
                                scw.style.display = 'flex';
                                scw.style.flexDirection = 'column';
                                scw.style.gap = '12px';
                            }
                        }
                    });
                });
                observer.observe(scw, { attributes: true, attributeFilter: ['style'] });

                if (scw.style.display !== 'none') {
                    scw.style.display = 'flex';
                    scw.style.flexDirection = 'column';
                    scw.style.gap = '12px';
                }
            }
        });
