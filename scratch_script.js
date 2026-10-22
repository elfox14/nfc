
        // Haptic Feedback Engine
        function triggerHaptic(ms = 20) {
            if ('vibrate' in navigator) {
                try { navigator.vibrate(ms); } catch (e) {}
            }
        }

        // Custom Toast Engine
        function showToast(msg, type = 'success', duration = 3000) {
            const container = document.getElementById('toast-container');
            if (!container) return;
            const toast = document.createElement('div');
            toast.className = 'custom-toast toast-' + type;
            const icon = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle');
            toast.innerHTML = '<i class="fas ' + icon + '"></i><span>' + msg + '</span>';
            container.appendChild(toast);
            requestAnimationFrame(() => toast.classList.add('show'));
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 400);
            }, duration);
        }

        // Copy to Clipboard with Feedback
        function copyText(val, successMsg) {
            triggerHaptic(20);
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(val).then(() => {
                    showToast(successMsg || 'تم النسخ بنجاح 📋', 'success');
                }).catch(() => fallbackCopy(val, successMsg));
            } else {
                fallbackCopy(val, successMsg);
            }
        }

        function fallbackCopy(val, successMsg) {
            const el = document.createElement('textarea');
            el.value = val;
            el.style.position = 'fixed';
            el.style.opacity = '0';
            document.body.appendChild(el);
            el.select();
            try {
                document.execCommand('copy');
                showToast(successMsg || 'تم النسخ بنجاح 📋', 'success');
            } catch (e) {
                showToast('تعذر النسخ', 'error');
            }
            document.body.removeChild(el);
        }

        // Card Flip 3D
        const cardEl = document.getElementById('card');
        const flipBtn = document.getElementById('stage-flip-btn');

        function flipCard() {
            triggerHaptic(25);
            if (cardEl) cardEl.classList.toggle('is-flipped');
        }

        if (cardEl) {
            cardEl.addEventListener('click', function(e) {
                if (e.target.closest('a, button, input')) return;
                flipCard();
            });
        }
        if (flipBtn) flipBtn.addEventListener('click', flipCard);

        // 3D Mouse & Touch Tilt Physics
        const cardStage = document.getElementById('card-stage');
        const shadowReflect = document.getElementById('card-shadow-reflect');
        const sheens = document.querySelectorAll('.card-hologram-sheen');

        if (cardStage && cardEl) {
            cardStage.addEventListener('mousemove', function(e) {
                const rect = cardStage.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const cx = rect.width / 2;
                const cy = rect.height / 2;

                const rotX = ((y - cy) / cy) * -12;
                const rotY = ((x - cx) / cx) * 14;
                const isFlipped = cardEl.classList.contains('is-flipped');
                const baseRotateY = isFlipped ? 180 : 0;

                cardEl.style.transform = 'rotateX(' + rotX.toFixed(2) + 'deg) rotateY(' + (baseRotateY + rotY).toFixed(2) + 'deg)';

                if (shadowReflect) {
                    shadowReflect.style.transform = 'translateX(' + (-rotY * 1.5).toFixed(1) + 'px) scale(' + (1 - Math.abs(rotX)/35).toFixed(2) + ')';
                }

                const posX = ((x / rect.width) * 100).toFixed(1);
                const posY = ((y / rect.height) * 100).toFixed(1);
                sheens.forEach(s => {
                    s.style.backgroundPosition = posX + '% ' + posY + '%';
                    s.style.opacity = '0.8';
                });
            });

            cardStage.addEventListener('mouseleave', function() {
                const isFlipped = cardEl.classList.contains('is-flipped');
                const baseRotateY = isFlipped ? 180 : 0;
                cardEl.style.transform = 'rotateX(0deg) rotateY(' + baseRotateY + 'deg)';
                if (shadowReflect) shadowReflect.style.transform = 'translateX(0) scale(1)';
                sheens.forEach(s => {
                    s.style.backgroundPosition = '50% 50%';
                    s.style.opacity = '0.55';
                });
            });
        }

        // Pop-out Sheets Handler
        document.querySelectorAll('[data-sheet-target]').forEach(btn => {
            btn.addEventListener('click', function() {
                triggerHaptic(20);
                const targetId = this.getAttribute('data-sheet-target');
                const sheet = document.getElementById(targetId);
                if (sheet) sheet.classList.add('active');
            });
        });

        document.querySelectorAll('[data-close-sheet]').forEach(btn => {
            btn.addEventListener('click', function() {
                const targetId = this.getAttribute('data-close-sheet');
                const sheet = document.getElementById(targetId);
                if (sheet) sheet.classList.remove('active');
            });
        });

        document.querySelectorAll('.luxury-sheet-backdrop').forEach(backdrop => {
            backdrop.addEventListener('click', function(e) {
                if (e.target === this) this.classList.remove('active');
            });
        });

        // 1-Click Copy Buttons inside Sheets
        document.querySelectorAll('[data-copy-val]').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const val = this.getAttribute('data-copy-val');
                copyText(val, 'تم النسخ بنجاح 📋');
            });
        });

        // Modals Management
        function openModal(id) {
            triggerHaptic(20);
            const m = document.getElementById(id);
            if (m) {
                m.classList.add('show');
                document.body.style.overflow = 'hidden';
            }
        }

        function closeModal(id) {
            const m = document.getElementById(id);
            if (m) {
                m.classList.remove('show');
                document.body.style.overflow = '';
            }
        }

        document.getElementById('tile-exchange-btn')?.addEventListener('click', () => openModal('exchangeModal'));
        document.getElementById('ejs-footer-exchange-btn')?.addEventListener('click', () => openModal('exchangeModal'));
        document.getElementById('ejs-exchange-close-btn')?.addEventListener('click', () => closeModal('exchangeModal'));
        document.getElementById('exchangeModal')?.addEventListener('click', function(e) {
            if (e.target === this) closeModal('exchangeModal');
        });

        document.getElementById('tile-qr-btn')?.addEventListener('click', () => openModal('qrModal'));
        document.getElementById('ejs-qr-close-btn')?.addEventListener('click', () => closeModal('qrModal'));
        document.getElementById('qrModal')?.addEventListener('click', function(e) {
            if (e.target === this) closeModal('qrModal');
        });

        document.getElementById('tile-story-btn')?.addEventListener('click', () => {
            openModal('storyModal');
            drawStoryCanvas('luxury');
        });
        document.getElementById('ejs-story-close-btn')?.addEventListener('click', () => closeModal('storyModal'));
        document.getElementById('storyModal')?.addEventListener('click', function(e) {
            if (e.target === this) closeModal('storyModal');
        });

        // Save vCard Contact (Embedded Base64 Photo)
        const serverVCard = "";
        async function saveContact() {
            triggerHaptic(30);
            showToast('جاري تجهيز جهة الاتصال... ⏳', 'info', 1500);

            let vcf = serverVCard;
            if (!vcf || vcf.length < 20) {
                const n = "محمود ممدوح عيادة";
                const t = "ام سي برايم للتوريدات";
                const p = "";
                const em = "";
                vcf = 'BEGIN:VCARD\nVERSION:3.0\nFN:' + n + '\nN:' + n + ';;;;\n';
                if (t) vcf += 'TITLE:' + t + '\n';
                if (p) vcf += 'TEL;TYPE=CELL,VOICE;PREF=1:' + p + '\n';
                if (em) vcf += 'EMAIL;TYPE=INTERNET:' + em + '\n';
                vcf += 'END:VCARD\n';
            }

            try {
                const blob = new Blob([vcf], { type: 'text/vcard;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = ("محمود ممدوح عيادة" || 'contact').replace(/\s+/g, '_') + '.vcf';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast('تم تحميل جهة الاتصال بنجاح ✅', 'success');
            } catch (err) {
                showToast('تعذر حفظ جهة الاتصال', 'error');
            }
        }
        document.getElementById('ejs-save-btn')?.addEventListener('click', saveContact);

        // Native Web Share / Copy Link
        async function shareCard() {
            triggerHaptic(20);
            const shareData = {
                title: "محمود ممدوح عيادة",
                text: 'شاهد بطاقة عمل ' + "محمود ممدوح عيادة" + ' الذكية عبر MC PRIME',
                url: window.location.href
            };
            if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                try {
                    await navigator.share(shareData);
                } catch (e) {
                    if (e.name !== 'AbortError') copyText(window.location.href, 'تم نسخ رابط البطاقة 🔗');
                }
            } else {
                copyText(window.location.href, 'تم نسخ رابط البطاقة 🔗');
            }
        }
        document.getElementById('top-share-btn')?.addEventListener('click', shareCard);
        document.getElementById('ejs-share-btn')?.addEventListener('click', shareCard);
        document.getElementById('ejs-qr-copy-link-btn')?.addEventListener('click', () => copyText(window.location.href, 'تم نسخ الرابط 🔗'));

        // Story Canvas Generation
        const STORY_THEMES = {
            luxury: { bg: ['#060913', '#161f38'], accent: '#c5a059', text: '#ffffff', sub: '#cbd5e1' },
            cyberpunk: { bg: ['#050510', '#1a052e'], accent: '#00f0ff', text: '#ffffff', sub: '#ff0055' },
            emerald: { bg: ['#03140e', '#073322'], accent: '#10b981', text: '#ffffff', sub: '#a7f3d0' },
            obsidian: { bg: ['#020205', '#0f172a'], accent: '#38bdf8', text: '#ffffff', sub: '#94a3b8' },
            crimson: { bg: ['#120205', '#2e0712'], accent: '#f43f5e', text: '#ffffff', sub: '#fecdd3' },
            minimal: { bg: ['#0a0a0f', '#181824'], accent: '#ffffff', text: '#ffffff', sub: '#888899' }
        };

        let currentStoryTheme = 'luxury';
        document.querySelectorAll('.theme-pill-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.theme-pill-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentStoryTheme = this.getAttribute('data-theme');
                drawStoryCanvas(currentStoryTheme);
            });
        });

        async function drawStoryCanvas(themeKey) {
            const canvas = document.getElementById('ejs-story-canvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const th = STORY_THEMES[themeKey] || STORY_THEMES.luxury;

            // Background Gradient
            const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
            grad.addColorStop(0, th.bg[0]);
            grad.addColorStop(1, th.bg[1]);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Ambient Glow
            const glow = ctx.createRadialGradient(540, 600, 50, 540, 600, 500);
            glow.addColorStop(0, th.accent + '33');
            glow.addColorStop(1, 'transparent');
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Name & Title
            ctx.fillStyle = th.text;
            ctx.textAlign = 'center';
            ctx.font = '800 68px "Cairo", sans-serif';
            ctx.fillText("محمود ممدوح عيادة", 540, 480);

            ctx.fillStyle = th.accent;
            ctx.font = '600 36px "Tajawal", sans-serif';
            ctx.fillText("ام سي برايم للتوريدات", 540, 550);

            // QR Code in Story
            try {
                const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(window.location.href) + '&format=png&qzone=1';
                const qrImg = new Image();
                qrImg.crossOrigin = 'anonymous';
                qrImg.onload = () => {
                    ctx.save();
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.roundRect(380, 920, 320, 320, 24);
                    ctx.fill();
                    ctx.drawImage(qrImg, 400, 940, 280, 280);
                    ctx.restore();

                    ctx.fillStyle = th.sub;
                    ctx.font = '500 28px "Tajawal", sans-serif';
                    ctx.fillText('📱 امسح الكود للتواصل', 540, 1300);

                    // Call to Action Pill
                    ctx.fillStyle = th.accent;
                    ctx.beginPath();
                    ctx.roundRect(290, 1550, 500, 80, 40);
                    ctx.fill();
                    ctx.fillStyle = '#060913';
                    ctx.font = '800 32px "Tajawal", sans-serif';
                    ctx.fillText('اسحب للأعلى لزيارة بطاقتي ⬆', 540, 1602);
                };
                qrImg.src = qrUrl;
            } catch (e) {}
        }

        // Story Download & Share Handlers
        document.getElementById('ejs-story-download-btn')?.addEventListener('click', function() {
            triggerHaptic(20);
            const canvas = document.getElementById('ejs-story-canvas');
            if (!canvas) return;
            const a = document.createElement('a');
            a.download = 'story_card.png';
            a.href = canvas.toDataURL('image/png', 1.0);
            a.click();
            showToast('تم تحميل صورة الستوري 📸', 'success');
        });

        document.getElementById('ejs-story-share-btn')?.addEventListener('click', async function() {
            triggerHaptic(20);
            const canvas = document.getElementById('ejs-story-canvas');
            if (!canvas) return;
            try {
                const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
                const file = new File([blob], 'story_card.png', { type: 'image/png' });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({ files: [file], title: "محمود ممدوح عيادة", text: 'شاهد بطاقة عملي الذكية!' });
                } else {
                    document.getElementById('ejs-story-download-btn')?.click();
                }
            } catch (e) {
                if (e.name !== 'AbortError') showToast('فشلت المشاركة', 'error');
            }
        });

        // Exchange Lead Form Submission
        document.getElementById('exchange-lead-form')?.addEventListener('submit', async function(e) {
            e.preventDefault();
            triggerHaptic(25);
            const submitBtn = document.getElementById('lead-submit-btn');
            const originalText = submitBtn ? submitBtn.innerHTML : '';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>جاري الإرسال...</span>';
            }

            const nameVal = document.getElementById('lead-name')?.value?.trim() || '';
            const phoneVal = document.getElementById('lead-phone')?.value?.trim() || '';
            const emailVal = document.getElementById('lead-email')?.value?.trim() || '';
            const noteVal = document.getElementById('lead-note')?.value?.trim() || '';
            const cardId = "test";

            try {
                const res = await fetch('/nfc/api/leads/' + encodeURIComponent(cardId), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: nameVal, phone: phoneVal, email: emailVal, note: noteVal })
                });
                if (res.ok) {
                    showToast('تم إرسال بياناتك بنجاح ✅', 'success');
                    closeModal('exchangeModal');
                    document.getElementById('exchange-lead-form')?.reset();
                } else {
                    throw new Error('Server returned ' + res.status);
                }
            } catch (err) {
                const wa = "";
                if (wa) {
                    const msg = encodeURIComponent('مرحباً، أنا ' + nameVal + '\nرقمي: ' + phoneVal + (emailVal ? '\nإيميلي: ' + emailVal : '') + (noteVal ? '\nملاحظة: ' + noteVal : ''));
                    window.open('https://wa.me/' + wa + '?text=' + msg, '_blank');
                }
                showToast('تم استلام بياناتك بنجاح ✅', 'success');
                closeModal('exchangeModal');
                document.getElementById('exchange-lead-form')?.reset();
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }
            }
        });

        // WhatsApp Direct Lead
        document.getElementById('lead-wa-direct-btn')?.addEventListener('click', function() {
            triggerHaptic(20);
            const nameVal = document.getElementById('lead-name')?.value?.trim() || 'صديق جديد';
            const phoneVal = document.getElementById('lead-phone')?.value?.trim() || '';
            const emailVal = document.getElementById('lead-email')?.value?.trim() || '';
            const noteVal = document.getElementById('lead-note')?.value?.trim() || '';
            const wa = "";
            if (wa) {
                const msg = encodeURIComponent('مرحباً، تفضل بياناتي للتواصل:\nالاسم: ' + nameVal + '\nالهاتف: ' + phoneVal + (emailVal ? '\nالبريد: ' + emailVal : '') + (noteVal ? '\n' + noteVal : ''));
                window.open('https://wa.me/' + wa + '?text=' + msg, '_blank');
                closeModal('exchangeModal');
            }
        });

        // Multi-Language Switcher (AR / EN)
        const i18nDict = {
            ar: {
                langBtn: 'EN',
                flipBtn: 'تقليب 3D',
                inspectBtn: 'فحص ثلاثي الأبعاد',
                hdBtn: 'صورة HD',
                tileContact: 'الاتصال والتواصل',
                tileSocial: 'الشبكات المهنية',
                tileExchange: 'تبادل جهات الاتصال',
                tileExchangeSub: 'أرسل بياناتك للبقاء على تواصل',
                tileQr: 'رمز QR الذكي',
                tileQrSub: 'امسح الرمز بهاتفك',
                tileStory: 'مشاركة في الستوري',
                tileStorySub: '6 قوالب فاخرة للقصص',
                tileBio: 'الملف التعريفي',
                saveBtn: 'حفظ كجهة اتصال',
                exchangeShort: 'تبادل البيانات',
                verified: 'موثّق',
                statusText: 'متاح للأعمال والاستشارات',
                sheetContactTitle: 'وسائل الاتصال المباشرة',
                sheetSocialTitle: 'الشبكات المهنية والاجتماعية',
                exchangeTitle: 'تبادل جهات الاتصال'
            },
            en: {
                langBtn: 'عربي',
                flipBtn: 'Flip 3D',
                inspectBtn: 'Inspect 3D',
                hdBtn: 'HD Card',
                tileContact: 'Direct Contact',
                tileSocial: 'Social & Networks',
                tileExchange: 'Exchange Info',
                tileExchangeSub: 'Send your details to me',
                tileQr: 'Smart QR Code',
                tileQrSub: 'Scan code with phone',
                tileStory: 'Story Creator',
                tileStorySub: '6 Luxury Templates',
                tileBio: 'About Profile',
                saveBtn: 'Save Contact',
                exchangeShort: 'Exchange',
                verified: 'Verified',
                statusText: 'Available for Business',
                sheetContactTitle: 'Direct Contact Channels',
                sheetSocialTitle: 'Social & Professional Networks',
                exchangeTitle: 'Exchange Contact Info'
            }
        };

        let activeLang = document.documentElement.lang || 'ar';
        function toggleLanguage() {
            triggerHaptic(20);
            activeLang = activeLang === 'ar' ? 'en' : 'ar';
            document.documentElement.lang = activeLang;
            document.documentElement.dir = activeLang === 'ar' ? 'rtl' : 'ltr';

            const d = i18nDict[activeLang];
            const btnText = document.getElementById('lang-btn-text');
            if (btnText) btnText.textContent = d.langBtn;

            document.querySelectorAll('.i18n-flip-btn').forEach(el => el.textContent = d.flipBtn);
            document.querySelectorAll('.i18n-inspect-btn').forEach(el => el.textContent = d.inspectBtn);
            document.querySelectorAll('.i18n-hd-btn').forEach(el => el.textContent = d.hdBtn);
            document.querySelectorAll('.i18n-tile-contact').forEach(el => el.textContent = d.tileContact);
            document.querySelectorAll('.i18n-tile-social').forEach(el => el.textContent = d.tileSocial);
            document.querySelectorAll('.i18n-tile-exchange').forEach(el => el.textContent = d.tileExchange);
            document.querySelectorAll('.i18n-tile-exchange-sub').forEach(el => el.textContent = d.tileExchangeSub);
            document.querySelectorAll('.i18n-tile-qr').forEach(el => el.textContent = d.tileQr);
            document.querySelectorAll('.i18n-tile-qr-sub').forEach(el => el.textContent = d.tileQrSub);
            document.querySelectorAll('.i18n-tile-story').forEach(el => el.textContent = d.tileStory);
            document.querySelectorAll('.i18n-tile-story-sub').forEach(el => el.textContent = d.tileStorySub);
            document.querySelectorAll('.i18n-tile-bio').forEach(el => el.textContent = d.tileBio);
            document.querySelectorAll('.i18n-save-btn').forEach(el => el.textContent = d.saveBtn);
            document.querySelectorAll('.i18n-exchange-short').forEach(el => el.textContent = d.exchangeShort);
            document.querySelectorAll('.i18n-verified').forEach(el => el.textContent = d.verified);
            document.querySelectorAll('.i18n-status-text').forEach(el => el.textContent = d.statusText);
            document.querySelectorAll('.i18n-sheet-contact-title').forEach(el => el.textContent = d.sheetContactTitle);
            document.querySelectorAll('.i18n-sheet-social-title').forEach(el => el.textContent = d.sheetSocialTitle);
            document.querySelectorAll('.i18n-exchange-title').forEach(el => el.textContent = d.exchangeTitle);

            showToast(activeLang === 'ar' ? 'تم تحويل الواجهة إلى العربية' : 'Switched to English', 'info', 1800);
        }
        document.getElementById('ejs-lang-toggle')?.addEventListener('click', toggleLanguage);

        // QR Download PNG Handler
        document.getElementById('ejs-qr-download-btn')?.addEventListener('click', function() {
            triggerHaptic(20);
            const qrImg = document.getElementById('ejs-qr-img');
            if (!qrImg) return;
            const canvas = document.createElement('canvas');
            canvas.width = 500;
            canvas.height = 500;
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function() {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, 500, 500);
                ctx.drawImage(img, 25, 25, 450, 450);
                const a = document.createElement('a');
                a.download = 'business_card_qr.png';
                a.href = canvas.toDataURL('image/png');
                a.click();
                showToast('تم تحميل رمز QR بنجاح 📥', 'success');
            };
            img.onerror = function() {
                const a = document.createElement('a');
                a.download = 'business_card_qr.png';
                a.href = qrImg.src;
                a.target = '_blank';
                a.click();
            };
            img.src = qrImg.src;
        });

        // Stage HD Card Download
        document.getElementById('stage-download-png-btn')?.addEventListener('click', function() {
            triggerHaptic(20);
            showToast('اختر وجهاً لتحميله بدقة عالية 🖼️', 'info', 2000);
            const isFlipped = cardEl ? cardEl.classList.contains('is-flipped') : false;
            const bgImg = isFlipped ? "https://example.com/back.png" : "https://example.com/front.png";
            if (bgImg) {
                const a = document.createElement('a');
                a.href = bgImg;
                a.download = (isFlipped ? 'card_back.png' : 'card_front.png');
                a.target = '_blank';
                a.click();
            } else {
                showToast('انقر مطولاً على الكارت لحفظ صورته', 'info');
            }
        });
    