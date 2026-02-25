/**
 * Renderer V2 - Unified Element-based Renderer
 * Handles rendering of Spec V2 elements with responsive scaling support.
 */
const RendererV2 = {
    /**
     * Renders a side (front/back) into a container
     * @param {Object} sideData - The v2 side data { elements: [] }
     * @param {HTMLElement} container - The container to render into
     * @param {Object} canvasConfig - The canvas configuration { baseWidth, width, height }
     */
    render(sideData, container, canvasConfig) {
        if (!sideData || !container) return;

        // Clear existing v2 elements (keep legacy if needed, but here we replace)
        // We look for elements with class 'v2-element' to be selective
        const existing = container.querySelectorAll('.v2-element');
        existing.forEach(el => el.remove());

        const baseWidth = canvasConfig?.baseWidth || 510;
        const currentWidth = container.offsetWidth || baseWidth;
        const scale = currentWidth / baseWidth;

        if (!sideData.elements) return;

        sideData.elements.forEach(el => {
            if (el.visible === false) return;
            const domEl = this.createElement(el, scale);
            if (domEl) container.appendChild(domEl);
        });
    },

    /**
     * Creates a DOM element from v2 element data
     * @param {Object} data - Element data
     * @param {number} scale - Scale factor
     */
    createElement(data, scale) {
        let el;
        switch (data.type) {
            case 'text':
                el = document.createElement('div');
                if (data.bilingual) {
                    const ar = document.createElement('div');
                    ar.className = 'v2-text-ar';
                    ar.innerHTML = (data.contentAR || '').replace(/\n/g, '<br>');
                    const en = document.createElement('div');
                    en.className = 'v2-text-en';
                    en.innerHTML = (data.contentEN || '').replace(/\n/g, '<br>');
                    el.appendChild(ar);
                    el.appendChild(en);
                } else {
                    el.innerHTML = (data.content || '').replace(/\n/g, '<br>');
                }
                this.applyTextStyle(el, data.style, scale);
                break;
            case 'logo':
            case 'image':
                el = document.createElement('img');
                el.src = data.src;
                if (data.style?.objectFit) el.style.objectFit = data.style.objectFit;
                break;
            case 'avatar':
                el = document.createElement('div');
                el.style.backgroundImage = `url(${data.src})`;
                el.style.backgroundSize = 'cover';
                el.style.backgroundPosition = 'center';
                if (data.style?.borderRadius) el.style.borderRadius = data.style.borderRadius;
                if (data.style?.border) el.style.border = data.style.border;
                break;
            case 'qr':
                el = document.createElement('div');
                el.className = 'v2-qr-container';
                const img = document.createElement('img');
                img.src = data.src || 'https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=placeholder';
                img.style.width = '100%';
                img.style.height = '100%';
                el.appendChild(img);
                break;
            case 'button':
                el = document.createElement('a');
                el.className = 'v2-btn';
                el.href = data.action?.type === 'tel' ? `tel:${data.action.value}` : (data.action?.value || '#');
                el.innerHTML = data.content || '';
                this.applyButtonStyle(el, data.style, scale);
                break;
            case 'social':
                el = document.createElement('a');
                el.className = 'v2-social-btn';
                el.href = data.action?.value || '#';
                el.target = '_blank';
                this.applySocialStyle(el, data, scale);
                break;
            default:
                console.warn('Unknown element type:', data.type);
                return null;
        }

        if (el) {
            el.classList.add('v2-element');
            el.setAttribute('data-v2-id', data.id);
            this.applyTransform(el, data.transform, scale);
            this.applyEffects(el, data.effects, scale);
        }
        return el;
    },

    applyTransform(el, transform, scale) {
        if (!transform) return;
        el.style.position = 'absolute';
        el.style.left = '0';
        el.style.top = '0';
        el.style.width = (transform.w * scale) + 'px';
        el.style.height = (transform.h * scale) + 'px';

        // Use translate for performance and precision
        const x = (transform.x || 0) * scale;
        const y = (transform.y || 0) * scale;
        const rotate = transform.rotation || 0;
        el.style.transform = `translate(${x}px, ${y}px) rotate(${rotate}deg)`;

        if (transform.opacity !== undefined) el.style.opacity = transform.opacity;
        if (transform.zIndex !== undefined) el.style.zIndex = transform.zIndex;
    },

    applyTextStyle(el, style, scale) {
        if (!style) return;
        if (style.color) el.style.color = style.color;
        if (style.fontSize) el.style.fontSize = (style.fontSize * scale) + 'px';
        if (style.fontFamily) el.style.fontFamily = style.fontFamily;
        if (style.textAlign) el.style.textAlign = style.textAlign;
        if (style.fontWeight) el.style.fontWeight = style.fontWeight;
    },

    applyButtonStyle(el, style, scale) {
        if (!style) return;
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.textDecoration = 'none';
        if (style.backgroundColor) el.style.backgroundColor = style.backgroundColor;
        if (style.color) el.style.color = style.color;
        if (style.borderRadius) el.style.borderRadius = (parseFloat(style.borderRadius) * scale) + 'px';
        if (style.fontSize) el.style.fontSize = (style.fontSize * scale) + 'px';
        el.style.padding = `${5 * scale}px ${10 * scale}px`;
    },

    applySocialStyle(el, data, scale) {
        const style = data.style || {};
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.borderRadius = '50%';
        if (style.backgroundColor) el.style.backgroundColor = style.backgroundColor;
        if (style.color) el.style.color = style.color;

        // Inferred icon based on platform
        const icon = document.createElement('i');
        const platform = (data.platform || '').toLowerCase();
        icon.className = this.getIconClass(platform);
        icon.style.fontSize = (style.fontSize || 20) * scale + 'px';
        el.appendChild(icon);
    },

    applyEffects(el, effects, scale) {
        if (!effects) return;
        let filterStr = '';
        if (effects.grayscale) filterStr += `grayscale(${effects.grayscale}%) `;
        if (effects.blur) filterStr += `blur(${effects.blur * scale}px) `;
        if (effects.sepia) filterStr += `sepia(${effects.sepia}%) `;
        if (effects.invert) filterStr += `invert(${effects.invert}%) `;
        if (effects.brightness) filterStr += `brightness(${effects.brightness}%) `;
        if (effects.contrast) filterStr += `contrast(${effects.contrast}%) `;

        if (filterStr) el.style.filter = filterStr.trim();
        if (effects.glassEffect) {
            el.style.backdropFilter = 'blur(10px)';
            el.style.webkitBackdropFilter = 'blur(10px)';
            el.style.background = 'rgba(255, 255, 255, 0.1)';
            el.style.border = '1px solid rgba(255, 255, 255, 0.2)';
        }
    },

    getIconClass(platform) {
        const icons = {
            whatsapp: 'fab fa-whatsapp',
            facebook: 'fab fa-facebook-f',
            instagram: 'fab fa-instagram',
            twitter: 'fab fa-twitter',
            x: 'fab fa-xing',
            linkedin: 'fab fa-linkedin-in',
            telegram: 'fab fa-telegram',
            tiktok: 'fab fa-tiktok',
            youtube: 'fab fa-youtube',
            email: 'fas fa-envelope',
            website: 'fas fa-globe'
        };
        return icons[platform] || 'fas fa-link';
    }
};

// Auto-export for global use or module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RendererV2;
} else {
    window.RendererV2 = RendererV2;
}
