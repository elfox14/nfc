document.addEventListener('DOMContentLoaded', () => {
            // DOM Elements
            const grid = document.getElementById('gallery-grid');
            const errorContainer = document.getElementById('error-container');
            const errorText = document.getElementById('error-text');
            const emptyState = document.getElementById('empty-state');
            const demoNotice = document.getElementById('demo-notice');
            const sortBySelect = document.getElementById('sort-by');
            const searchInput = document.getElementById('search-input');
            const searchBtn = document.getElementById('search-btn');
            const loadMoreContainer = document.getElementById('load-more-container');
            const loadMoreBtn = document.getElementById('load-more-btn');
            const retryBtn = document.getElementById('retry-btn');
            const navbar = document.getElementById('navbar');
            const navToggle = document.getElementById('nav-toggle');
            const navLinks = document.getElementById('nav-links');
            const gridViewBtn = document.getElementById('grid-view-btn');
            const listViewBtn = document.getElementById('list-view-btn');

            const API_BASE_URL = (window.__API_BASE_URL || window.location.origin).replace(/\/+$/, '');
            const CACHE_KEY = 'mcprime_gallery_cache';
            const CACHE_DURATION = 5 * 60 * 1000;

            let currentPage = 1;
            let totalPages = 1;
            let currentSortBy = 'createdAt';
            let currentSearchTerm = '';
            let isLoading = false;
            let usingFallback = false;

            // Demo/Fallback Data
            const DEMO_CARDS = [
                { shortId: 'demo1', data: { inputs: { 'input-name': 'Ahmed Mohamed', 'input-tagline': 'Web Developer' } }, views: 1250, gradient: 'linear-gradient(135deg, #667eea, #764ba2)' },
                { shortId: 'demo2', data: { inputs: { 'input-name': 'Sarah Ahmed', 'input-tagline': 'Graphic Designer' } }, views: 980, gradient: 'linear-gradient(135deg, #f093fb, #f5576c)' },
                { shortId: 'demo3', data: { inputs: { 'input-name': 'Mohamed Ali', 'input-tagline': 'Marketing Manager' } }, views: 756, gradient: 'linear-gradient(135deg, #4facfe, #00f2fe)' },
                { shortId: 'demo4', data: { inputs: { 'input-name': 'Fatima Khaled', 'input-tagline': 'Business Consultant' } }, views: 543, gradient: 'linear-gradient(135deg, #43e97b, #38f9d7)' },
                { shortId: 'demo5', data: { inputs: { 'input-name': 'Khaled Omar', 'input-tagline': 'Software Engineer' } }, views: 432, gradient: 'linear-gradient(135deg, #fa709a, #fee140)' },
                { shortId: 'demo6', data: { inputs: { 'input-name': 'Noura Saeed', 'input-tagline': 'Project Manager' } }, views: 321, gradient: 'linear-gradient(135deg, #a18cd1, #fbc2eb)' },
                { shortId: 'demo7', data: { inputs: { 'input-name': 'Omar Hassan', 'input-tagline': 'Photographer' } }, views: 289, gradient: 'linear-gradient(135deg, #ff9a9e, #fecfef)' },
                { shortId: 'demo8', data: { inputs: { 'input-name': 'Hoda Mahmoud', 'input-tagline': 'Content Writer' } }, views: 198, gradient: 'linear-gradient(135deg, #a1c4fd, #c2e9fb)' },
            ];

            // Navbar scroll effect
            window.addEventListener('scroll', () => {
                navbar.classList.toggle('scrolled', window.scrollY > 50);
            });

            // Mobile menu toggle
            navToggle.addEventListener('click', () => {
                navLinks.classList.toggle('active');
            });

            // View toggle
            gridViewBtn.addEventListener('click', () => {
                grid.classList.remove('list-view');
                gridViewBtn.classList.add('active');
                listViewBtn.classList.remove('active');
            });

            listViewBtn.addEventListener('click', () => {
                grid.classList.add('list-view');
                listViewBtn.classList.add('active');
                gridViewBtn.classList.remove('active');
            });

            // Category Filters
            let currentCategory = 'all';
            const filterChips = document.querySelectorAll('.filter-chip');

            filterChips.forEach(chip => {
                chip.addEventListener('click', () => {
                    filterChips.forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    currentCategory = chip.dataset.category;
                });
            });

            // Lazy Load Observer
            const lazyLoadObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const card = entry.target;
                        const bgLayer = card.querySelector('.thumb-bg-layer[data-bg]');
                        if (bgLayer) {
                            bgLayer.style.backgroundImage = `url('${bgLayer.dataset.bg}')`;
                            bgLayer.classList.add('loaded');
                            bgLayer.removeAttribute('data-bg');
                        }
                        observer.unobserve(card);
                    }
                });
            }, { rootMargin: '0px 0px 200px 0px' });

            // Show Skeleton Loading
            function showSkeletons(count = 8) {
                grid.innerHTML = '';
                for (let i = 0; i < count; i++) {
                    const skeleton = document.createElement('div');
                    skeleton.className = 'skeleton-card';
                    skeleton.innerHTML = `
                        <div class="skeleton-thumbnail"></div>
                        <div class="skeleton-info">
                            <div class="skeleton-line"></div>
                            <div class="skeleton-line short"></div>
                            <div class="skeleton-line tiny"></div>
                        </div>
                    `;
                    grid.appendChild(skeleton);
                }
            }

            // Create Card Element
            function createCardElement(design, isDemo = false) {
                const inputs = design.data.inputs || {};
                const cardElement = document.createElement('div');
                cardElement.className = 'gallery-card';

                const viewUrl = isDemo ? '#' : `viewer-en.html?id=${design.shortId}`;
                const editUrl = isDemo ? 'editor-en.html' : `editor-en.html?id=${design.shortId}`;
                const shareUrl = isDemo ? '' : `${window.location.origin}viewer-en.html?id=${design.shortId}`;

                const name = inputs['input-name'] || inputs['input-name_ar'] || inputs['input-name_en'] || 'Unnamed';
                const tagline = inputs['input-tagline'] || inputs['input-tagline_ar'] || inputs['input-tagline_en'] || 'No description';

                const isNew = design.createdAt && (Date.now() - new Date(design.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000);
                if (isNew && !isDemo) {
                    const badge = document.createElement('span');
                    badge.className = 'card-badge new';
                    badge.textContent = 'New';
                    cardElement.appendChild(badge);
                }

                const thumbnailContainer = document.createElement('div');
                thumbnailContainer.className = 'card-thumbnail';

                const imageUrls = design.data.imageUrls || {};

                if (isDemo) {
                    const bgLayer = document.createElement('div');
                    bgLayer.className = 'thumb-bg-layer loaded';
                    bgLayer.style.background = design.gradient;
                    thumbnailContainer.appendChild(bgLayer);
                } else {
                    const capturedUrl = imageUrls.capturedFront || imageUrls.front;

                    if (capturedUrl) {
                        const cardImg = document.createElement('img');
                        cardImg.className = 'card-thumb-img';
                        cardImg.src = capturedUrl;
                        cardImg.alt = name;
                        cardImg.loading = 'lazy';
                        thumbnailContainer.appendChild(cardImg);
                    } else {
                        const bgLayer = document.createElement('div');
                        bgLayer.className = 'thumb-bg-layer loaded';
                        bgLayer.style.background = 'linear-gradient(135deg, #2a3d54, #1f2d3d)';
                        thumbnailContainer.appendChild(bgLayer);
                    }
                }

                const overlay = document.createElement('div');
                overlay.className = 'thumb-overlay';
                overlay.innerHTML = `
                    <a href="${viewUrl}" class="thumb-btn preview-btn" ${isDemo ? '' : 'target="_blank"'}><i class="fas fa-eye"></i> Preview</a>
                    <a href="${editUrl}" class="thumb-btn use-template-btn" target="_blank"><i class="fas fa-magic"></i> Edit</a>
                `;
                thumbnailContainer.appendChild(overlay);

                const infoDiv = document.createElement('div');
                infoDiv.className = 'card-info';

                const createdDate = design.createdAt ? new Date(design.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

                infoDiv.innerHTML = `
                    <h3>${name}</h3>
                    <p>${tagline}</p>
                    <div class="card-stats">
                        <span class="card-stat-item"><i class="fas fa-eye"></i> ${(design.views || 0).toLocaleString('en-US')}</span>
                        ${createdDate ? `<span class="card-stat-item"><i class="fas fa-calendar-alt"></i> ${createdDate}</span>` : ''}
                    </div>
                `;

                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'card-actions';
                actionsDiv.innerHTML = `
                    <a href="${viewUrl}" class="btn btn-secondary" ${isDemo ? '' : 'target="_blank"'}><i class="fas fa-eye"></i> View</a>
                    <a href="${editUrl}" class="btn btn-primary" target="_blank"><i class="fas fa-magic"></i> Use as Template</a>
                `;

                if (!isDemo) {
                    const shareBtn = document.createElement('button');
                    shareBtn.className = 'btn-share';
                    shareBtn.title = 'Share';
                    shareBtn.innerHTML = '<i class="fas fa-share-alt"></i>';
                    shareBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (navigator.share) {
                            navigator.share({ title: name, text: tagline, url: shareUrl });
                        } else {
                            navigator.clipboard.writeText(shareUrl).then(() => {
                                shareBtn.innerHTML = '<i class="fas fa-check"></i>';
                                setTimeout(() => shareBtn.innerHTML = '<i class="fas fa-share-alt"></i>', 2000);
                            });
                        }
                    });
                    infoDiv.appendChild(shareBtn);
                }

                cardElement.append(thumbnailContainer, infoDiv, actionsDiv);
                return cardElement;
            }

            // Show Demo Cards (Fallback)
            function showDemoCards() {
                grid.innerHTML = '';
                usingFallback = true;
                if (demoNotice) demoNotice.style.display = 'flex';
                errorContainer.style.display = 'none';
                emptyState.style.display = 'none';
                loadMoreContainer.style.display = 'none';

                DEMO_CARDS.forEach(design => {
                    const card = createCardElement(design, true);
                    grid.appendChild(card);
                });
            }

            // Cache Functions
            function getCachedData() {
                try {
                    const cached = localStorage.getItem(CACHE_KEY);
                    if (cached) {
                        const { data, timestamp } = JSON.parse(cached);
                        if (Date.now() - timestamp < CACHE_DURATION) {
                            return data;
                        }
                    }
                } catch (e) {
                    console.warn('Cache read failed:', e);
                }
                return null;
            }

            function setCacheData(data) {
                try {
                    localStorage.setItem(CACHE_KEY, JSON.stringify({
                        data,
                        timestamp: Date.now()
                    }));
                } catch (e) {
                    console.warn('Cache write failed:', e);
                }
            }

            // Fetch Gallery Cards
            async function fetchGalleryCards(page = 1, sortBy = 'createdAt', searchTerm = '', append = false) {
                if (isLoading) return;
                isLoading = true;
                usingFallback = false;
                if (demoNotice) demoNotice.style.display = 'none';

                if (!append) {
                    showSkeletons(8);
                    loadMoreContainer.style.display = 'none';
                } else {
                    loadMoreBtn.disabled = true;
                    loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
                }

                errorContainer.style.display = 'none';
                emptyState.style.display = 'none';

                try {
                    if (page === 1 && !searchTerm && sortBy === 'createdAt') {
                        const cached = getCachedData();
                        if (cached && cached.designs && cached.designs.length > 0) {
                            displayCards(cached.designs, cached.pagination, append);
                            isLoading = false;
                            fetchFreshData(page, sortBy, searchTerm);
                            return;
                        }
                    }

                    const params = new URLSearchParams({ page, sortBy });
                    if (searchTerm) params.append('search', searchTerm);

                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 10000);

                    const response = await fetch(`${API_BASE_URL}/api/gallery?${params}`, {
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);

                    if (!response.ok) throw new Error(`HTTP ${response.status}`);

                    const data = await response.json();
                    const designs = data.designs || [];

                    if (page === 1 && !searchTerm && sortBy === 'createdAt') {
                        setCacheData(data);
                    }

                    isLoading = false;

                    if (designs.length === 0 && !append) {
                        grid.innerHTML = '';
                        emptyState.style.display = 'block';
                        return;
                    }

                    displayCards(designs, data.pagination, append);

                } catch (error) {
                    console.error('Failed to fetch gallery cards:', error);
                    isLoading = false;

                    if (!append) {
                        grid.innerHTML = '';

                        if (error.name === 'AbortError') {
                            errorText.textContent = 'Connection timed out. Server may be in sleep mode.';
                        } else {
                            errorText.textContent = 'Could not connect to server. Showing demo designs.';
                        }

                        showDemoCards();
                    } else {
                        loadMoreBtn.disabled = false;
                        loadMoreBtn.innerHTML = '<i class="fas fa-arrow-down"></i> Load More';
                    }
                }
            }

            function fetchFreshData(page, sortBy, searchTerm) {
                const params = new URLSearchParams({ page, sortBy });
                if (searchTerm) params.append('search', searchTerm);

                fetch(`${API_BASE_URL}/api/gallery?${params}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.designs && data.designs.length > 0) {
                            setCacheData(data);
                        }
                    })
                    .catch(() => { });
            }

            function displayCards(designs, pagination, append) {
                if (!append) grid.innerHTML = '';

                if (append) {
                    loadMoreBtn.disabled = false;
                    loadMoreBtn.innerHTML = '<i class="fas fa-arrow-down"></i> Load More';
                }

                currentPage = pagination.page;
                totalPages = pagination.totalPages;
                loadMoreContainer.style.display = currentPage < totalPages ? 'block' : 'none';

                designs.forEach(design => {
                    if (!design.shortId || !design.data || !design.data.inputs) return;
                    const card = createCardElement(design, false);
                    grid.appendChild(card);
                    lazyLoadObserver.observe(card);
                });

                updateSchema(designs, append);
            }

            // Update SEO Schema
            function updateSchema(designs, append) {
                const schemaScript = document.querySelector('script[type="application/ld+json"]');
                if (!schemaScript) return;

                try {
                    const schema = JSON.parse(schemaScript.textContent);
                    const collectionPage = schema['@graph'].find(item => item['@type'] === 'CollectionPage');
                    if (collectionPage) {
                        const itemList = collectionPage.mainEntity;
                        if (!append) itemList.itemListElement = [];

                        let pos = itemList.itemListElement.length + 1;
                        designs.forEach(design => {
                            if (!design.shortId || !design.data || !design.data.inputs) return;
                            itemList.itemListElement.push({
                                "@type": "ListItem",
                                "position": pos++,
                                "item": {
                                    "@type": "CreativeWork",
                                    "name": design.data.inputs['input-name'] || 'Business Card Design',
                                    "description": design.data.inputs['input-tagline'] || '',
                                    "url": `viewer-en.html?id=${design.shortId}`
                                }
                            });
                        });
                        schemaScript.textContent = JSON.stringify(schema, null, 2);
                    }
                } catch (e) {
                    console.error("Schema update failed:", e);
                }
            }

            // Event Handlers
            function handleFilterChange() {
                currentPage = 1;
                currentSortBy = sortBySelect.value;
                currentSearchTerm = searchInput.value;
                fetchGalleryCards(currentPage, currentSortBy, currentSearchTerm, false);
            }

            sortBySelect.addEventListener('change', handleFilterChange);
            searchBtn.addEventListener('click', handleFilterChange);
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleFilterChange();
            });

            loadMoreBtn.addEventListener('click', () => {
                if (currentPage < totalPages) {
                    fetchGalleryCards(currentPage + 1, currentSortBy, currentSearchTerm, true);
                }
            });

            retryBtn.addEventListener('click', () => {
                fetchGalleryCards(currentPage, currentSortBy, currentSearchTerm, false);
            });

            // Initial Load
            fetchGalleryCards(1, 'createdAt', '', false);
        });
