// viewer.js

// Auto-detect language and redirect first-time visitors
(function () {
    const LANG_REDIRECT_KEY = 'viewer_lang_redirected';

    // Check if already redirected in this session
    if (sessionStorage.getItem(LANG_REDIRECT_KEY)) return;

    // Get browser language preference
    const browserLang = (navigator.language || navigator.userLanguage || 'ar').split('-')[0].toLowerCase();
    const currentPage = window.location.pathname.split('/').pop() || 'viewer.html';
    const isCurrentlyEnglish = currentPage.includes('-en.html');
    const browserPrefersEnglish = browserLang === 'en';

    // Mark as redirected to prevent infinite loops
    sessionStorage.setItem(LANG_REDIRECT_KEY, 'true');

    // Redirect if needed
    if (browserPrefersEnglish && !isCurrentlyEnglish) {
        // Browser prefers English, but we're on Arabic page
        const newPage = currentPage.replace('.html', '-en.html');
        window.location.replace(newPage + window.location.search + window.location.hash);
    } else if (!browserPrefersEnglish && isCurrentlyEnglish) {
        // Browser prefers Arabic, but we're on English page
        const newPage = currentPage.replace('-en.html', '.html');
        window.location.replace(newPage + window.location.search + window.location.hash);
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    // Setup functions moved to bottom of this block
});

const API_BASE_URL = 'https://nfc-vjy6.onrender.com';
let cardData = null;
let cardId = null; // Store card ID for tracking

// Language detection and i18n support
const isEnglish = document.documentElement.lang === 'en';
const i18n = {
    loadingCard: isEnglish ? 'Loading card...' : 'جاري تحميل البطاقة...',
    loadingError: isEnglish ? 'Loading Error:' : 'خطأ في التحميل:',
    unexpectedError: isEnglish ? 'An unexpected error occurred.' : 'حدث خطأ غير متوقع.',
    defaultName: isEnglish ? 'Name' : 'الاسم',
    viewBusinessCard: isEnglish ? 'View Business Card →' : 'عرض بطاقة العمل →',
    signatureCopied: isEnglish ? '✅ Signature copied!\n\nYou can now go to your email settings (Outlook, Gmail) and paste the signature there.' : '✅ تم نسخ التوقيع!\n\nيمكنك الآن الذهاب إلى إعدادات بريدك الإلكتروني (Outlook, Gmail) ولصق التوقيع هناك.',
    copyFailed: isEnglish ? 'Automatic copy failed. Please try from another browser.' : 'تعذر النسخ التلقائي. يرجى المحاولة من متصفح آخر.',
    noContactData: isEnglish ? 'Not enough data to save contact.' : 'لا توجد بيانات كافية لحفظ جهة الاتصال.',
    contactFilePrepError: isEnglish ? 'An error occurred while preparing the contact file.' : 'حدث خطأ أثناء تجهيز ملف جهة الاتصال.',
    noLinksAvailable: isEnglish ? 'No links available' : 'لا توجد روابط متاحة',
    ownerHiddenContact: isEnglish ? 'The card owner chose not to display contact information here.' : 'صاحب البطاقة اختار عدم إظهار معلومات الاتصال هنا.',
    failedLoadHtml2canvas: isEnglish ? 'Failed to load image capture library' : 'فشل تحميل مكتبة التقاط الصور',
    cardElementsNotFound: isEnglish ? 'Card elements or display container not found' : 'لم يتم العثور على عناصر البطاقة أو حاوية العرض',
    failedCaptureCardImages: isEnglish ? 'Failed to capture card images' : 'فشل التقاط صور البطاقة',
    cardFront: isEnglish ? 'Front of the card' : 'الوجه الأمامي للبطاقة',
    cardBack: isEnglish ? 'Back of the card' : 'الوجه الخلفي للبطاقة',
    couldNotLoadCardData: isEnglish ? 'Could not load card data or data is invalid.' : 'لم نتمكن من تحميل بيانات البطاقة أو أن البيانات غير صالحة.',
    displayContainerNotFound: isEnglish ? 'Card display container not found!' : 'حاوية عرض صور البطاقة غير موجودة!',
    errorProcessingCard: isEnglish ? 'An error occurred while processing the card.' : 'حدث خطأ أثناء معالجة البطاقة.',
    cardImagesNotFound: isEnglish ? 'Card images not found.' : 'لم يتم العثور على صور البطاقة.',
    imagePreparationError: isEnglish ? 'An error occurred while preparing the image.' : 'حدث خطأ أثناء تجهيز صورة الواجهة.',
    cardImageNotFound: isEnglish ? 'Card image not found.' : 'لم يتم العثور على صورة البطاقة.',
    creatingPdf: isEnglish ? 'Creating...' : 'جاري الإنشاء...',
    savePdf: isEnglish ? '<i class="fas fa-file-pdf"></i> Save as PDF' : '<i class="fas fa-file-pdf"></i> حفظ كـ PDF',
    pdfCreationError: isEnglish ? 'An error occurred while creating the PDF file.' : 'حدث خطأ أثناء إنشاء ملف PDF.',
    cardIdNotFound: isEnglish ? 'Card ID not found.' : 'لم يتم العثور على معرف البطاقة.',
    failedLoadCardData: isEnglish ? 'Failed to load card data' : 'فشل تحميل بيانات البطاقة',
    receivedDataInvalid: isEnglish ? 'Received data is invalid.' : 'البيانات المستلمة غير صالحة.',
    linkedMembersTitle: isEnglish ? 'Linked Members' : 'أعضاء مرتبطون',
    loadingMembers: isEnglish ? 'Loading members...' : 'جاري تحميل الأعضاء...',
    viewMemberCard: isEnglish ? 'View Card' : 'عرض البطاقة',
    viewCard: (name, tagline) => {
        if (isEnglish) {
            return tagline ? `View Card: ${name} - ${tagline}` : `View Card: ${name}`;
        }
        return tagline ? `عرض بطاقة: ${name} - ${tagline}` : `عرض بطاقة: ${name}`;
    }
};

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

        // Add 15s timeout
        setTimeout(() => {
            if (!loadedScripts.has(url)) {
                reject(new Error(`Script load timeout: ${url}`));
            }
        }, 15000);
    });
}

