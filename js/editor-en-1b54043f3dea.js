// ── Mobile Proxy Bindings ──────────────────────────────────────────────────
        document.addEventListener('DOMContentLoaded', function () {
            // Buttons with data-trigger-id automatically click their desktop counterparts
            document.querySelectorAll('[data-trigger-id]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const targetId = btn.getAttribute('data-trigger-id');
                    const targetBtn = document.getElementById(targetId);
                    if (targetBtn) targetBtn.click();
                });
            });

            // Buttons with specific IDs ending in -menu also proxy (fallback)
            document.querySelectorAll('[id$="-menu"]').forEach(btn => {
                const baseId = btn.id.replace('-menu', '');
                const targetBtn = document.getElementById(baseId);
                if (targetBtn) {
                    btn.addEventListener('click', () => targetBtn.click());
                }
            });
        });
