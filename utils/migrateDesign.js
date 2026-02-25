function generateId(prefix) {
    return prefix + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Converts legacy design data (v1) to Element-centric Design Model (v2)
 * @param {Object} data - The legacy design data object
 * @returns {Object} The migrated v2 design data object
 */
function convertOldToV2(data) {
    if (!data || data.schemaVersion === 2) {
        return data;
    }

    const v2 = {
        schemaVersion: 2,
        v2: {
            canvas: {
                width: 510,
                height: 330,
                baseWidth: 510
            },
            sides: {
                front: { elements: [] },
                back: { elements: [] }
            }
        },
        legacy: JSON.parse(JSON.stringify(data))
    };

    const placements = data.placements || {};
    const positions = data.positions || {};
    const inputs = data.inputs || {};
    const imageUrls = data.imageUrls || {};
    const dynamic = data.dynamic || {};

    // Helper: Map Filters
    const getFilters = (prefix) => {
        const filters = {};
        if (inputs[`${prefix}-filter-grayscale`]) filters.grayscale = inputs[`${prefix}-filter-grayscale`];
        if (inputs[`${prefix}-filter-blur`]) filters.blur = inputs[`${prefix}-filter-blur`];
        if (inputs[`${prefix}-filter-sepia`]) filters.sepia = inputs[`${prefix}-filter-sepia`];
        if (inputs[`${prefix}-filter-invert`]) filters.invert = inputs[`${prefix}-filter-invert`];
        if (inputs[`${prefix}-filter-brightness`]) filters.brightness = inputs[`${prefix}-filter-brightness`];
        if (inputs[`${prefix}-filter-contrast`]) filters.contrast = inputs[`${prefix}-filter-contrast`];
        return filters;
    };

    // Helper: Map Text Effects
    const getTextEffects = (prefix) => {
        return {
            letterSpacing: inputs[`${prefix}-letter-spacing`] || 0,
            lineHeight: inputs[`${prefix}-line-height`] || 1.4,
            uppercase: !!inputs[`${prefix}-uppercase`],
            glow: !!inputs[`${prefix}-glow`]
        };
    };

    const addElement = (side, el) => {
        const targetSide = (side === 'front' || side === 'back') ? side : 'front';
        v2.v2.sides[targetSide].elements.push(el);
    };

    // 1. Name
    const nameVal = inputs['input-name_ar'] || inputs['input-name_en'] || inputs['input-name'];
    if (nameVal) {
        addElement(placements.name || 'front', {
            id: generateId('text'),
            type: 'text',
            name: 'Name',
            content: nameVal,
            visible: true,
            zIndex: 10,
            transform: {
                x: positions.name?.x || positions['card-name']?.x || 50,
                y: positions.name?.y || positions['card-name']?.y || 100,
                w: 250, h: 40, rotation: 0, opacity: 1
            },
            style: {
                color: inputs['name-color'] || '#ffffff',
                fontSize: parseInt(inputs['name-font-size']) || 22,
                fontFamily: inputs['name-font'] || 'Tajawal, sans-serif'
            },
            effects: getTextEffects('name')
        });
    }

    // 2. Tagline
    const taglineVal = inputs['input-tagline_ar'] || inputs['input-tagline_en'] || inputs['input-tagline'];
    if (taglineVal) {
        addElement(placements.tagline || 'front', {
            id: generateId('text'),
            type: 'text',
            name: 'Tagline',
            content: taglineVal,
            visible: true,
            zIndex: 9,
            transform: {
                x: positions.tagline?.x || positions['card-tagline']?.x || 50,
                y: positions.tagline?.y || positions['card-tagline']?.y || 130,
                w: 250, h: 30, rotation: 0, opacity: 1
            },
            style: {
                color: inputs['tagline-color'] || '#4da6ff',
                fontSize: parseInt(inputs['tagline-font-size']) || 14,
                fontFamily: inputs['tagline-font'] || 'Tajawal, sans-serif'
            },
            effects: getTextEffects('tagline')
        });
    }

    // 3. Logo
    const logoSrc = imageUrls.front || inputs['input-logo'];
    if (logoSrc) {
        addElement(placements.logo || 'front', {
            id: generateId('logo'),
            type: 'logo',
            name: 'Logo',
            src: logoSrc,
            visible: true,
            zIndex: 5,
            transform: {
                x: positions.logo?.x || positions['card-logo']?.x || 350,
                y: positions.logo?.y || positions['card-logo']?.y || 40,
                w: parseInt(inputs['logo-width']) || 120,
                h: parseInt(inputs['logo-height']) || 60,
                rotation: 0, opacity: parseFloat(inputs['logo-opacity']) || 1
            },
            style: { objectFit: inputs['logo-object-fit'] || 'contain' },
            effects: getFilters('logo')
        });
    }

    // 4. Photo
    const photoSrc = imageUrls.photo || imageUrls.personalPhoto;
    if (photoSrc) {
        const photoSize = (parseInt(inputs['photo-size']) || 25) * 5.1; // mapping percentage to baseWidth
        addElement(placements.photo || 'front', {
            id: generateId('avatar'),
            type: 'avatar',
            name: 'Photo',
            src: photoSrc,
            visible: true,
            zIndex: 6,
            transform: {
                x: positions.photo?.x || positions['card-personal-photo-wrapper']?.x || 50,
                y: positions.photo?.y || positions['card-personal-photo-wrapper']?.y || 150,
                w: photoSize, h: photoSize, rotation: 0, opacity: 1
            },
            style: {
                borderRadius: inputs['photo-shape'] === 'circle' ? '50%' : '8px',
                border: `${inputs['photo-border-width'] || 2}px solid ${inputs['photo-border-color'] || '#ffffff'}`
            },
            effects: { ...getFilters('photo'), glassEffect: !!inputs['photo-glass-effect'] }
        });
    }

    // 5. QR
    if (inputs['qr-source'] !== 'none') {
        const qrSize = (parseInt(inputs['qr-size']) || 30) * 5.1;
        addElement(placements.qr || 'back', {
            id: generateId('qr'),
            type: 'qr',
            name: 'QR Code',
            src: imageUrls.qrCode || '',
            visible: true,
            zIndex: 7,
            transform: {
                x: positions.qr?.x || positions['qr-code-wrapper']?.x || 350,
                y: positions.qr?.y || positions['qr-code-wrapper']?.y || 200,
                w: qrSize, h: qrSize, rotation: 0, opacity: 1
            },
            style: {}
        });
    }

    // 6. Phones
    if (Array.isArray(dynamic.phones)) {
        dynamic.phones.forEach(phone => {
            addElement(phone.placement, {
                id: phone.id || generateId('button'),
                type: 'button',
                name: 'Phone',
                content: phone.value || '',
                action: { type: 'tel', value: phone.value },
                visible: true,
                zIndex: 15,
                transform: {
                    x: phone.position?.x || 0,
                    y: phone.position?.y || 0,
                    w: 150, h: 40, rotation: 0, opacity: 1
                },
                style: {
                    backgroundColor: inputs['phone-btn-bg-color'] || '#4da6ff',
                    color: inputs['phone-btn-text-color'] || '#ffffff',
                    fontSize: parseInt(inputs['phone-btn-font-size']) || 12,
                    fontFamily: inputs['phone-btn-font'] || 'Poppins, sans-serif'
                }
            });
        });
    }

    // 7. Social
    const processSocial = (social) => {
        addElement(social.placement || 'back', {
            id: social.id || generateId('social'),
            type: 'social',
            platform: social.platform || social.type,
            value: social.value,
            visible: true,
            zIndex: 16,
            transform: {
                x: social.position?.x || 0,
                y: social.position?.y || 0,
                w: 40, h: 40, rotation: 0, opacity: 1
            },
            style: {
                fontSize: parseInt(inputs['social-text-size']) || 12,
                color: inputs['social-text-color'] || '#ffffff'
            }
        });
    };

    if (Array.isArray(dynamic.social)) dynamic.social.forEach(processSocial);
    if (dynamic.staticSocial) {
        Object.entries(dynamic.staticSocial).forEach(([type, data]) => {
            if (data.value) processSocial({ ...data, type });
        });
    }

    return v2;
}

const convertLegacyToV2 = convertOldToV2;

module.exports = {
    convertOldToV2,
    convertLegacyToV2
};