// --- Analytics ---
const trackClick = (platform) => {
    if (!cardId) return;
    fetch(`${API_BASE_URL}/api/track-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            cardId: cardId,
            eventType: 'click',
            platform: platform
        })
    }).catch(err => console.warn("Tracking failed", err));
};

// --- Email Signature ---
const generateEmailSignature = () => {
    if (!cardData) return;
    const inputs = cardData.inputs || {};
    const name = inputs['input-name'] || i18n.defaultName;
    const tagline = inputs['input-tagline'] || '';
    const photoUrl = cardData.imageUrls.photo || 'https://via.placeholder.com/80';
    const cardUrl = window.location.href;

    const signatureHTML = `
        <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
            <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                    <td style="padding-right: 15px; vertical-align: middle;">
                        <img src="${photoUrl}" alt="${name}" width="80" height="80" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; display: block;">
                    </td>
                    <td style="border-left: 2px solid #4da6ff; padding-left: 15px; vertical-align: middle;">
                        <h3 style="margin: 0; font-size: 18px; color: #2a3d54; font-weight: bold;">${name}</h3>
                        <p style="margin: 4px 0; font-size: 14px; color: #666;">${tagline}</p>
                        <p style="margin: 8px 0 0 0;">
                            <a href="${cardUrl}" style="background-color: #4da6ff; color: #ffffff; text-decoration: none; padding: 6px 12px; border-radius: 4px; font-size: 12px; display: inline-block;">${i18n.viewBusinessCard}</a>
                        </p>
                    </td>
                </tr>
            </table>
        </div>
    `;

    const blob = new Blob([signatureHTML], { type: "text/html" });
    const clipboardItem = new ClipboardItem({ "text/html": blob });

    navigator.clipboard.write([clipboardItem]).then(() => {
        alert(i18n.signatureCopied);
        trackClick('save_email_signature');
    }).catch(err => {
        console.error("Copy failed:", err);
        alert(i18n.copyFailed);
    });
};

// --- VCARD GENERATION ---
const getVCardString = () => {
    if (!cardData) return '';
    const data = cardData;
    const inputs = data.inputs || {};
    const nameParts = (inputs['input-name'] || '').replace(/\\n/g, ' ').split(' ');
    const firstName = nameParts.slice(0, -1).join(' ');
    const lastName = nameParts.slice(-1).join(' ');

    let vCard = `BEGIN:VCARD\nVERSION:3.0\nN:${lastName};${firstName};;;\nFN:${inputs['input-name'] || ''}\n`;

    if (inputs['input-tagline']) {
        vCard += `TITLE:${inputs['input-tagline'].replace(/\\n/g, ' ')}\n`;
        vCard += `ORG:${inputs['input-tagline'].replace(/\\n/g, ' ')}\n`;
    }

    const dynamicData = data.dynamic || {};
    const staticSocial = dynamicData.staticSocial || {};

    if (staticSocial.email && staticSocial.email.value) {
        vCard += `EMAIL;TYPE=PREF,INTERNET:${staticSocial.email.value}\n`;
    }
    if (staticSocial.website && staticSocial.website.value) {
        let webUrl = staticSocial.website.value;
        if (!/^(https?:\/\/)/i.test(webUrl)) webUrl = 'https://' + webUrl;
        vCard += `URL:${webUrl}\n`;
    }
    if (staticSocial.whatsapp && staticSocial.whatsapp.value) {
        vCard += `TEL;TYPE=CELL,VOICE;PREF=1:${staticSocial.whatsapp.value.replace(/\D/g, '')}\n`;
    }
    if (dynamicData.phones) {
        const whatsappNumberClean = (staticSocial.whatsapp && staticSocial.whatsapp.value)
            ? staticSocial.whatsapp.value.replace(/\D/g, '') : '';
        dynamicData.phones.forEach((phone, index) => {
            if (phone && phone.value) {
                const phoneValueClean = phone.value.replace(/\D/g, '');
                if (phoneValueClean !== whatsappNumberClean) {
                    const pref = (index === 0 && !whatsappNumberClean) ? ';PREF=1' : '';
                    vCard += `TEL;TYPE=CELL,VOICE${pref}:${phoneValueClean}\n`;
                }
            }
        });
    }
    vCard += `END:VCARD\n`;
    return vCard;
};

const renderContactLinks = (data) => {
    const contactContainer = document.getElementById('contact-links-container');
    const socialContainer = document.getElementById('social-grid-container');
    const profileHeader = document.getElementById('profile-header');
    const profileName = document.getElementById('profile-name');
    const profileTagline = document.getElementById('profile-tagline');

    if (!contactContainer || !profileHeader || !profileName || !profileTagline) return;

    const inputs = data.inputs || {};

    const placeholderValues = [
        'اسمك الكامل هنا', 'اسمك الكامل', 'اسم البطاقة', 'المسمى الوظيفي / الشركة', 'المسمى الوظيفي',
        'your name here', 'your full name', 'job title'
    ];

    const isPlaceholder = (value) => {
        if (!value) return true;
        const lowerValue = value.toLowerCase().trim();
        return placeholderValues.some(p => lowerValue === p.toLowerCase());
    };

    let name = inputs['input-name'] || inputs['input-name_ar'] || inputs['input-name_en'] || '';
    let tagline = inputs['input-tagline'] || inputs['input-tagline_ar'] || inputs['input-tagline_en'] || '';

    if (isPlaceholder(name)) name = '';
    if (isPlaceholder(tagline)) tagline = '';

    if (name) {
        profileName.textContent = name;
        if (tagline && tagline.trim() !== '') {
            profileTagline.textContent = tagline;
            profileTagline.style.display = 'block';
        } else {
            profileTagline.style.display = 'none';
        }
        profileHeader.style.display = 'block';
    } else {
        profileHeader.style.display = 'none';
    }

    contactContainer.innerHTML = '';
    if (socialContainer) socialContainer.innerHTML = '';

    const showSocial = (inputs['toggle-master-social'] === undefined || inputs['toggle-master-social'] === true);
    if (!showSocial) {
        contactContainer.innerHTML = `
            <div class="no-links-message" style="margin-top: 20px; text-align: center; color: var(--text-secondary);">
                <i class="fas fa-eye-slash" style="font-size: 1.5rem; margin-bottom: 10px;"></i>
                <p>${i18n.ownerHiddenContact}</p>
            </div>
        `;
        const h2 = contactContainer.previousElementSibling;
        if (h2 && h2.tagName === 'H2') h2.style.display = 'none';
        return;
    }

    const dynamicData = data.dynamic || {};
    const staticSocial = dynamicData.staticSocial || {};

    const platforms = {
        whatsapp: { icon: 'fab fa-whatsapp', prefix: 'https://wa.me/', type: 'contact' },
        email: { icon: 'fas fa-envelope', prefix: 'mailto:', type: 'contact' },
        website: { icon: 'fas fa-globe', prefix: 'https://', type: 'contact' },
        location: { icon: 'fas fa-map-marker-alt', prefix: 'https://maps.google.com/?q=', type: 'contact' },

        facebook: { icon: 'fab fa-facebook-f', prefix: 'https://facebook.com/', type: 'social' },
        linkedin: { icon: 'fab fa-linkedin-in', prefix: 'https://linkedin.com/in/', type: 'social' },
        instagram: { icon: 'fab fa-instagram', prefix: 'https://instagram.com/', type: 'social' },
        x: { icon: 'fab fa-xing', prefix: 'https://x.com/', type: 'social' },
        twitter: { icon: 'fab fa-twitter', prefix: 'https://twitter.com/', type: 'social' },
        telegram: { icon: 'fab fa-telegram', prefix: 'https://t.me/', type: 'social' },
        tiktok: { icon: 'fab fa-tiktok', prefix: 'https://tiktok.com/@', type: 'social' },
        snapchat: { icon: 'fab fa-snapchat', prefix: 'https://snapchat.com/add/', type: 'social' },
        youtube: { icon: 'fab fa-youtube', prefix: 'https://youtube.com/', type: 'social' },
        pinterest: { icon: 'fab fa-pinterest', prefix: 'https://pinterest.com/', type: 'social' },
        discord: { icon: 'fab fa-discord', prefix: 'https://discord.gg/', type: 'social' },
        twitch: { icon: 'fab fa-twitch', prefix: 'https://twitch.tv/', type: 'social' },
        github: { icon: 'fab fa-github', prefix: 'https://github.com/', type: 'social' }
    };

    const createLinkElement = (key, value, platformTypeOverride = null) => {
        const platform = platforms[key] || { icon: 'fas fa-link', prefix: 'https://', type: 'contact' };
        if (!value) return null;

        const isSocial = platform.type === 'social' || platformTypeOverride === 'social';

        let fullUrl = value;
        let displayValue = value;

        if (key === 'email') {
            fullUrl = `${platform.prefix}${value}`;
        } else if (key === 'whatsapp' || key === 'phone') {
            fullUrl = `${platform.prefix}${value.replace(/\D/g, '')}`;
        } else {
            fullUrl = !/^(https?:\/\/)/i.test(value) ? `${platform.prefix}${value}` : value;
            displayValue = value.replace(/^(https?:\/\/)?(www\.)?/, '');
        }
        displayValue = displayValue.replace(/</g, "&lt;").replace(/>/g, "&gt;");

        const a = document.createElement('a');
        a.href = encodeURI(fullUrl);
        a.target = '_blank';
        a.rel = 'noopener noreferrer';

        a.addEventListener('click', () => trackClick(key));

        if (isSocial && socialContainer) {
            a.className = 'social-icon-btn';
            a.innerHTML = `<i class="${platform.icon}"></i>`;
            return { element: a, container: socialContainer };
        } else {
            a.className = 'contact-link';
            a.innerHTML = `<i class="${platform.icon}"></i><span>${displayValue}</span>`;
            return { element: a, container: contactContainer };
        }
    };

    Object.entries(staticSocial).forEach(([key, linkData]) => {
        if (linkData && linkData.value && platforms[key]) {
            const result = createLinkElement(key, linkData.value);
            if (result) result.container.appendChild(result.element);
        }
    });

    if (dynamicData.phones) {
        const whatsappNumberClean = (staticSocial.whatsapp && staticSocial.whatsapp.value)
            ? staticSocial.whatsapp.value.replace(/\D/g, '') : '';
        dynamicData.phones.forEach(phone => {
            if (phone && phone.value) {
                const phoneValueClean = phone.value.replace(/\D/g, '');
                if (phoneValueClean !== whatsappNumberClean) {
                    const sanitizedValue = phone.value.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    const a = document.createElement('a');
                    a.href = `tel:${phoneValueClean}`;
                    a.className = 'contact-link';
                    a.innerHTML = `<i class="fas fa-phone"></i><span>${sanitizedValue}</span>`;
                    a.addEventListener('click', () => trackClick('phone_call'));
                    contactContainer.appendChild(a);
                }
            }
        });
    }

    if (dynamicData.social) {
        dynamicData.social.forEach(link => {
            if (link && link.value && link.platform) {
                const result = createLinkElement(link.platform, link.value);
                if (result) result.container.appendChild(result.element);
            }
        });
    }
    if (contactContainer.children.length === 0 && (!socialContainer || socialContainer.children.length === 0)) {
        contactContainer.innerHTML = `<p style="text-align: center; color: var(--text-secondary);">${i18n.noLinksAvailable}</p>`;
    }
};

const buildCardForRender = async (data) => {
    if (!cardData) cardData = data;
    const state = data;
    const inputs = state.inputs || {};
    const dynamicData = state.dynamic || {};
    const positions = state.positions || {};
    const placements = state.placements || {};
    const imageUrls = state.imageUrls || {};

    const frontCardContainer = document.getElementById('front-card');
    const backCardContainer = document.getElementById('back-card');

    if (!frontCardContainer || !backCardContainer) throw new Error("Card rendering containers not found");

    const fontAwesomeLink = document.createElement('link');
    fontAwesomeLink.rel = 'stylesheet';
    fontAwesomeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    if (!document.querySelector('link[href*="font-awesome"]')) {
        document.head.appendChild(fontAwesomeLink);
    }

    try { await document.fonts.ready; } catch (e) { console.warn("Font loading error:", e); }
    await new Promise(resolve => setTimeout(resolve, 300));

    const getPositionStyle = (key) => {
        const pos = positions[key] || { x: 0, y: 0 };
        return `transform: translate(${pos.x}px, ${pos.y}px) !important;`;
    };

    const getPlacement = (key, defaultPlacement = 'front') => placements[key] || defaultPlacement;

    const renderElement = (elementHTML, placement, containerCollection) => {
        if (containerCollection[placement]) {
            containerCollection[placement].insertAdjacentHTML('beforeend', elementHTML);
        } else {
            containerCollection.front.insertAdjacentHTML('beforeend', elementHTML);
        }
    };

    const frontStartColor = inputs['front-bg-start'] || '#2a3d54';
    const frontEndColor = inputs['front-bg-end'] || '#223246';
    const backStartColor = inputs['back-bg-start'] || '#2a3d54';
    const backEndColor = inputs['back-bg-end'] || '#223246';
    const frontOpacity = inputs['front-bg-opacity'] !== undefined ? inputs['front-bg-opacity'] : 1;
    const backOpacity = inputs['back-bg-opacity'] !== undefined ? inputs['back-bg-opacity'] : 1;

    const frontBgImage = imageUrls.front ? `url(${imageUrls.front})` : 'none';
    const backBgImage = imageUrls.back ? `url(${imageUrls.back})` : 'none';

    frontCardContainer.innerHTML = `
        <div class="card-background-layer" style="background-image: ${frontBgImage} !important; background-size: cover; background-position: center;"></div>
        <div class="card-background-layer" style="background: linear-gradient(135deg, ${frontStartColor}, ${frontEndColor}) !important; opacity: ${frontOpacity} !important;"></div>
        <div class="card-content-layer" id="card-front-content-render"></div>
    `;

    backCardContainer.innerHTML = `
        <div class="card-background-layer" style="background-image: ${backBgImage} !important; background-size: cover; background-position: center;"></div>
        <div class="card-background-layer" style="background: linear-gradient(135deg, ${backStartColor}, ${backEndColor}) !important; opacity: ${backOpacity} !important;"></div>
        <div class="card-content-layer" id="card-back-content-render"></div>
    `;

    const containers = {
        front: document.getElementById('card-front-content-render'),
        back: document.getElementById('card-back-content-render')
    };

    if (inputs['input-logo']) {
        const logoSize = inputs['logo-size'] || 25;
        const logoOpacity = inputs['logo-opacity'] !== undefined ? inputs['logo-opacity'] : 1;
        const logoPos = getPositionStyle('card-logo');
        const logoPlacement = getPlacement('logo');
        const logoHTML = `<img src="${inputs['input-logo']}" alt="Logo" style="max-width: ${logoSize}% !important; max-height: ${logoSize * 1.5}% !important; object-fit: contain; opacity: ${logoOpacity} !important; position: absolute !important; ${logoPos}">`;
        renderElement(logoHTML, logoPlacement, containers);
    }

    if (inputs['input-photo-url']) {
        const photoSize = inputs['photo-size'] || 25;
        const photoShape = inputs['photo-shape'] === 'circle' ? '50%' : '8px';
        const photoBorderWidth = inputs['photo-border-width'] !== undefined ? inputs['photo-border-width'] : 2;
        const photoBorderColor = inputs['photo-border-color'] || '#ffffff';
        const photoBorder = `${photoBorderWidth}px solid ${photoBorderColor}`;
        const photoPos = getPositionStyle('card-personal-photo-wrapper');
        const photoPlacement = getPlacement('photo');
        const photoHTML = `<div style="width: ${photoSize}% !important; padding-top: ${photoSize}%; height: 0; background-image: url(${inputs['input-photo-url']}) !important; background-size: cover !important; background-position: center !important; border-radius: ${photoShape} !important; border: ${photoBorder} !important; position: absolute !important; overflow: hidden; ${photoPos}"></div>`;
        renderElement(photoHTML, photoPlacement, containers);
    }

    if (inputs['input-name']) {
        const nameSize = inputs['name-font-size'] || 22;
        const nameColor = inputs['name-color'] || '#e6f0f7';
        const nameFont = inputs['name-font'] || 'Tajawal, sans-serif';
        const namePos = getPositionStyle('card-name');
        const namePlacement = getPlacement('name');
        const displayName = (inputs['input-name'] || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const nameHTML = `<div id="card-name" style="font-size: ${nameSize}px !important; color: ${nameColor} !important; font-family: ${nameFont} !important; position: absolute !important; white-space: pre-wrap; word-break: break-word; ${namePos}">${displayName}</div>`;
        renderElement(nameHTML, namePlacement, containers);
    }

    if (inputs['input-tagline']) {
        const taglineSize = inputs['tagline-font-size'] || 14;
        const taglineColor = inputs['tagline-color'] || '#4da6ff';
        const taglineFont = inputs['tagline-font'] || 'Tajawal, sans-serif';
        const taglinePos = getPositionStyle('card-tagline');
        const taglinePlacement = getPlacement('tagline');
        const displayTagline = (inputs['input-tagline'] || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const taglineHTML = `<div id="card-tagline" style="font-size: ${taglineSize}px !important; color: ${taglineColor} !important; font-family: ${taglineFont} !important; position: absolute !important; white-space: pre-wrap; word-break: break-word; ${taglinePos}">${displayTagline}</div>`;
        renderElement(taglineHTML, taglinePlacement, containers);
    }

    // Phones, Socials, QR Code (omitted for brevity in this log, but they exist in memory from previous steps)
    // I will include them to be safe.
    if (dynamicData.phones && dynamicData.phones.length > 0) {
        const showAsButtons = inputs['toggle-phone-buttons'] !== undefined ? inputs['toggle-phone-buttons'] : true;
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
                phoneHTML = `<div class="phone-button-draggable-wrapper" data-layout="${phoneTextLayout}" style="position: absolute !important; ${wrapperPos}"><a href="${telLink}" class="phone-button" style="background-color: ${phoneBtnBg} !important; color: ${phoneBtnText} !important; border: 2px solid ${phoneBtnBg === 'transparent' || phoneBtnBg.includes('rgba(0,0,0,0)') ? phoneBtnText : 'transparent'} !important; font-size: ${phoneBtnSize}px !important; font-family: ${phoneBtnFont} !important; padding: ${phoneBtnPadding}px ${phoneBtnPadding * 2}px !important; border-radius: 50px; text-decoration: none; display: inline-flex; align-items: center; gap: 8px;"><i class="fas fa-phone-alt"></i><span>${sanitizedValue}</span></a></div>`;
            } else {
                phoneHTML = `<div class="phone-button-draggable-wrapper text-only-mode" data-layout="${phoneTextLayout}" style="position: absolute !important; ${wrapperPos}"><a href="${telLink}" class="phone-button" style="background-color: transparent !important; border: none !important; font-size: ${phoneTextSize}px !important; color: ${phoneTextColor} !important; font-family: ${phoneTextFont} !important; padding: 2px !important; text-decoration: none; display: inline-flex; align-items: center; gap: 5px;"><i class="fas fa-phone-alt" style="display:none;"></i> <span>${sanitizedValue}</span></a></div>`;
            }
            renderElement(phoneHTML, placement, containers);
        });
    }

    const showSocial = (inputs['toggle-master-social'] === undefined || inputs['toggle-master-social'] === true);
    if (showSocial) {
        const allSocialLinks = [];
        const staticSocial = dynamicData.staticSocial || {};
        const dynamicSocial = dynamicData.social || [];
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

        Object.entries(staticSocial).forEach(([key, linkData]) => {
            if (linkData && linkData.value && platforms[key]) {
                allSocialLinks.push({ id: `static-${key}`, value: linkData.value, placement: linkData.placement || 'back', position: linkData.position || { x: 0, y: 0 }, platformKey: key });
            }
        });
        dynamicSocial.forEach(linkData => {
            if (linkData && linkData.value && linkData.platform && platforms[linkData.platform]) {
                allSocialLinks.push({ id: linkData.id || `dynamic-${linkData.platform}-${Date.now()}`, value: linkData.value, placement: linkData.placement || 'back', position: linkData.position || { x: 0, y: 0 }, platformKey: linkData.platform });
            }
        });

        if (allSocialLinks.length > 0) {
            const showSocialButtons = inputs['toggle-social-buttons'] !== undefined ? inputs['toggle-social-buttons'] : true;
            const socialBtnBg = inputs['back-buttons-bg-color'] || '#364f6b';
            const socialBtnText = inputs['back-buttons-text-color'] || '#aab8c2';
            const socialBtnSize = inputs['back-buttons-size'] || 10;
            const socialBtnFont = inputs['back-buttons-font'] || 'Poppins, sans-serif';
            const socialTextSize = inputs['social-text-size'] || 12;
            const socialTextColor = inputs['social-text-color'] || '#e6f0f7';
            const socialTextFont = inputs['social-text-font'] || 'Tajawal, sans-serif';

            allSocialLinks.forEach(link => {
                const platform = platforms[link.platformKey];
                if (!platform) return;
                const pos = link.position || { x: 0, y: 0 };
                const placement = link.placement || 'back';
                const wrapperPos = `transform: translate(${pos.x}px, ${pos.y}px) !important;`;
                let value = link.value;
                let displayValue = value;
                let fullUrl = value;
                let prefix = platform.prefix || 'https://';
                if (link.platformKey === 'email') { fullUrl = `${prefix}${value}`; }
                else if (link.platformKey === 'whatsapp') { fullUrl = `${prefix}${value.replace(/\D/g, '')}`; }
                else { fullUrl = !/^(https?:\/\/)/i.test(value) ? `${prefix}${value}` : value; }
                if (link.platformKey !== 'email') { displayValue = displayValue.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, ''); }
                displayValue = displayValue.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                let socialHTML = '';
                if (showSocialButtons) {
                    socialHTML = `<div class="draggable-social-link" style="position: absolute !important; ${wrapperPos}"><a href="${encodeURI(fullUrl)}" target="_blank" rel="noopener noreferrer" style="background-color: ${socialBtnBg} !important; color: ${socialBtnText} !important; font-family: ${socialBtnFont} !important; font-size: ${socialBtnSize}px !important; padding: ${socialBtnSize * 0.5}px ${socialBtnSize}px !important; border-radius: 50px; text-decoration: none; display: inline-flex; align-items: center; gap: 8px;"><i class="${platform.icon}"></i><span>${displayValue}</span></a></div>`;
                } else {
                    socialHTML = `<div class="draggable-social-link text-only-mode" style="position: absolute !important; ${wrapperPos}"><a href="${encodeURI(fullUrl)}" target="_blank" rel="noopener noreferrer" style="background-color: transparent !important; border: none !important; font-family: ${socialTextFont} !important; padding: 2px !important; text-decoration: none; display: inline-flex; align-items: center; gap: 5px;"><i class="${platform.icon}" style="color: ${socialTextColor} !important; font-size: 1.2em;"></i><span style="font-size: ${socialTextSize}px !important; color: ${socialTextColor} !important;">${displayValue}</span></a></div>`;
                }
                renderElement(socialHTML, placement, containers);
            });
        }
    }

    let qrDataString = null;
    const qrSource = inputs['qr-source'] || 'auto-vcard';
    if (qrSource === 'custom') { qrDataString = inputs['input-qr-url']; }
    else if (qrSource === 'upload') { qrDataString = imageUrls.qrCode; }
    else if (qrSource === 'auto-vcard' || qrSource === 'auto-card') { qrDataString = getVCardString(); }

    if (qrDataString) {
        const qrSize = inputs['qr-size'] || 25;
        const qrPos = getPositionStyle('qr-code-wrapper');
        const qrPlacement = getPlacement('qr', 'back');
        let qrHTML = '';
        if (qrSource === 'custom' || qrSource === 'upload') {
            qrHTML = `<div id="qr-code-wrapper" style="width: ${qrSize}% !important; padding-top: ${qrSize}%; height: 0; position: absolute !important; ${qrPos}"><img src="${qrDataString}" alt="QR Code" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 4px; object-fit: contain; background: white; padding: 4px;"></div>`;
            renderElement(qrHTML, qrPlacement, containers);
        } else if (qrDataString.length > 20) {
            try {
                await loadScript(SCRIPT_URLS.qrcode);
                const tempQrDiv = document.createElement('div');
                tempQrDiv.style.position = 'absolute';
                tempQrDiv.style.left = '-9999px';
                document.body.appendChild(tempQrDiv);
                new QRCode(tempQrDiv, { text: qrDataString, width: 256, height: 256, colorDark: "#000000", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.H });
                await new Promise(resolve => setTimeout(() => {
                    const qrImgElement = tempQrDiv.querySelector('img');
                    const qrCanvasElement = tempQrDiv.querySelector('canvas');
                    let dataUrl = null;
                    if (qrImgElement && qrImgElement.src) { dataUrl = qrImgElement.src; }
                    else if (qrCanvasElement) { dataUrl = qrCanvasElement.toDataURL(); }
                    if (dataUrl) {
                        qrHTML = `<div id="qr-code-wrapper" style="width: ${qrSize}% !important; padding-top: ${qrSize}%; height: 0; position: absolute !important; ${qrPos}"><img src="${dataUrl}" alt="QR Code" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 4px; object-fit: contain; background: white; padding: 4px;"></div>`;
                        renderElement(qrHTML, qrPlacement, containers);
                    }
                    document.body.removeChild(tempQrDiv);
                    resolve();
                }, 300));
            } catch (error) {
                qrHTML = `<div id="qr-code-wrapper" style="width: ${qrSize}%; aspect-ratio: 1; position: absolute; ${qrPos} background: #eee; display: flex; align-items: center; justify-content: center; font-size: 10px; color: red; text-align: center; border-radius: 4px; padding: 5px;">QR Error</div>`;
                renderElement(qrHTML, qrPlacement, containers);
            }
        }
    }

    const allRenderedImages = [...containers.front.querySelectorAll('img'), ...containers.back.querySelectorAll('img')];
    await Promise.all(allRenderedImages.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = () => resolve();
            setTimeout(() => { if (!img.complete) resolve(); }, 5000);
        });
    }));
    await new Promise(resolve => setTimeout(resolve, 500));
};

