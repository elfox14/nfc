// Mobile Menu Toggle
        const mobileToggle = document.getElementById('mobile-toggle');
        const navLinks = document.getElementById('nav-links');
        if (mobileToggle && navLinks) {
            mobileToggle.addEventListener('click', () => {
                navLinks.classList.toggle('active');
                mobileToggle.innerHTML = navLinks.classList.contains('active') 
                    ? '<i class="fas fa-times"></i>' 
                    : '<i class="fas fa-bars"></i>';
            });
        }

        // Live Search & Filter Logic
        const searchInput = document.getElementById('blog-search');
        const filterBtns = document.querySelectorAll('.filter-btn');
        const cards = document.querySelectorAll('.blog-grid .blog-card, .featured-card');

        let currentCategory = 'all';
        let currentQuery = '';

        function filterPosts() {
            cards.forEach(card => {
                const category = card.dataset.category || '';
                const text = card.textContent.toLowerCase();
                
                const matchesCategory = (currentCategory === 'all' || category === currentCategory);
                const matchesSearch = (!currentQuery || text.includes(currentQuery));

                if (matchesCategory && matchesSearch) {
                    card.style.display = card.classList.contains('featured-card') ? 'grid' : 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                currentQuery = e.target.value.trim().toLowerCase();
                filterPosts();
            });
        }

        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentCategory = btn.dataset.filter;
                filterPosts();
            });
        });
