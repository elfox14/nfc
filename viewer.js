document.addEventListener('DOMContentLoaded', () => {
    const loader = document.getElementById('loader');
    const viewerContainer = document.querySelector('.viewer-container');
    const cardsWrapper = document.getElementById('cards-wrapper');
    const mobileFlipBtn = document.getElementById('mobile-flip-btn');
    
    // --- بداية التعديل ---
    // تم تعطيل هذه الشيفرة لإظهار جميع أقسام الصفحة (CTA, Save Options, Footer) بشكل دائم
    /*
    const isPresentationMode = window.location.pathname.includes('viewer.html');
    if (isPresentationMode) {
        const ctaSection = document.querySelector('.cta-section');
        const saveOptions = document.querySelector('.save-options');
        const footer = document.querySelector('footer');

        // إخفاء الأقسام غير المرغوب فيها
        if (ctaSection) ctaSection.style.display = 'none';
        if (saveOptions) saveOptions.style.display = 'none';
        if (footer) footer.style.display = 'none';

        // تعديل التنسيق لتوسيط الكارت في الصفحة
        if (viewerContainer) {
            viewerContainer.style.justifyContent = 'center';
            viewerContainer.style.minHeight = 'calc(100vh - 40px)'; 
        }
    }
    */
    // --- نهاية التعديل ---

    const API_BASE_URL = 'https://nfc-vjy6.onrender.com';
    
    let cardData = null;

    // --- START: On-Demand Script Loading Logic ---
    const loadedScripts = new Set();
    const SCRIPT_URLS = {
        html2canvas: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
        jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
        qrcode: 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
    };

    function loadScript(url) {
        if (loadedScripts.has(url)) {
            return Promise.resolve(); // Script is already loaded
        }
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
    // --- END: On-Demand Script Loading Logic ---

    const captureAndDownload = async (element, filename, scale = 2) => {
        try {
            // html2canvas is now loaded on-demand via the event listener
            const canvas = await html2canvas(element, { backgroundColor: '#FFFFFF', scale, useCORS: true });
            const link = document.createElement('a');
            link.download = filename;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error('Failed to capture element:', error);
            alert('حدث خطأ أثناء حفظ الصورة.');
        }
    };

    const saveAsPdf = async () => {
        const front = document.getElementById('card-front-preview');
        const back = document.getElementById('card-back-preview');
        if (!front || !back) return;
        
        try {
            // jspdf and html2canvas are now loaded on-demand
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'landscape', unit: 'px', format: [510, 330] });
            const frontCanvas = await html2canvas(front, { scale: 2, useCORS: true, backgroundColor: null });
            doc.addImage(frontCanvas.toDataURL('image/png'), 'PNG', 0, 0, 510, 330);
            doc.addPage();
            const backCanvas = await html2canvas(back, { scale: 2, useCORS: true, backgroundColor: null });
            doc.addImage(backCanvas.toDataURL('image/png'), 'PNG', 0, 0, 510, 330);
            doc.save('business-card.pdf');
        } catch(e) {
            console.error('PDF export failed:', e);
            alert('فشل تصدير PDF.');
        }
    };
    
    const getVCardString = () => {
        if (!cardData) return '';
        const data = cardData;
        const name = (data.inputs['input-name'] || '').replace(/\n/g, ' ').split(' ');
        const firstName = name.slice(0, -1).join(' ');
        const lastName = name.slice(-1).join(' ');
        
        let vCard = `BEGIN:VCARD\nVERSION:3.0\nN:${lastName};${firstName};;;\nFN:${data.inputs['input-name']}\n`;
        if (data.inputs['input-tagline']) vCard += `TITLE:${data.inputs['input-tagline'].replace(/\n/g, ' ')}\nORG:${data.inputs['input-tagline'].replace(/\n/g, ' ')}\n`;
        if (data.inputs['input-email']) vCard += `EMAIL;TYPE=PREF,INTERNET:${data.inputs['input-email']}\n`;
        if (data.inputs['input-website']) vCard += `URL:${data.inputs['input-website']}\n`;
        
        if (data.dynamic && data.dynamic.phones) {
            data.dynamic.phones.forEach((phone, index) => {
                if(phone) vCard += `TEL;TYPE=CELL${index === 0 ? ',PREF' : ''}:${phone}\n`;
            });
        }
        
        if (data.dynamic && data.dynamic.social) {
            data.dynamic.social.forEach(linkEl => {
                const platformKey = linkEl.platform;
                const value = linkEl.value;
                const platform = { prefix: `https://${platformKey}.com/` }; 
                if(platformKey && value) {
                    let fullUrl = !/^(https?:\/\/)/i.test(value) ? platform.prefix + value : value;
                    vCard += `URL;TYPE=${platformKey}:${fullUrl}\n`;
                }
            });
        }

        vCard += `END:VCARD`;
        return vCard;
    };

    const saveAsVcf = () => {
        const vcfData = getVCardString();
        if (!vcfData) {
            alert('لا توجد بيانات كافية لحفظ جهة الاتصال.');
            return;
        }
        const blob = new Blob([vcfData], { type: 'text/vcard' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'contact.vcf';
        link.click();
        URL.revokeObjectURL(url);
    };

    const buildCard = (data) => {
        cardData = data;
        
        const layout = data.inputs['layout-select'] || 'classic';
        cardsWrapper.setAttribute('data-layout', layout);

        // ALT TEXT: Improved alt text for the logo
        const logoAltText = `شعار ${data.inputs['input-tagline'] || data.inputs['input-name']}`;

        
const frontHtml = `
            <div class="business-card" id="card-front-preview">
                <div class="card-background-layer" style="background-image: url(${data.imageUrls.front || ''});"></div>
                <div class="card-background-layer" style="background-image: linear-gradient(135deg, ${data.inputs['front-bg-start']}, ${data.inputs['front-bg-end']}); opacity: ${data.inputs['front-bg-opacity']};"></div>
                <div class="card-content-layer card-front">
                    <div id="front-dyn"></div>
                </div>
            </div>`;


        
const backHtml = `
            <div class="business-card" id="card-back-preview">
                <div class="card-background-layer" style="background-image: url(${data.imageUrls.back || ''});"></div>
                <div class="card-background-layer" style="background-image: linear-gradient(135deg, ${data.inputs['back-bg-start']}, ${data.inputs['back-bg-end']}); opacity: ${data.inputs['back-bg-opacity']};"></div>
                <div class="card-content-layer card-back" id="card-back-content"></div>
            </div>`;


        cardsWrapper.innerHTML = frontHtml + backHtml;
        const frontDyn = document.getElementById('front-dyn');
        const backContent = document.getElementById('card-back-content');
        const pLogo = data.inputs['place-logo']||'front';
        const pIdentity = data.inputs['place-identity']||'front';
        const pPhones = data.inputs['place-phones']||'front';

        
        // Logo
        const logoEl = document.createElement('img');
        logoEl.src = data.inputs['input-logo'];
        logoEl.alt = `شعار ${data.inputs['input-tagline'] || data.inputs['input-name']}`;
        logoEl.className = 'logo-front';
        logoEl.style.maxWidth = data.inputs['logo-size'] + '%';
        logoEl.style.opacity = data.inputs['logo-opacity'];
        (pLogo==='back'? backContent: frontDyn).appendChild(logoEl);

        // Identity
        const idWrap = document.createElement('div');
        idWrap.className = 'identity-front';
        idWrap.innerHTML = `<h1 id="card-name" style="font-size:${data.inputs['name-font-size']}px;color:${data.inputs['name-color']};font-family:${data.inputs['name-font']};">${data.inputs['input-name']}</h1>
                            <h2 class="tagline" id="card-tagline" style="font-size:${data.inputs['tagline-font-size']}px;color:${data.inputs['tagline-color']};font-family:${data.inputs['tagline-font']};">${data.inputs['input-tagline']}</h2>`;
        (pIdentity==='back'? backContent: frontDyn).appendChild(idWrap);

        // Phones
        const phoneWrap = document.createElement('div');
        phoneWrap.className = 'phone-buttons-wrapper';
        phoneWrap.innerHTML = (data.dynamic.phones || []).map(phone => {
            const bgColor = data.inputs['phone-btn-bg-color'];
            const textColor = data.inputs['phone-btn-text-color'];
            return `<a href="tel:${phone}" class="phone-button" style="background-color:${bgColor};color:${textColor};border-color:${bgColor === 'transparent' ? textColor : 'transparent'};font-size:${data.inputs['phone-btn-font-size']}px;padding:${data.inputs['phone-btn-padding']}px ${data.inputs['phone-btn-padding'] * 2}px;font-family:${data.inputs['phone-btn-font']};">${phone}</a>`
        }).join('');
        (pPhones==='back'? backContent: frontDyn).appendChild(phoneWrap);

        buildBackCardContent(data);

    };

    const buildBackCardContent = (data) => {
        const cardBackContent = (data.inputs['place-qr']==='front' || data.inputs['place-contacts']==='front') ? document.getElementById('front-dyn') : document.getElementById('card-back-content');
        if (!cardBackContent) return;
        
        const qrSource = data.inputs['qr-source'];
        const qrWrapper = document.createElement('div');
        
        qrWrapper.style.backgroundColor = 'white';
        qrWrapper.style.padding = '5px';
        qrWrapper.style.borderRadius = '8px';
        qrWrapper.style.width = `${data.inputs['qr-size']}%`;
        qrWrapper.style.aspectRatio = '1 / 1';
        qrWrapper.style.display = 'flex';
        qrWrapper.style.justifyContent = 'center';
        qrWrapper.style.alignItems = 'center';
        
        let qrContentAdded = false;

        // ALT TEXT: Improved alt text for the QR code
        const qrAltText = `رمز QR Code لبطاقة ${data.inputs['input-name']}`;

        if (qrSource === 'custom' || qrSource === 'upload') {
            const qrImageSrc = (qrSource === 'custom') ? data.inputs['input-qr-url'] : data.imageUrls.qrCode;
            if (qrImageSrc) {
                const qrImage = document.createElement('img');
                qrImage.src = qrImageSrc;
                qrImage.alt = qrAltText;
                qrImage.style.width = '100%';
                qrImage.style.height = '100%';
                qrImage.style.borderRadius = '4px';
                qrWrapper.appendChild(qrImage);
                qrContentAdded = true;
            }
        } else {
            // Defer loading qrcode.js
            loadScript(SCRIPT_URLS.qrcode)
                .then(() => {
                    if (qrSource === 'auto-vcard') {
                        const vCardData = getVCardString();
                        if (vCardData.length > 30) { 
                            new QRCode(qrWrapper, { text: vCardData, width: 128, height: 128, correctLevel: QRCode.CorrectLevel.H });
                        }
                    } else if (qrSource === 'auto-card') {
                        const cardUrl = window.location.href;
                        new QRCode(qrWrapper, { text: cardUrl, width: 128, height: 128, correctLevel: QRCode.CorrectLevel.H });
                    }
                    // Add alt text if the library generates an img tag
                    const generatedImg = qrWrapper.querySelector('img');
                    if (generatedImg) {
                        generatedImg.alt = qrAltText;
                    }
                })
                .catch(error => console.error('Failed to load QRCode.js', error));
            qrContentAdded = true;
        }

        if (qrContentAdded) {
            if (cardBackContent && cardBackContent.id==='card-back-content') { const wrap=document.createElement('div'); wrap.className='back-section'; wrap.appendChild(qrWrapper); cardBackContent.appendChild(wrap);} else { cardBackContent.appendChild(qrWrapper);}
        }
        
        const contactsWrapper = document.createElement('div');
        contactsWrapper.className = 'contact-icons-wrapper';

        const socialPlatforms = {
            email: { icon: 'fas fa-envelope', prefix: 'mailto:' },
            website: { icon: 'fas fa-globe', prefix: ''},
            whatsapp: { icon: 'fab fa-whatsapp', prefix: 'https://wa.me/' },
            facebook: { icon: 'fab fa-facebook-f', prefix: ''},
            linkedin: { icon: 'fab fa-linkedin-in', prefix: ''},
            instagram: { icon: 'fab fa-instagram', prefix: ''},
            x: { icon: 'fab fa-xing', prefix: '' },
            telegram: { icon: 'fab fa-telegram', prefix: '' },
            tiktok: { icon: 'fab fa-tiktok', prefix: '' },
            snapchat: { icon: 'fab fa-snapchat', prefix: '' },
            youtube: { icon: 'fab fa-youtube', prefix: '' },
            pinterest: { icon: 'fab fa-pinterest', prefix: '' },
        };

        const renderLink = (value, platform) => {
            let fullUrl = value.startsWith('http') || value.startsWith('mailto:') ? value : (platform.prefix || 'https://') + value;
            return `<a href="${fullUrl}" target="_blank" rel="noopener noreferrer" style="background-color: ${data.inputs['back-buttons-bg-color']}; color: ${data.inputs['back-buttons-text-color']}; font-size: ${data.inputs['back-buttons-size']}px; font-family: ${data.inputs['back-buttons-font']};">
                        <i class="${platform.icon}"></i>
                    </a>`;
        };
        
        let linksHtml = '';
        if (data.inputs['input-email']) linksHtml += renderLink(data.inputs['input-email'], socialPlatforms.email);
        if (data.inputs['input-website']) linksHtml += renderLink(data.inputs['input-website'], socialPlatforms.website);
        if (data.inputs['input-whatsapp']) linksHtml += renderLink(data.inputs['input-whatsapp'], socialPlatforms.whatsapp);
        if (data.inputs['input-facebook']) linksHtml += renderLink(data.inputs['input-facebook'], socialPlatforms.facebook);
        if (data.inputs['input-linkedin']) linksHtml += renderLink(data.inputs['input-linkedin'], socialPlatforms.linkedin);
        
        (data.dynamic.social || []).forEach(social => {
            const platform = socialPlatforms[social.platform];
            if (platform) {
                linksHtml += renderLink(social.value, platform);
            }
        });
        
        contactsWrapper.innerHTML = linksHtml;
        if (cardBackContent && cardBackContent.id==='card-back-content') { const wrap=document.createElement('div'); wrap.className='back-section'; wrap.appendChild(contactsWrapper); cardBackContent.appendChild(wrap);} else { cardBackContent.appendChild(contactsWrapper);}
    };

    const loadCardData = async () => {
        const params = new URLSearchParams(window.location.search);
        const cardId = params.get('id');

        if (!cardId) {
            loader.innerHTML = '<h1>لم يتم العثور على البطاقة</h1><p>الرابط غير صحيح أو ناقص.</p>';
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/get-design/${cardId}`);
            if (!response.ok) {
                throw new Error('Card not found');
            }
            const data = await response.json();
            buildCard(data);
            
            loader.style.display = 'none';
            viewerContainer.style.display = 'flex';

            // --- START: Modified Event Listeners for On-Demand Loading ---
            const saveFrontBtn = document.getElementById('save-front-png-btn');
            if (saveFrontBtn) {
                saveFrontBtn.addEventListener('click', async (e) => {
                    e.currentTarget.disabled = true;
                    try {
                        await loadScript(SCRIPT_URLS.html2canvas);
                        await captureAndDownload(document.getElementById('card-front-preview'), 'card-front.png');
                    } catch (error) {
                        console.error('Failed to prepare for PNG export:', error);
                        alert('فشل تحميل أداة الحفظ. يرجى المحاولة مرة أخرى.');
                    } finally {
                        e.currentTarget.disabled = false;
                    }
                });
            }

            const saveBackBtn = document.getElementById('save-back-png-btn');
            if (saveBackBtn) {
                saveBackBtn.addEventListener('click', async (e) => {
                    e.currentTarget.disabled = true;
                    try {
                        await loadScript(SCRIPT_URLS.html2canvas);
                        await captureAndDownload(document.getElementById('card-back-preview'), 'card-back.png');
                    } catch (error) {
                        console.error('Failed to prepare for PNG export:', error);
                        alert('فشل تحميل أداة الحفظ. يرجى المحاولة مرة أخرى.');
                    } finally {
                        e.currentTarget.disabled = false;
                    }
                });
            }

            const savePdfBtn = document.getElementById('save-pdf-btn');
            if(savePdfBtn) {
                savePdfBtn.addEventListener('click', async (e) => {
                    e.currentTarget.disabled = true;
                    try {
                        await Promise.all([
                            loadScript(SCRIPT_URLS.html2canvas),
                            loadScript(SCRIPT_URLS.jspdf)
                        ]);
                        await saveAsPdf();
                    } catch (error) {
                        console.error('Failed to prepare for PDF export:', error);
                        alert('فشل تحميل أداة تصدير PDF. يرجى المحاولة مرة أخرى.');
                    } finally {
                        e.currentTarget.disabled = false;
                    }
                });
            }
            // --- END: Modified Event Listeners ---
            
            const saveVcfBtn = document.getElementById('save-vcf-btn');
            if(saveVcfBtn) {
                saveVcfBtn.addEventListener('click', saveAsVcf);
            }


            if (mobileFlipBtn) {
                mobileFlipBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    cardsWrapper.classList.toggle('is-flipped');
                });
            }

        } catch (error) {
            console.error(error);
            loader.innerHTML = '<h1>خطأ</h1><p>لم نتمكن من تحميل بيانات البطاقة.</p>';
        }
    };

    loadCardData();
});