const captureAndDisplayCards = async () => {
    try {
        await loadScript(SCRIPT_URLS.html2canvas);
    } catch (error) {
        throw new Error(i18n.failedLoadHtml2canvas);
    }

    const frontCardRenderArea = document.getElementById('front-card');
    const backCardRenderArea = document.getElementById('back-card');
    const frontDisplay = document.getElementById('card-front-display');
    const backDisplay = document.getElementById('card-back-display');
    const flipWrapper = document.getElementById('cards-wrapper-viewer');
    const flipBtn = document.getElementById('viewer-flip-btn');

    if (!frontCardRenderArea || !backCardRenderArea || !frontDisplay || !backDisplay || !flipWrapper || !flipBtn) {
        throw new Error(i18n.cardElementsNotFound);
    }

    const hiddenContainer = document.querySelector('.visually-hidden');
    const originalContainerStyles = hiddenContainer ? {
        position: hiddenContainer.style.position, width: hiddenContainer.style.width, height: hiddenContainer.style.height,
        margin: hiddenContainer.style.margin, padding: hiddenContainer.style.padding, overflow: hiddenContainer.style.overflow,
        clip: hiddenContainer.style.clip, clipPath: hiddenContainer.style.clipPath
    } : null;

    if (hiddenContainer) {
        hiddenContainer.style.position = 'fixed'; hiddenContainer.style.width = 'auto'; hiddenContainer.style.height = 'auto';
        hiddenContainer.style.margin = '0'; hiddenContainer.style.padding = '0'; hiddenContainer.style.overflow = 'visible';
        hiddenContainer.style.clip = 'auto'; hiddenContainer.style.clipPath = 'none';
        hiddenContainer.style.left = '0'; hiddenContainer.style.top = '0'; hiddenContainer.style.opacity = '0.01'; hiddenContainer.style.zIndex = '-9999';
    }

    frontCardRenderArea.style.position = 'relative'; frontCardRenderArea.style.left = '0'; frontCardRenderArea.style.top = '0'; frontCardRenderArea.style.visibility = 'visible';
    backCardRenderArea.style.position = 'relative'; backCardRenderArea.style.left = '0'; backCardRenderArea.style.top = '0'; backCardRenderArea.style.visibility = 'visible';

    await new Promise(resolve => setTimeout(resolve, 200));

    const isVerticalCard = document.getElementById('cards-wrapper-viewer')?.classList.contains('is-vertical');
    const captureOptions = {
        width: isVerticalCard ? 330 : 510, height: isVerticalCard ? 510 : 330, scale: 2, useCORS: true, allowTaint: false,
        backgroundColor: '#ffffff', logging: false, imageTimeout: 15000
    };

    try {
        const frontCanvas = await html2canvas(frontCardRenderArea, captureOptions);
        const backCanvas = await html2canvas(backCardRenderArea, captureOptions);

        if (hiddenContainer && originalContainerStyles) {
            hiddenContainer.style.position = originalContainerStyles.position || ''; hiddenContainer.style.width = originalContainerStyles.width || '';
            hiddenContainer.style.height = originalContainerStyles.height || ''; hiddenContainer.style.margin = originalContainerStyles.margin || '';
            hiddenContainer.style.padding = originalContainerStyles.padding || ''; hiddenContainer.style.overflow = originalContainerStyles.overflow || '';
            hiddenContainer.style.clip = originalContainerStyles.clip || ''; hiddenContainer.style.clipPath = originalContainerStyles.clipPath || '';
            hiddenContainer.style.left = ''; hiddenContainer.style.top = ''; hiddenContainer.style.opacity = ''; hiddenContainer.style.zIndex = '';
        }
        frontCardRenderArea.style.position = 'absolute'; frontCardRenderArea.style.left = '-9999px'; frontCardRenderArea.style.visibility = 'hidden';
        backCardRenderArea.style.position = 'absolute'; backCardRenderArea.style.left = '-9999px'; backCardRenderArea.style.visibility = 'hidden';

        frontDisplay.innerHTML = `<img src="${frontCanvas.toDataURL('image/png', 1.0)}" alt="${i18n.cardFront}">`;
        backDisplay.innerHTML = `<img src="${backCanvas.toDataURL('image/png', 1.0)}" alt="${i18n.cardBack}">`;

        const flipFn = (e) => { e.stopPropagation(); flipWrapper.classList.toggle('is-flipped'); };
        flipWrapper.addEventListener('click', flipFn);
        flipBtn.addEventListener('click', flipFn);
        flipBtn.style.display = 'inline-flex';

    } catch (error) {
        if (hiddenContainer && originalContainerStyles) {
            hiddenContainer.style.position = originalContainerStyles.position || ''; hiddenContainer.style.width = originalContainerStyles.width || '';
            hiddenContainer.style.height = originalContainerStyles.height || ''; hiddenContainer.style.margin = originalContainerStyles.margin || '';
            hiddenContainer.style.padding = originalContainerStyles.padding || ''; hiddenContainer.style.overflow = originalContainerStyles.overflow || '';
            hiddenContainer.style.clip = originalContainerStyles.clip || ''; hiddenContainer.style.clipPath = originalContainerStyles.clipPath || '';
            hiddenContainer.style.left = ''; hiddenContainer.style.top = ''; hiddenContainer.style.opacity = ''; hiddenContainer.style.zIndex = '';
        }
        frontCardRenderArea.style.position = 'absolute'; frontCardRenderArea.style.left = '-9999px'; frontCardRenderArea.style.visibility = 'hidden';
        backCardRenderArea.style.position = 'absolute'; backCardRenderArea.style.left = '-9999px'; backCardRenderArea.style.visibility = 'hidden';
        throw new Error(i18n.failedCaptureCardImages);
    }
};

