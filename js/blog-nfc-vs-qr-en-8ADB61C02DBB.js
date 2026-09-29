// Reading Progress Indicator
        window.addEventListener('scroll', () => {
            const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (winScroll / height) * 100;
            const bar = document.getElementById('reading-progress');
            if (bar) bar.style.width = scrolled + '%';
        });

        // Copy Article Link
        function copyArticleLink() {
            navigator.clipboard.writeText(window.location.href).then(() => {
                const toast = document.getElementById('toast');
                if (toast) {
                    toast.classList.add('show');
                    setTimeout(() => toast.classList.remove('show'), 3000);
                }
            }).catch(() => {
                alert('Link copied: ' + window.location.href);
            });
        }

        // Accordion FAQ Toggle
        function toggleFaq(button) {
            const item = button.parentElement;
            item.classList.toggle('active');
        }

        // Mobile Nav Toggle
        const mobileToggle = document.getElementById('mobile-toggle');
        const navLinks = document.getElementById('nav-links');
        if (mobileToggle && navLinks) {
            mobileToggle.addEventListener('click', () => {
                navLinks.classList.toggle('active');
            });
        }
