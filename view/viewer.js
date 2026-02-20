document.addEventListener('DOMContentLoaded', () => {
    const loader = document.getElementById('loader');
    const viewerContainer = document.querySelector('.viewer-container');
    const API_BASE_URL = 'https://nfc-vjy6.onrender.com';
    let cardData = null;

    // --- HELPER FUNCTIONS ---
    const SCRIPT_URLS = {
        html2canvas: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
        jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
        qrcode: 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
    };

    const loadedScripts = new Set();

    function loadScript(url) {
        if (loadedScripts.has(url)) return Promise.resolve();
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = () => {
                loadedScripts.add(url);
                resolve();
            };
            script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
            document.head.appendChild(script);
        });
    }

    // --- VCARD GENERATION ---
    const getVCardString = () => {
        if (!cardData) return '';
        const data = cardData;

        // Ensure data.inputs exists before accessing properties
        const inputs = data.inputs || {};
        const nameParts = (inputs['input-name'] || '').replace(/\\n/g, ' ').split(' ');
        const firstName = nameParts.slice(0, -1).join(' ');
        const lastName = nameParts.slice(-1).join(' ');

        let vCard = `BEGIN:VCARD\nVERSION:3.0\nN:${lastName};${firstName};;;\nFN:${inputs['input-name'] || ''}\n`;

        if (inputs['input-tagline']) {
            vCard += `TITLE:${inputs['input-tagline'].replace(/\\n/g, ' ')}\n`;
            vCard += `ORG:${inputs['input-tagline'].replace(/\\n/g, ' ')}\n`;
        }

        // Ensure dynamic data exists before accessing properties
        const dynamicData = data.dynamic || {};
        const staticSocial = dynamicData.staticSocial || {};

        if (staticSocial.email && staticSocial.email.value) {
            vCard += `EMAIL;TYPE=PREF,INTERNET:${staticSocial.email.value}\n`;
        }

        if (staticSocial.website && staticSocial.website.value) {
            let webUrl = staticSocial.website.value;
            if (!/^(https?:\/\/)/i.test(webUrl)) {
                webUrl = 'https://' + webUrl;
            }
            vCard += `URL:${webUrl}\n`;
        }

        if (staticSocial.whatsapp && staticSocial.whatsapp.value) {
            vCard += `TEL;TYPE=CELL,VOICE;PREF=1:${staticSocial.whatsapp.value.replace(/\D/g, '')}\n`;
        }

        if (dynamicData.phones) {
            const whatsappNumberClean = (staticSocial.whatsapp && staticSocial.whatsapp.value)
                ? staticSocial.whatsapp.value.replace(/\D/g, '')
                : '';

            dynamicData.phones.forEach((phone, index) => {
                if (phone && phone.value) {
                    const phoneValueClean = phone.value.replace(/\D/g, '');
                    // Only add if it's not the same as the WhatsApp number
                    if (phoneValueClean !== whatsappNumberClean) {
                        // Mark as preferred only if it's the first phone AND there's no WhatsApp number
                        const pref = (index === 0 && !whatsappNumberClean) ? ';PREF=1' : '';
                        vCard += `TEL;TYPE=CELL,VOICE${pref}:${phoneValueClean}\n`;
                    }
                }
            });
        }

        vCard += `END:VCARD\n`;
        return vCard;
    };


    // --- دالة ملء معلومات الاتصال ---
    const renderContactLinks = (data) => {
        const container = document.getElementById('contact-links-container');
        // العناصر الجديدة لملء الاسم والمسمى الوظيفي
        const profileHeader = document.getElementById('profile-header');
        const profileName = document.getElementById('profile-name');
        const profileTagline = document.getElementById('profile-tagline');

        if (!container || !profileHeader || !profileName || !profileTagline) {
            console.warn('Contact links or profile header containers not found');
            return;
        }

        // --- ملء الاسم والمسمى الوظيفي ---
        const inputs = data.inputs || {};
        const name = inputs['input-name'] || 'اسم البطاقة';
        const tagline = inputs['input-tagline'] || '';

        profileName.textContent = name;
        if (tagline && tagline.trim() !== '') {
            profileTagline.textContent = tagline;
            profileTagline.style.display = 'block';
        } else {
            profileTagline.style.display = 'none';
        }
        profileHeader.style.display = 'block'; // إظهار الهيدر
        // --- نهاية ---

        container.innerHTML = ''; // Clear existing links
        const linksHTML = [];
        const dynamicData = data.dynamic || {};
        const staticSocial = dynamicData.staticSocial || {};

        const platforms = {
            whatsapp: { icon: 'fab fa-whatsapp', prefix: 'https://wa.me/' },
            email: { icon: 'fas fa-envelope', prefix: 'mailto:' },
            website: { icon: 'fas fa-globe', prefix: 'https://' },
            facebook: { icon: 'fab fa-facebook-f', prefix: 'https://facebook.com/' },
            linkedin: { icon: 'fab fa-linkedin-in', prefix: 'https://linkedin.com/in/' },
            instagram: { icon: 'fab fa-instagram', prefix: 'https://instagram.com/' },
            x: { icon: 'fab fa-xing', prefix: 'https://x.com/' },
            telegram: { icon: 'fab fa-telegram', prefix: 'https://t.me/' },
            tiktok: { icon: 'fab fa-tiktok', prefix: 'https://tiktok.com/@' },
            snapchat: { icon: 'fab fa-snapchat', prefix: 'https://snapchat.com/add/' },
            youtube: { icon: 'fab fa-youtube', prefix: 'https://youtube.com/' },
            pinterest: { icon: 'fab fa-pinterest', prefix: 'https://pinterest.com/' }
        };

        const createLinkHTML = (key, value) => {
            const platform = platforms[key];
            if (!platform || !value) return '';

            const icon = platform.icon;
            let prefix = platform.prefix || 'https://';
            let displayValue = value;
            let fullUrl = value;

            if (key === 'email') {
                fullUrl = `${prefix}${value}`;
            } else if (key === 'whatsapp') {
                const cleanNumber = value.replace(/\D/g, '');
                fullUrl = `${prefix}${cleanNumber}`;
            } else if (key === 'website') {
                fullUrl = !/^(https?:\/\/)/i.test(value) ? `${prefix}${value}` : value;
                displayValue = value.replace(/^(https?:\/\/)?(www\.)?/, '');
            } else { // For dynamic social links and others
                fullUrl = !/^(https?:\/\/)/i.test(value) ? `${prefix}${value}` : value;
                displayValue = value.replace(/^(https?:\/\/)?(www\.)?/, '');
            }

            displayValue = displayValue.replace(/</g, "&lt;").replace(/>/g, "&gt;");

            return `
                <a href="${encodeURI(fullUrl)}" class="contact-link" target="_blank" rel="noopener noreferrer">
                    <i class="${icon}"></i>
                    <span>${displayValue}</span>
                </a>
            `;
        };

        // Render Static Social Links
        Object.entries(staticSocial).forEach(([key, linkData]) => {
            if (linkData && linkData.value && platforms[key]) {
                linksHTML.push(createLinkHTML(key, linkData.value));
            }
        });

        // Render Phone Numbers (Excluding WhatsApp)
        if (dynamicData.phones) {
            const whatsappNumberClean = (staticSocial.whatsapp && staticSocial.whatsapp.value)
                ? staticSocial.whatsapp.value.replace(/\D/g, '')
                : '';
            dynamicData.phones.forEach(phone => {
                if (phone && phone.value) {
                    const phoneValueClean = phone.value.replace(/\D/g, '');
                    if (phoneValueClean !== whatsappNumberClean) {
                        const sanitizedValue = phone.value.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                        linksHTML.push(`
                            <a href="tel:${phoneValueClean}" class="contact-link">
                                <i class="fas fa-phone"></i>
                                <span>${sanitizedValue}</span>
                            </a>
                        `);
                    }
                }
            });
        }

        // Render Dynamic Social Links
        if (dynamicData.social) {
            dynamicData.social.forEach(link => {
                if (link && link.value && link.platform && platforms[link.platform]) {
                    linksHTML.push(createLinkHTML(link.platform, link.value));
                }
            });
        }

        if (linksHTML.length > 0) {
            container.innerHTML = `<div class="links-group">${linksHTML.join('')}</div>`;
        } else {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">لا توجد روابط متاحة</p>';
        }

        console.log(`Rendered ${linksHTML.length} contact links via JS.`);
    };
    // --- نهاية الدالة ---


    // --- IMPROVED CARD BUILDER WITH EXACT EDITOR STYLES ---
    const buildCardForRender = async (data) => {
        if (!cardData) cardData = data;
        const state = data;
        const inputs = state.inputs || {}; // Ensure inputs object exists
        const dynamicData = state.dynamic || {}; // Ensure dynamic object exists
        const positions = state.positions || {};
        const placements = state.placements || {};
        const imageUrls = state.imageUrls || {};

        const frontCardContainer = document.getElementById('front-card');
        const backCardContainer = document.getElementById('back-card');

        if (!frontCardContainer || !backCardContainer) {
            console.error("Card rendering containers not found!");
            throw new Error("Card rendering containers not found");
        }

        // Load Font Awesome
        const fontAwesomeLink = document.createElement('link');
        fontAwesomeLink.rel = 'stylesheet';
        fontAwesomeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'; // Use a specific version known to work
        if (!document.querySelector('link[href*="font-awesome"]')) {
            document.head.appendChild(fontAwesomeLink);
        }

        // Wait for fonts and potentially Font Awesome to load
        try {
            await document.fonts.ready;
        } catch (e) {
            console.warn("Font loading error:", e);
        }
        await new Promise(resolve => setTimeout(resolve, 300)); // Extra buffer

        // --- Helper functions ---
        const getPositionStyle = (key) => {
            const pos = positions[key] || { x: 0, y: 0 };
            return `transform: translate(${pos.x}px, ${pos.y}px) !important;`;
        };

        const getPlacement = (key, defaultPlacement = 'front') => {
            return placements[key] || defaultPlacement;
        };

        const renderElement = (elementHTML, placement, containerCollection) => {
            if (containerCollection[placement]) {
                containerCollection[placement].insertAdjacentHTML('beforeend', elementHTML);
            } else {
                console.warn(`Container "${placement}" not found, defaulting to front`);
                containerCollection.front.insertAdjacentHTML('beforeend', elementHTML);
            }
        };
        // --- End Helper functions ---

        // Get Backgrounds
        const frontStartColor = inputs['front-bg-start'] || '#2a3d54';
        const frontEndColor = inputs['front-bg-end'] || '#223246';
        const backStartColor = inputs['back-bg-start'] || '#2a3d54';
        const backEndColor = inputs['back-bg-end'] || '#223246';
        const frontOpacity = inputs['front-bg-opacity'] !== undefined ? inputs['front-bg-opacity'] : 1;
        const backOpacity = inputs['back-bg-opacity'] !== undefined ? inputs['back-bg-opacity'] : 1;

        const frontBgImage = imageUrls.front ? `url(${imageUrls.front})` : 'none';
        const backBgImage = imageUrls.back ? `url(${imageUrls.back})` : 'none';

        // Build Front Card HTML
        frontCardContainer.innerHTML = `
            <div class="card-background-layer" style="background-image: ${frontBgImage} !important; background-size: cover; background-position: center;"></div>
            <div class="card-background-layer" style="background: linear-gradient(135deg, ${frontStartColor}, ${frontEndColor}) !important; opacity: ${frontOpacity} !important;"></div>
            <div class="card-content-layer" id="card-front-content-render"></div>
        `;

        // Build Back Card HTML
        backCardContainer.innerHTML = `
            <div class="card-background-layer" style="background-image: ${backBgImage} !important; background-size: cover; background-position: center;"></div>
            <div class="card-background-layer" style="background: linear-gradient(135deg, ${backStartColor}, ${backEndColor}) !important; opacity: ${backOpacity} !important;"></div>
            <div class="card-content-layer" id="card-back-content-render"></div>
        `;

        // Get references to the content layers after setting innerHTML
        const containers = {
            front: document.getElementById('card-front-content-render'),
            back: document.getElementById('card-back-content-render')
        };

        if (!containers.front || !containers.back) {
            console.error("Card content layers could not be found after creation!");
            throw new Error("Card content layers could not be found");
        }

        // --- Render Logo ---
        if (inputs['input-logo']) {
            const logoSize = inputs['logo-size'] || 25;
            const logoOpacity = inputs['logo-opacity'] !== undefined ? inputs['logo-opacity'] : 1;
            const logoPos = getPositionStyle('card-logo');
            const logoPlacement = getPlacement('logo');
            const logoHTML = `
                <img src="${inputs['input-logo']}" alt="Logo" style="
                    max-width: ${logoSize}% !important;
                    max-height: ${logoSize * 1.5}% !important; /* Prevent excessive height */
                    object-fit: contain;
                    opacity: ${logoOpacity} !important;
                    position: absolute !important;
                    ${logoPos}
                ">`;
            renderElement(logoHTML, logoPlacement, containers);
        }

        // --- Render Photo ---
        if (inputs['input-photo-url']) {
            const photoSize = inputs['photo-size'] || 25;
            const photoShape = inputs['photo-shape'] === 'circle' ? '50%' : '8px';
            const photoBorderWidth = inputs['photo-border-width'] !== undefined ? inputs['photo-border-width'] : 2;
            const photoBorderColor = inputs['photo-border-color'] || '#ffffff';
            const photoBorder = `${photoBorderWidth}px solid ${photoBorderColor}`;
            const photoPos = getPositionStyle('card-personal-photo-wrapper');
            const photoPlacement = getPlacement('photo');
            const photoHTML = `
                <div style="
                    width: ${photoSize}% !important;
                    padding-top: ${photoSize}%; /* Maintain aspect ratio */
                    height: 0;
                    background-image: url(${inputs['input-photo-url']}) !important;
                    background-size: cover !important;
                    background-position: center !important;
                    border-radius: ${photoShape} !important;
                    border: ${photoBorder} !important;
                    position: absolute !important;
                    overflow: hidden; /* Ensure border radius applies correctly */
                    ${photoPos}
                "></div>`;
            renderElement(photoHTML, photoPlacement, containers);
        }

        // --- Render Name ---
        if (inputs['input-name']) {
            const nameSize = inputs['name-font-size'] || 22;
            const nameColor = inputs['name-color'] || '#e6f0f7';
            const nameFont = inputs['name-font'] || 'Tajawal, sans-serif';
            const namePos = getPositionStyle('card-name');
            const namePlacement = getPlacement('name');
            // Basic sanitization for display
            const displayName = (inputs['input-name'] || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const nameHTML = `
                <div id="card-name" style="
                    font-size: ${nameSize}px !important;
                    color: ${nameColor} !important;
                    font-family: ${nameFont} !important;
                    position: absolute !important;
                    white-space: pre-wrap; /* Allow line breaks */
                    word-break: break-word;
                    ${namePos}
                ">${displayName}</div>`;
            renderElement(nameHTML, namePlacement, containers);
        }

        // --- Render Tagline ---
        if (inputs['input-tagline']) {
            const taglineSize = inputs['tagline-font-size'] || 14;
            const taglineColor = inputs['tagline-color'] || '#4da6ff'; // Corrected variable name
            const taglineFont = inputs['tagline-font'] || 'Tajawal, sans-serif';
            const taglinePos = getPositionStyle('card-tagline');
            const taglinePlacement = getPlacement('tagline');
            // Basic sanitization for display
            const displayTagline = (inputs['input-tagline'] || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const taglineHTML = `
                <div id="card-tagline" style="
                    font-size: ${taglineSize}px !important;
                    color: ${taglineColor} !important;
                    font-family: ${taglineFont} !important;
                    position: absolute !important;
                    white-space: pre-wrap; /* Allow line breaks */
                    word-break: break-word;
                    ${taglinePos}
                ">${displayTagline}</div>`;
            renderElement(taglineHTML, taglinePlacement, containers);
        }

        // --- Render Phones ---
        if (dynamicData.phones && dynamicData.phones.length > 0) {
            const showAsButtons = inputs['toggle-phone-buttons'] !== undefined ? inputs['toggle-phone-buttons'] : true; // Default true
            const phoneBtnBg = inputs['phone-btn-bg-color'] || '#4da6ff';
            const phoneBtnText = inputs['phone-btn-text-color'] || '#ffffff';
            const phoneBtnSize = inputs['phone-btn-font-size'] || 12;
            const phoneBtnFont = inputs['phone-btn-font'] || 'Poppins, sans-serif';
            const phoneBtnPadding = inputs['phone-btn-padding'] !== undefined ? inputs['phone-btn-padding'] : 6;
            const phoneTextLayout = inputs['phone-text-layout'] || 'row';
            const phoneTextSize = inputs['phone-text-size'] || 14;
            const phoneTextColor = inputs['phone-text-color'] || '#e6f0f7';
            const phoneTextFont = inputs['phone-text-font'] || 'Tajawal, sans-serif';

            dynamicData.phones.forEach(phone => {
                if (!phone || !phone.value) return;

                const pos = phone.position || { x: 0, y: 0 };
                const placement = phone.placement || 'front';
                const wrapperPos = `transform: translate(${pos.x}px, ${pos.y}px) !important;`;
                const sanitizedValue = phone.value.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                const telLink = `tel:${phone.value.replace(/\D/g, '')}`;

                let phoneHTML = '';
                if (showAsButtons) {
                    phoneHTML = `
                        <div class="phone-button-draggable-wrapper" data-layout="${phoneTextLayout}" style="position: absolute !important; ${wrapperPos}">
                            <a href="${telLink}" class="phone-button" style="
                                background-color: ${phoneBtnBg} !important;
                                color: ${phoneBtnText} !important;
                                border: 2px solid ${phoneBtnBg === 'transparent' || phoneBtnBg.includes('rgba(0,0,0,0)') ? phoneBtnText : 'transparent'} !important; /* Added border styling */
                                font-size: ${phoneBtnSize}px !important;
                                font-family: ${phoneBtnFont} !important;
                                padding: ${phoneBtnPadding}px ${phoneBtnPadding * 2}px !important;
                                border-radius: 50px; /* Ensure rounded corners */
                                text-decoration: none; /* Remove underline */
                                display: inline-flex; /* Align icon and text */
                                align-items: center;
                                gap: 8px; /* Space between icon and text */
                            ">
                                <i class="fas fa-phone-alt"></i>
                                <span>${sanitizedValue}</span>
                            </a>
                        </div>
                    `;
                } else {
                    phoneHTML = `
                        <div class="phone-button-draggable-wrapper text-only-mode" data-layout="${phoneTextLayout}" style="position: absolute !important; ${wrapperPos}">
                            <a href="${telLink}" class="phone-button" style="
                                background-color: transparent !important; /* Ensure transparent */
                                border: none !important; /* Ensure no border */
                                font-size: ${phoneTextSize}px !important;
                                color: ${phoneTextColor} !important;
                                font-family: ${phoneTextFont} !important;
                                padding: 2px !important; /* Minimal padding */
                                text-decoration: none; /* Remove underline */
                                display: inline-flex; /* Align icon and text */
                                align-items: center;
                                gap: 5px; /* Space between icon and text */
                            ">
                                <i class="fas fa-phone-alt" style="display:none;"></i> <span>${sanitizedValue}</span>
                            </a>
                        </div>
                    `;
                }
                renderElement(phoneHTML, placement, containers);
            });
        }

        // --- Render Social Links (Static + Dynamic Combined) ---
        const allSocialLinks = [];
        const staticSocial = dynamicData.staticSocial || {};
        const dynamicSocial = dynamicData.social || [];

        // Add static (using platform definitions from renderContactLinks scope)
        const platforms = { /* Copy the platforms object from renderContactLinks here */
            whatsapp: { icon: 'fab fa-whatsapp', prefix: 'https://wa.me/' },
            email: { icon: 'fas fa-envelope', prefix: 'mailto:' },
            website: { icon: 'fas fa-globe', prefix: 'https://' },
            facebook: { icon: 'fab fa-facebook-f', prefix: 'https://facebook.com/' },
            linkedin: { icon: 'fab fa-linkedin-in', prefix: 'https://linkedin.com/in/' },
            instagram: { icon: 'fab fa-instagram', prefix: 'https://instagram.com/' },
            x: { icon: 'fab fa-xing', prefix: 'https://x.com/' },
            telegram: { icon: 'fab fa-telegram', prefix: 'https://t.me/' },
            tiktok: { icon: 'fab fa-tiktok', prefix: 'https://tiktok.com/@' },
            snapchat: { icon: 'fab fa-snapchat', prefix: 'https://snapchat.com/add/' },
            youtube: { icon: 'fab fa-youtube', prefix: 'https://youtube.com/' },
            pinterest: { icon: 'fab fa-pinterest', prefix: 'https://pinterest.com/' }
        };

        Object.entries(staticSocial).forEach(([key, linkData]) => {
            if (linkData && linkData.value && platforms[key]) { // Check if platform exists
                allSocialLinks.push({
                    id: `static-${key}`,
                    value: linkData.value,
                    placement: linkData.placement || 'back',
                    position: linkData.position || { x: 0, y: 0 },
                    platformKey: key
                });
            }
        });

        // Add dynamic
        dynamicSocial.forEach(linkData => {
            if (linkData && linkData.value && linkData.platform && platforms[linkData.platform]) { // Check if platform exists
                allSocialLinks.push({
                    id: linkData.id || `dynamic-${linkData.platform}-${Date.now()}`, // Ensure ID exists
                    value: linkData.value,
                    placement: linkData.placement || 'back',
                    position: linkData.position || { x: 0, y: 0 },
                    platformKey: linkData.platform
                });
            }
        });

        if (allSocialLinks.length > 0) {
            const showSocialButtons = inputs['toggle-social-buttons'] !== undefined ? inputs['toggle-social-buttons'] : true; // Default true
            const socialBtnBg = inputs['back-buttons-bg-color'] || '#364f6b';
            const socialBtnText = inputs['back-buttons-text-color'] || '#aab8c2';
            const socialBtnSize = inputs['back-buttons-size'] || 10;
            const socialBtnFont = inputs['back-buttons-font'] || 'Poppins, sans-serif';
            const socialTextSize = inputs['social-text-size'] || 12;
            const socialTextColor = inputs['social-text-color'] || '#e6f0f7';
            const socialTextFont = inputs['social-text-font'] || 'Tajawal, sans-serif';

            allSocialLinks.forEach(link => {
                const platform = platforms[link.platformKey];
                if (!platform) return; // Skip if platform details not found

                const pos = link.position || { x: 0, y: 0 };
                const placement = link.placement || 'back';
                const wrapperPos = `transform: translate(${pos.x}px, ${pos.y}px) !important;`;

                // URL and Display Text logic (Simplified from renderContactLinks)
                let value = link.value;
                let displayValue = value;
                let fullUrl = value;
                let prefix = platform.prefix || 'https://';

                if (link.platformKey === 'email') { fullUrl = `${prefix}${value}`; }
                else if (link.platformKey === 'whatsapp') { fullUrl = `${prefix}${value.replace(/\D/g, '')}`; }
                else { fullUrl = !/^(https?:\/\/)/i.test(value) ? `${prefix}${value}` : value; }

                if (link.platformKey !== 'email') {
                    displayValue = displayValue.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
                }
                // Sanitize display value
                displayValue = displayValue.replace(/</g, "&lt;").replace(/>/g, "&gt;");

                let socialHTML = '';
                if (showSocialButtons) {
                    socialHTML = `
                        <div class="draggable-social-link" style="position: absolute !important; ${wrapperPos}">
                            <a href="${encodeURI(fullUrl)}" target="_blank" rel="noopener noreferrer" style="
                                background-color: ${socialBtnBg} !important;
                                color: ${socialBtnText} !important;
                                font-family: ${socialBtnFont} !important;
                                font-size: ${socialBtnSize}px !important;
                                padding: ${socialBtnSize * 0.5}px ${socialBtnSize}px !important;
                                border-radius: 50px; /* Ensure rounded */
                                text-decoration: none; /* Remove underline */
                                display: inline-flex; /* Align icon and text */
                                align-items: center;
                                gap: 8px; /* Space between icon and text */
                            ">
                                <i class="${platform.icon}"></i>
                                <span>${displayValue}</span>
                            </a>
                        </div>
                    `;
                } else {
                    socialHTML = `
                         <div class="draggable-social-link text-only-mode" style="position: absolute !important; ${wrapperPos}">
                            <a href="${encodeURI(fullUrl)}" target="_blank" rel="noopener noreferrer" style="
                                background-color: transparent !important; /* Ensure transparent */
                                border: none !important; /* Ensure no border */
                                font-family: ${socialTextFont} !important;
                                padding: 2px !important; /* Minimal padding */
                                text-decoration: none; /* Remove underline */
                                display: inline-flex; /* Align icon and text */
                                align-items: center;
                                gap: 5px; /* Space between icon and text */
                            ">
                                <i class="${platform.icon}" style="color: ${socialTextColor} !important; font-size: 1.2em;"></i>
                                <span style="
                                    font-size: ${socialTextSize}px !important;
                                    color: ${socialTextColor} !important;
                                ">${displayValue}</span>
                            </a>
                        </div>
                    `;
                }
                renderElement(socialHTML, placement, containers);
            });
        }

        // --- Render QR Code ---
        let qrDataString = null; // Use a different name to avoid conflict
        const qrSource = inputs['qr-source'] || 'auto-vcard'; // Default to auto-vcard

        if (qrSource === 'custom') {
            qrDataString = inputs['input-qr-url'];
        } else if (qrSource === 'upload') {
            qrDataString = imageUrls.qrCode;
        } else if (qrSource === 'auto-vcard') {
            qrDataString = getVCardString();
        } else if (qrSource === 'auto-card') {
            // Fallback to vCard for rendering if auto-card source is chosen
            console.warn("auto-card QR source selected for rendering, using vCard data as fallback.");
            qrDataString = getVCardString();
        }

        if (qrDataString) {
            const qrSize = inputs['qr-size'] || 25;
            const qrPos = getPositionStyle('qr-code-wrapper');
            const qrPlacement = getPlacement('qr', 'back');

            let qrHTML = '';

            if (qrSource === 'custom' || qrSource === 'upload') {
                // It's an image URL
                qrHTML = `
                    <div id="qr-code-wrapper" style="
                        width: ${qrSize}% !important;
                        padding-top: ${qrSize}%; /* Maintain aspect ratio */
                        height: 0;
                        position: absolute !important;
                        ${qrPos}
                    ">
                        <img src="${qrDataString}" alt="QR Code" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 4px; object-fit: contain; background: white; padding: 4px;">
                    </div>
                 `;
                renderElement(qrHTML, qrPlacement, containers);
            } else if (qrDataString.length > 20) { // Check if vCard/auto-card data is substantial
                // It's data for QR generation (vCard or auto-card fallback)
                try {
                    await loadScript(SCRIPT_URLS.qrcode);

                    // Create a temporary div off-screen to generate QR
                    const tempQrDiv = document.createElement('div');
                    tempQrDiv.style.position = 'absolute';
                    tempQrDiv.style.left = '-9999px';
                    document.body.appendChild(tempQrDiv);

                    new QRCode(tempQrDiv, {
                        text: qrDataString,
                        width: 256, // Generate at a reasonable resolution
                        height: 256,
                        colorDark: "#000000",
                        colorLight: "#ffffff",
                        correctLevel: QRCode.CorrectLevel.H
                    });

                    // Wait for QR code canvas/img to render inside the temp div
                    await new Promise(resolve => setTimeout(() => {
                        const qrImgElement = tempQrDiv.querySelector('img'); // qrcode.js often generates an img tag
                        const qrCanvasElement = tempQrDiv.querySelector('canvas');

                        let dataUrl = null;
                        if (qrImgElement && qrImgElement.src) {
                            dataUrl = qrImgElement.src;
                        } else if (qrCanvasElement) {
                            dataUrl = qrCanvasElement.toDataURL();
                        }

                        if (dataUrl) {
                            qrHTML = `
                                <div id="qr-code-wrapper" style="
                                    width: ${qrSize}% !important;
                                    padding-top: ${qrSize}%; /* Maintain aspect ratio */
                                    height: 0;
                                    position: absolute !important;
                                    ${qrPos}
                                ">
                                    <img src="${dataUrl}" alt="QR Code" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 4px; object-fit: contain; background: white; padding: 4px;">
                                </div>
                            `;
                            renderElement(qrHTML, qrPlacement, containers);
                        } else {
                            console.warn('QR Code generation did not produce an image or canvas.');
                        }
                        document.body.removeChild(tempQrDiv); // Clean up temp div
                        resolve();
                    }, 300)); // Increased timeout slightly

                } catch (error) {
                    console.error('QR Code generation failed:', error);
                    // Optionally render a placeholder or error message
                    qrHTML = `<div id="qr-code-wrapper" style="width: ${qrSize}%; aspect-ratio: 1; position: absolute; ${qrPos} background: #eee; display: flex; align-items: center; justify-content: center; font-size: 10px; color: red; text-align: center; border-radius: 4px; padding: 5px;">QR Error</div>`;
                    renderElement(qrHTML, qrPlacement, containers);
                }
            } else {
                console.warn("QR data string is too short, skipping QR generation.");
                // Optionally render a placeholder if needed
                qrHTML = `<div id="qr-code-wrapper" style="width: ${qrSize}%; aspect-ratio: 1; position: absolute; ${qrPos} background: #eee; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #aaa; text-align: center; border-radius: 4px; padding: 5px;">QR Placeholder</div>`;
                renderElement(qrHTML, qrPlacement, containers);
            }
        } else {
            console.log("No QR data available to render.");
            // Optionally render a placeholder if no data
            let qrHTML = `<div id="qr-code-wrapper" style="width: ${inputs['qr-size'] || 25}%; aspect-ratio: 1; position: absolute; ${getPositionStyle('qr-code-wrapper')} background: #eee; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #aaa; text-align: center; border-radius: 4px; padding: 5px;">QR Placeholder</div>`;
            renderElement(qrHTML, getPlacement('qr', 'back'), containers);
        }


        // Wait for all images within the generated cards to load
        const allRenderedImages = [
            ...containers.front.querySelectorAll('img'),
            ...containers.back.querySelectorAll('img')
        ];

        await Promise.all(allRenderedImages.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => {
                img.onload = resolve;
                img.onerror = () => {
                    console.warn(`Failed to load image: ${img.src}`);
                    resolve(); // Resolve even on error to not block rendering
                };
                // Add a timeout fallback for image loading
                setTimeout(() => {
                    if (!img.complete) {
                        console.warn(`Timeout loading image: ${img.src}`);
                        resolve();
                    }
                }, 5000); // 5 second timeout per image
            });
        }));

        await new Promise(resolve => setTimeout(resolve, 500)); // Final buffer

        console.log("Card rendering complete.");
    };


    // --- IMPROVED CAPTURE FUNCTION ---
    const captureAndDisplayCards = async () => {
        console.log('Starting card capture...');

        try {
            await loadScript(SCRIPT_URLS.html2canvas);
        } catch (error) {
            console.error('Failed to load html2canvas:', error);
            alert('فشل تحميل مكتبة التقاط الصور.'); // User feedback
            throw new Error('فشل تحميل مكتبة التقاط الصور');
        }

        const frontCardRenderArea = document.getElementById('front-card');
        const backCardRenderArea = document.getElementById('back-card');

        const frontDisplay = document.getElementById('card-front-display');
        const backDisplay = document.getElementById('card-back-display');
        const flipWrapper = document.getElementById('cards-wrapper-viewer');
        const flipBtn = document.getElementById('viewer-flip-btn');

        if (!frontCardRenderArea || !backCardRenderArea || !frontDisplay || !backDisplay || !flipWrapper || !flipBtn) {
            console.error('Required elements for capture/display not found.');
            alert('لم يتم العثور على العناصر اللازمة لعرض البطاقة.'); // User feedback
            throw new Error('لم يتم العثور على عناصر البطاقة أو حاوية العرض');
        }

        frontCardRenderArea.style.visibility = 'visible';
        backCardRenderArea.style.visibility = 'visible';

        const captureOptions = {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: null,
            logging: false,
            imageTimeout: 15000
        };

        try {
            // Temporary fix for html2canvas ignoring aspect-ratio and padding-bottom for absolute positioned elements
            const fixAspectRatios = (area) => {
                const photos = area.querySelectorAll('#card-photo, .personal-photo-wrapper');
                const restoreFns = [];
                photos.forEach(p => {
                    const cssText = p.style.cssText;
                    let width = p.offsetWidth || p.getBoundingClientRect().width;
                    if (!width || width === 0) {
                        const parentWidth = p.parentElement ? (p.parentElement.offsetWidth || 510) : 510;
                        const pctStr = p.style.width || p.style.paddingBottom || '25%';
                        const pct = parseFloat(pctStr);
                        width = (pct / 100) * parentWidth;
                    }
                    if (width > 0) {
                        p.style.setProperty('width', width + 'px', 'important');
                        p.style.setProperty('height', width + 'px', 'important');
                        p.style.setProperty('max-height', width + 'px', 'important');
                        p.style.setProperty('min-height', width + 'px', 'important');
                        p.style.setProperty('padding-bottom', '0px', 'important');
                    }
                    restoreFns.push(() => p.style.cssText = cssText);
                });
                return () => restoreFns.forEach(fn => fn());
            };
            const restoreFront = fixAspectRatios(frontCardRenderArea);
            const restoreBack = fixAspectRatios(backCardRenderArea);

            console.log('Capturing front card...');
            const frontCanvas = await html2canvas(frontCardRenderArea, captureOptions);

            console.log('Capturing back card...');
            const backCanvas = await html2canvas(backCardRenderArea, captureOptions);

            restoreFront();
            restoreBack();

            frontCardRenderArea.style.visibility = 'hidden';
            backCardRenderArea.style.visibility = 'hidden';

            // --- !! هذا هو التعديل الأول - استخدام الخلفية !! ---
            // نعود لاستخدام innerHTML لأنه أنظف للتحكم المشروط
            const isMobileView = window.matchMedia("(max-width: 1200px)").matches;
            const backImageStyle = isMobileView ? 'style="transform: rotateY(180deg);"' : '';

            frontDisplay.innerHTML = `<img src="${frontCanvas.toDataURL('image/png', 1.0)}" alt="الوجه الأمامي للبطاقة">`;
            backDisplay.innerHTML = `<img src="${backCanvas.toDataURL('image/png', 1.0)}" alt="الوجه الخلفي للبطاقة" ${backImageStyle}>`;
            // --- نهاية التعديل ---

            // دالة التقليب
            const flipFn = (e) => {
                e.stopPropagation();
                flipWrapper.classList.toggle('is-flipped');
            };

            // ربط الأحداث
            flipWrapper.addEventListener('click', flipFn);
            flipBtn.addEventListener('click', flipFn);
            flipBtn.style.display = 'inline-flex'; // إظهار الزر

            console.log('Card images captured and displayed successfully.');

        } catch (error) {
            console.error('Card capture failed:', error);
            frontCardRenderArea.style.visibility = 'hidden';
            backCardRenderArea.style.visibility = 'hidden';
            alert(`فشل التقاط صور البطاقة: ${error.message}`); // User feedback
            flipWrapper.innerHTML = `<p style="color: red; text-align: center; padding: 20px;">خطأ في عرض البطاقة.</p>`;
            throw new Error('فشل التقاط صور البطاقة');
        }
    };


    // --- ERROR DISPLAY ---
    const showLoadingError = (message) => {
        if (loader) {
            loader.innerHTML = `<p style="color: #dc3545; font-weight: bold;">خطأ في التحميل:</p><p>${message || 'حدث خطأ غير متوقع.'}</p>`;
            loader.style.display = 'flex';
            loader.style.flexDirection = 'column';
            loader.style.alignItems = 'center';
            loader.style.justifyContent = 'center';
        }
        if (viewerContainer) {
            viewerContainer.style.display = 'none';
        }
        console.error("Loading Error:", message);
    };

    // --- منطق الوضع الليلي ---
    const setupThemeToggle = () => {
        const toggle = document.getElementById('theme-toggle');
        if (!toggle) return;

        const applyTheme = (theme) => {
            if (theme === 'dark') {
                document.documentElement.classList.add('dark-mode');
                toggle.checked = true;
            } else {
                document.documentElement.classList.remove('dark-mode');
                toggle.checked = false;
            }
        };

        let savedTheme = localStorage.getItem('theme');
        if (!savedTheme) {
            savedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }

        applyTheme(savedTheme);

        toggle.addEventListener('change', () => {
            const newTheme = toggle.checked ? 'dark' : 'light';
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
        });
    };
    // --- نهاية منطق الوضع الليلي ---

    // --- MAIN PROCESSING ---
    const processCardData = async (data) => {
        if (!data || !data.inputs) {
            showLoadingError('لم نتمكن من تحميل بيانات البطاقة أو أن البيانات غير صالحة.');
            return;
        }

        try {
            cardData = data;

            console.log("Rendering contact links via JS...");
            renderContactLinks(data);

            const inputs = data.inputs || {};
            const name = inputs['input-name'] || '';
            const tagline = inputs['input-tagline'] || '';

            if (name && tagline) {
                document.title = `عرض بطاقة: ${name} - ${tagline}`;
            } else if (name) {
                document.title = `عرض بطاقة: ${name}`;
            }

            const frontDisplay = document.getElementById('card-front-display');
            const backDisplay = document.getElementById('card-back-display');
            const flipWrapper = document.getElementById('cards-wrapper-viewer');
            const flipBtn = document.getElementById('viewer-flip-btn');

            if (!frontDisplay || !backDisplay || !flipWrapper || !flipBtn) {
                throw new Error("حاوية عرض صور البطاقة غير موجودة!");
            }

            const imageUrls = data.imageUrls || {};
            const capturedFront = imageUrls.capturedFront;
            const capturedBack = imageUrls.capturedBack;

            if (capturedFront && capturedBack) {
                console.log("Displaying pre-captured snapshot images...");

                // --- !! هذا هو التعديل الثاني - إضافة الشرط !! ---
                const isMobileView = window.matchMedia("(max-width: 1200px)").matches;
                const backImageStyle = isMobileView ? 'style="transform: rotateY(180deg);"' : '';

                frontDisplay.innerHTML = `<img src="${capturedFront}" alt="الوجه الأمامي للبطاقة" loading="lazy">`;
                backDisplay.innerHTML = `<img src="${capturedBack}" alt="الوجه الخلفي للبطاقة" loading="lazy" ${backImageStyle}>`;
                // --- نهاية التعديل ---

                const flipFn = (e) => {
                    e.stopPropagation();
                    flipWrapper.classList.toggle('is-flipped');
                };

                flipWrapper.addEventListener('click', flipFn);
                flipBtn.addEventListener('click', flipFn);
                flipBtn.style.display = 'inline-flex';

                const renderWrapper = document.querySelector('.visually-hidden');
                if (renderWrapper) renderWrapper.remove();


            } else {
                console.warn("Captured images not found in data, attempting to render and capture...");

                const frontCardRender = document.getElementById('front-card');
                const backCardRender = document.getElementById('back-card');
                if (!frontCardRender || !backCardRender) {
                    throw new Error("حاويات الرندر المخفية غير موجودة!");
                }

                console.log("Building card for capture...");
                await buildCardForRender(data);

                console.log("Capturing card images...");
                await captureAndDisplayCards();
            }

            console.log("Adding save button listeners...");
            addSaveButtonListeners();

            if (loader) loader.style.display = 'none';
            if (viewerContainer) viewerContainer.style.display = 'block';

        } catch (error) {
            console.error("Error processing card:", error);
            showLoadingError(error.message || 'حدث خطأ أثناء معالجة البطاقة.');
        }
    };

    // --- SAVE BUTTONS ---
    const addSaveButtonListeners = () => {
        const saveVcfBtn = document.getElementById('save-vcf-btn');
        const saveFrontPngBtn = document.getElementById('save-front-png-btn');
        const saveBackPngBtn = document.getElementById('save-back-png-btn');
        const savePdfBtn = document.getElementById('save-pdf-btn');

        if (saveVcfBtn) {
            saveVcfBtn.onclick = () => {
                try {
                    const vcfData = getVCardString();
                    if (!vcfData || vcfData.length < 20) {
                        alert("لا توجد بيانات كافية لحفظ جهة الاتصال.");
                        console.warn("Attempted to save VCF with insufficient data:", vcfData);
                        return;
                    }

                    const blob = new Blob([vcfData], { type: 'text/vcard;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    const filenameBase = (cardData && cardData.inputs && cardData.inputs['input-name']
                        ? cardData.inputs['input-name']
                        : 'contact'
                    ).replace(/[^a-z0-9]/gi, '_').toLowerCase();
                    link.download = `${filenameBase}.vcf`;

                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    console.log("VCF download initiated.");

                } catch (e) {
                    console.error("VCF save error:", e);
                    alert("حدث خطأ أثناء تجهيز ملف جهة الاتصال.");
                }
            };
        } else {
            console.warn("Save VCF button not found.");
        }

        const downloadCapturedImage = (cardFace) => {
            const imageContainer = cardFace === 'front'
                ? document.getElementById('card-front-display')
                : document.getElementById('card-back-display');

            if (!imageContainer) {
                console.error("Image container not found for download.");
                alert("خطأ: لم يتم العثور على حاوية صور البطاقة.");
                return;
            }

            // --- !! هذا هو التعديل الثالث - البحث عن <img> !! ---
            const imgElement = imageContainer.querySelector('img');

            if (imgElement && imgElement.src && (imgElement.src.startsWith('data:image/png') || imgElement.src.startsWith('http'))) {
                try {
                    const link = document.createElement('a');
                    link.href = imgElement.src;
                    link.setAttribute('download', '');

                    const filenameBase = (cardData && cardData.inputs && cardData.inputs['input-name']
                        ? cardData.inputs['input-name']
                        : 'card'
                    ).replace(/[^a-z0-9]/gi, '_').toLowerCase();
                    link.download = `${filenameBase}_${cardFace}.png`;

                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    console.log(`${cardFace} PNG download initiated.`);

                } catch (e) {
                    console.error(`${cardFace} PNG download error:`, e);
                    alert(`حدث خطأ أثناء تجهيز صورة الواجهة ${cardFace === 'front' ? 'الأمامية' : 'الخلفية'}.`);
                }
            } else {
                console.warn(`Captured image element for '${cardFace}' not found or has invalid src.`);
                alert(`لم يتم العثور على صورة البطاقة ${cardFace === 'front' ? 'الأمامية' : 'الخلفية'} أو أنها غير صالحة.`);
            }
        };

        if (saveFrontPngBtn) {
            saveFrontPngBtn.onclick = () => downloadCapturedImage('front');
        } else {
            console.warn("Save Front PNG button not found.");
        }
        if (saveBackPngBtn) {
            saveBackPngBtn.onclick = () => downloadCapturedImage('back');
        } else {
            console.warn("Save Back PNG button not found.");
        }


        if (savePdfBtn) {
            savePdfBtn.onclick = async () => {
                // --- !! هذا هو التعديل الرابع - البحث عن <img> للـ PDF !! ---
                const frontImgElement = document.getElementById('card-front-display')?.querySelector('img');
                const backImgElement = document.getElementById('card-back-display')?.querySelector('img');

                if (!frontImgElement || !frontImgElement.src || !backImgElement || !backImgElement.src) {
                    alert("لم يتم العثور على صور البطاقة الأمامية والخلفية أو أنها غير صالحة لإنشاء PDF.");
                    console.warn("Missing front or back image for PDF generation.");
                    return;
                }

                savePdfBtn.disabled = true;
                savePdfBtn.textContent = 'جاري الإنشاء...';

                try {
                    await loadScript(SCRIPT_URLS.jspdf);
                    const { jsPDF } = window.jspdf;

                    // المصدر الآن هو عنصر <img> مباشرة
                    const frontImg = frontImgElement;
                    const backImg = backImgElement;

                    // التأكد من تحميل الصور (احتياطي)
                    if (!frontImg.complete) await new Promise(resolve => frontImg.onload = resolve);
                    if (!backImg.complete) await new Promise(resolve => backImg.onload = resolve);

                    const imgWidth = frontImg.naturalWidth || 510 * 2;
                    const imgHeight = frontImg.naturalHeight || 330 * 2;
                    const pdfWidth = imgWidth * 0.75;
                    const pdfHeight = imgHeight * 0.75;

                    const orientation = pdfWidth > pdfHeight ? 'l' : 'p';

                    const doc = new jsPDF({
                        orientation: orientation,
                        unit: 'pt',
                        format: [pdfWidth, pdfHeight]
                    });

                    doc.addImage(frontImg.src, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
                    doc.addPage([pdfWidth, pdfHeight], orientation);
                    doc.addImage(backImg.src, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');

                    const filenameBase = (cardData && cardData.inputs && cardData.inputs['input-name']
                        ? cardData.inputs['input-name']
                        : 'card'
                    ).replace(/[^a-z0-9]/gi, '_').toLowerCase();
                    doc.save(`${filenameBase}.pdf`);

                    console.log("PDF download initiated.");

                } catch (error) {
                    console.error("PDF generation error:", error);
                    alert("حدث خطأ أثناء إنشاء ملف PDF.");
                } finally {
                    savePdfBtn.disabled = false;
                    savePdfBtn.innerHTML = '<i class="fas fa-file-pdf"></i> حفظ كـ PDF';
                }
            };
        } else {
            console.warn("Save PDF button not found.");
        }
    };

    // --- دالة تفعيل التبويبات للموبايل ---
    const setupMobileTabs = () => {
        const tabContainer = document.querySelector('.mobile-viewer-tabs');
        if (!tabContainer) return;

        const tabButtons = tabContainer.querySelectorAll('.mobile-tab-btn');
        const tabPanes = document.querySelectorAll('.viewer-layout > .side-column');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                tabPanes.forEach(pane => pane.classList.remove('active'));
                const targetPane = document.querySelector(button.dataset.tabTarget);
                if (targetPane) {
                    targetPane.classList.add('active');
                }
            });
        });
    };
    // --- نهاية الإضافة ---

    // --- INITIALIZATION ---
    const initializeViewer = async () => {

        setupThemeToggle();
        setupMobileTabs();

        try {
            let data = null;

            if (window.cardData && typeof window.cardData === 'object' && Object.keys(window.cardData).length > 0 && window.cardData.inputs) {
                console.log("Using embedded card data from window.cardData.");
                data = window.cardData;
            } else {
                console.log("Embedded data not found or invalid, fetching from API...");
                let cardId = null;
                const pathSegments = window.location.pathname.split('/');

                let relevantSegments = pathSegments.filter(p => p.toLowerCase() !== 'viewer.html');

                if (relevantSegments.length >= 3 && relevantSegments[relevantSegments.length - 2].toLowerCase() === 'view' && relevantSegments[relevantSegments.length - 1]) {
                    cardId = relevantSegments[relevantSegments.length - 1];
                    console.log(`Card ID found in path: ${cardId}`);
                } else {
                    cardId = new URLSearchParams(window.location.search).get('id');
                    if (cardId) {
                        console.log(`Card ID found in query parameter: ${cardId}`);
                    }
                }


                if (!cardId) {
                    throw new Error('لم يتم العثور على معرف البطاقة في الرابط. يرجى فتح رابط مشاركة صالح.');
                }

                const apiUrl = `${API_BASE_URL}/api/get-design/${cardId}`;
                console.log(`Fetching data from: ${apiUrl}`);
                const response = await fetch(apiUrl);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`Server response: ${response.status}`, errorText);
                    throw new Error(`فشل تحميل بيانات البطاقة (الحالة: ${response.status})`);
                }

                data = await response.json();
                console.log("Data fetched successfully from API.");
            }

            if (!data || typeof data !== 'object' || !data.inputs) {
                throw new Error("البيانات المستلمة غير صالحة أو فارغة.");
            }

            await processCardData(data);

        } catch (error) {
            console.error("Initialization failed:", error);
            showLoadingError(error.message || 'حدث خطأ غير متوقع أثناء تهيئة العارض.');
        }
    };

    // Start the process
    initializeViewer();
});