const showLoadingError = (message) => {
    const loader = document.getElementById('loader');
    const viewerContainer = document.querySelector('.viewer-container');
    if (loader) {
        loader.innerHTML = `<p style="color: #dc3545; font-weight: bold;">${i18n.loadingError}</p><p>${message || i18n.unexpectedError}</p>`;
        loader.style.display = 'flex'; loader.style.flexDirection = 'column'; loader.style.alignItems = 'center'; loader.style.justifyContent = 'center';
    }
    if (viewerContainer) viewerContainer.style.display = 'none';
};

// --- Dynamic SEO ---
const updateMetaTag = (property, content) => {
    let meta = document.querySelector(`meta[property="${property}"]`) || document.querySelector(`meta[name="${property}"]`);
    if (meta) {
        meta.setAttribute('content', content);
    } else {
        meta = document.createElement('meta');
        if (property.startsWith('og:') || property.startsWith('article:')) {
            meta.setAttribute('property', property);
        } else {
            meta.setAttribute('name', property);
        }
        meta.setAttribute('content', content);
        document.head.appendChild(meta);
    }
};

const updatePageSEO = (data) => {
    try {
        const inputs = data.inputs || {};
        const name = inputs['input-name'] || 'MC PRIME Card';
        const tagline = inputs['input-tagline'] || '';
        const sanitizedName = name.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const sanitizedTagline = tagline.replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // Dynamic Title
        if (isEnglish) {
            document.title = tagline ? `${sanitizedName} - ${sanitizedTagline} | MC PRIME` : `${sanitizedName} | MC PRIME`;
        } else {
            document.title = tagline ? `${sanitizedName} - ${sanitizedTagline} | MC PRIME` : `بطاقة ${sanitizedName} | MC PRIME`;
        }

        // Dynamic Description
        const descContent = isEnglish
            ? `View ${sanitizedName}'s digital business card - ${sanitizedTagline}. Save contact and share easily via NFC with MC PRIME.`
            : `بطاقة عمل ${sanitizedName} الرقمية - ${sanitizedTagline}. احفظ جهة الاتصال وشارك بياناتك بسهولة عبر NFC مع MC PRIME.`;
        updateMetaTag('description', descContent);

        // Dynamic Canonical
        const currentUrl = window.location.href.split('#')[0];
        const canonical = document.getElementById('canonical-link');
        if (canonical) canonical.href = currentUrl;

        // Dynamic OG tags
        updateMetaTag('og:title', `${sanitizedName} | MC PRIME`);
        updateMetaTag('og:description', sanitizedTagline || descContent);
        updateMetaTag('og:url', currentUrl);
        if (data.imageUrls && data.imageUrls.photo) {
            updateMetaTag('og:image', data.imageUrls.photo);
        }

        // Dynamic Twitter tags
        updateMetaTag('twitter:title', `${sanitizedName} | MC PRIME`);
        updateMetaTag('twitter:description', sanitizedTagline || descContent);

        // Dynamic Schema.org
        const schemaScript = document.querySelector('script[type="application/ld+json"]');
        if (schemaScript) {
            try {
                const schema = JSON.parse(schemaScript.textContent);
                if (schema.mainEntity) {
                    schema.mainEntity.name = sanitizedName;
                    schema.mainEntity.description = sanitizedTagline || (isEnglish ? 'Smart NFC Business Card' : 'بطاقة عمل رقمية ذكية');
                    if (tagline) schema.mainEntity.jobTitle = sanitizedTagline;
                }
                schemaScript.textContent = JSON.stringify(schema);
            } catch (e) {
                console.warn('Schema.org update failed:', e);
            }
        }
    } catch (e) {
        console.warn('SEO update failed:', e);
    }
};

// --- Toast Notification ---
const showToast = (message, type = 'success') => {
    const toast = document.getElementById('viewer-toast');
    if (!toast) return;
    const icon = type === 'success' ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-exclamation-circle"></i>';
    toast.innerHTML = `${icon} ${message}`;
    toast.className = `viewer-toast ${type}`;
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => toast.classList.remove('show'), 3000);
};

// --- Swipe Gesture for Card Flip ---
const setupSwipeFlip = (wrapper) => {
    if (!wrapper) return;
    let startX = 0;
    let startY = 0;
    wrapper.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    }, { passive: true });
    wrapper.addEventListener('touchend', (e) => {
        const diffX = e.changedTouches[0].clientX - startX;
        const diffY = e.changedTouches[0].clientY - startY;
        // Only flip if horizontal swipe is dominant and exceeds threshold
        if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
            wrapper.classList.toggle('is-flipped');
        }
    }, { passive: true });
};

// --- 3D Tilt Effect for Desktop ---
const setup3DTilt = (wrapper) => {
    if (!wrapper || 'ontouchstart' in window) return; // Skip on touch devices
    wrapper.addEventListener('mousemove', (e) => {
        if (wrapper.classList.contains('is-flipped')) return;
        const rect = wrapper.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        wrapper.style.transform = `rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
    });
    wrapper.addEventListener('mouseleave', () => {
        wrapper.style.transform = '';
    });
};

const processCardData = async (data) => {
    const loader = document.getElementById('loader');
    const viewerContainer = document.querySelector('.viewer-container');

    if (!data || !data.inputs) {
        showLoadingError(i18n.couldNotLoadCardData);
        return;
    }

    // Update SEO with card data
    updatePageSEO(data);

    try {
        renderContactLinks(data);
    } catch (error) {
        console.error("Link render error", error);
    }

    // Render Linked Members (if any)
    const linkedMembersContainer = document.getElementById('linked-members-container');
    const linkedMembersSection = document.getElementById('linked-members-section');
    if (linkedMembersContainer && linkedMembersSection && data.linkedMembers && data.linkedMembers.length > 0) {
        linkedMembersSection.style.display = 'block';
        linkedMembersContainer.innerHTML = `<div class="linked-members-loading"><i class="fas fa-spinner fa-spin"></i><br>${i18n.loadingMembers}</div>`;

        try {
            // Fetch validation statuses
            const memberIds = data.linkedMembers.map(m => m.cardId);
            const response = await fetch(`${API_BASE_URL}/api/validate-linked-members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ memberIds })
            });

            if (!response.ok) throw new Error('Validation failed');
            const validMembers = await response.json();

            linkedMembersContainer.innerHTML = '';

            if (validMembers.length === 0) {
                linkedMembersSection.style.display = 'none';
            } else {
                validMembers.forEach(member => {
                    const avatarUrl = member.photoUrl || 'https://via.placeholder.com/100?text=' + member.name.charAt(0);
                    const tagline = member.tagline ? `<p class="linked-member-tagline">${member.tagline}</p>` : '';

                    const card = document.createElement('a');
                    card.className = 'linked-member-card glass-panel'; // Use glass panel style
                    card.href = `viewer.html?id=${member.cardId}`;
                    card.innerHTML = `
                        <div class="linked-member-avatar">
                            <img src="${avatarUrl}" alt="${member.name}" onerror="this.src='https://via.placeholder.com/100?text=${member.name.charAt(0)}'">
                        </div>
                        <div class="linked-member-info">
                            <h4 class="linked-member-name">${member.name}</h4>
                            ${tagline}
                        </div>
                        <i class="fas fa-arrow-right linked-member-arrow"></i>
                    `;
                    linkedMembersContainer.appendChild(card);
                });
            }
        } catch (err) {
            console.error("Error loading linked members:", err);
            linkedMembersSection.style.display = 'none';
        }
    }

    try {
        const renderTask = async () => {
            await buildCardForRender(data);
            await captureAndDisplayCards();
            if (loader) loader.style.display = 'none';
            if (viewerContainer) viewerContainer.style.display = 'flex';

            // Setup interactive features after card is loaded
            const flipWrapper = document.getElementById('cards-wrapper-viewer');
            setupSwipeFlip(flipWrapper);
            setup3DTilt(flipWrapper);
        };

        const timeoutTask = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Card processing timed out (25s)')), 25000);
        });

        await Promise.race([renderTask(), timeoutTask]);

    } catch (error) {
        console.error(error);
        if (error.message && error.message.includes('timeout')) {
            showLoadingError(`${i18n.loadingError} ${i18n.unexpectedError} (Timeout)`);
        } else {
            showLoadingError(`${i18n.errorProcessingCard}<br><br><span style="font-size: 0.8em; opacity: 0.8;">${error.message}</span>`);
        }
    }
};

const initViewer = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    cardId = urlParams.get('id');

    if (!cardId) {
        showLoadingError(i18n.cardIdNotFound);
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/cards/${cardId}`);
        if (!response.ok) throw new Error(i18n.failedLoadCardData);
        const data = await response.json();

        // Populate metadata
        if (data.inputs) {
            document.title = data.inputs['input-name'] || 'Digital Business Card';
        }

        await processCardData(data);

        // Setup Action Buttons
        document.getElementById('save-vcf-btn')?.addEventListener('click', () => {
            const vCardData = getVCardString();
            const blob = new Blob([vCardData], { type: 'text/vcard' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `contact-${cardId}.vcf`;
            a.click();
            trackClick('save_contact');
        });

        document.getElementById('save-front-png-btn')?.addEventListener('click', () => {
            const img = document.querySelector('#card-front-display img');
            if (img) {
                const a = document.createElement('a');
                a.href = img.src;
                a.download = `front-${cardId}.png`;
                a.click();
                trackClick('save_image');
            }
        });

        document.getElementById('save-back-png-btn')?.addEventListener('click', () => {
            const img = document.querySelector('#card-back-display img');
            if (img) {
                const a = document.createElement('a');
                a.href = img.src;
                a.download = `back-${cardId}.png`;
                a.click();
                trackClick('save_image');
            }
        });

        document.getElementById('save-pdf-btn')?.addEventListener('click', async () => {
            const btn = document.getElementById('save-pdf-btn');
            const originalText = btn.innerHTML;
            btn.innerHTML = i18n.creatingPdf;
            btn.disabled = true;

            try {
                await loadScript(SCRIPT_URLS.jspdf);
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();

                const frontImg = document.querySelector('#card-front-display img');
                const backImg = document.querySelector('#card-back-display img');

                if (frontImg) doc.addImage(frontImg.src, 'PNG', 10, 10, 90, 55);
                if (backImg) doc.addImage(backImg.src, 'PNG', 10, 70, 90, 55);

                doc.save(`card-${cardId}.pdf`);
                trackClick('save_pdf');
            } catch (e) {
                alert(i18n.pdfCreationError);
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });

        document.getElementById('save-email-sig-btn')?.addEventListener('click', generateEmailSignature);

    } catch (error) {
        console.error(error);
        showLoadingError(i18n.errorProcessingCard);
    }
};

// Start logic
document.addEventListener('DOMContentLoaded', () => {
    // --- Mobile Tab Navigation Logic ---
    const setupMobileTabs = () => {
        const tabBtns = document.querySelectorAll('.mobile-tab-btn');
        const sections = {
            '#right-column': document.getElementById('right-column'),
            '#left-column': document.getElementById('left-column'),
            '#cards-wrapper-viewer': document.querySelector('.center-column'),
            '#card-view-tab': document.querySelector('.center-column')
        };

        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const targetSelector = btn.getAttribute('data-tab-target');

                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                document.querySelectorAll('.mobile-active-section').forEach(el => el.classList.remove('mobile-active-section'));
                Object.values(sections).forEach(sec => {
                    if (sec) sec.classList.remove('mobile-active-section');
                });

                let targetEl = sections[targetSelector];
                if (!targetEl && targetSelector === '#cards-wrapper-viewer') targetEl = document.querySelector('.center-column');

                if (targetEl) {
                    targetEl.classList.add('mobile-active-section');
                }

                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });

        const activeBtn = document.querySelector('.mobile-tab-btn.active');
        if (activeBtn) {
            activeBtn.click();
        } else {
            const cardBtn = document.querySelector('.mobile-tab-btn[data-tab-target="#cards-wrapper-viewer"]');
            if (cardBtn) cardBtn.click();
        }
    };

    const setupThemeToggle = () => {
        const toggle = document.getElementById('theme-toggle');
        if (!toggle) return;
        const applyTheme = (theme) => {
            if (theme === 'dark') { document.documentElement.classList.add('dark-mode'); toggle.checked = true; }
            else { document.documentElement.classList.remove('dark-mode'); toggle.checked = false; }
        };
        let savedTheme = localStorage.getItem('theme');
        if (!savedTheme) savedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        applyTheme(savedTheme);
        toggle.addEventListener('change', () => {
            const newTheme = toggle.checked ? 'dark' : 'light';
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
        });
    };

    setupMobileTabs();
    setupThemeToggle();
    initViewer();
});