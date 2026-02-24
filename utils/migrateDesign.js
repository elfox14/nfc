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
        originalLegacyData: JSON.parse(JSON.stringify(data)), // keep a backup
        elements: {
            front: [],
            back: []
        },
        background: {
            front: { type: 'color', value: '#ffffff' },
            back: { type: 'color', value: '#ffffff' }
        }
    };

    const placements = data.placements || {};
    const positions = data.positions || {};
    const inputs = data.inputs || {};
    const styles = data.styles || {};
    const imageUrls = data.imageUrls || {};
    const dynamic = data.dynamic || {};

    // Helper to add an element
    const addElement = (side, el) => {
        if (side === 'front' || side === 'back') {
            v2.elements[side].push(el);
        } else {
            v2.elements.front.push(el); // default
        }
    };

    // 1. Text Elements (Name, Tagline)
    if (inputs['input-name']) {
        addElement(placements.name, {
            id: generateId('text'),
            type: 'text',
            name: 'Name',
            content: inputs['input-name'],
            visible: true,
            locked: false,
            zIndex: 10,
            transform: {
                x: positions.name?.x || 0,
                y: positions.name?.y || 0,
                w: 200, h: 40, rotation: 0, opacity: 1
            },
            style: {
                color: styles.nameColor || '#000000',
                fontSize: styles.nameSize || 24,
                fontFamily: styles.nameFont || 'Arial'
            }
        });
    }

    if (inputs['input-tagline']) {
        addElement(placements.tagline, {
            id: generateId('text'),
            type: 'text',
            name: 'Tagline',
            content: inputs['input-tagline'],
            visible: true,
            locked: false,
            zIndex: 9,
            transform: {
                x: positions.tagline?.x || 0,
                y: positions.tagline?.y || 0,
                w: 200, h: 30, rotation: 0, opacity: 1
            },
            style: {
                color: styles.taglineColor || '#666666',
                fontSize: styles.taglineSize || 16,
                fontFamily: styles.taglineFont || 'Arial'
            }
        });
    }

    // 2. Logo
    if (imageUrls.front && placements.logo) { // Logo was often called 'front' or 'logo'
        addElement(placements.logo, {
            id: generateId('logo'),
            type: 'logo',
            name: 'Logo',
            src: imageUrls.front, // assuming front was used for logo
            visible: true,
            locked: false,
            zIndex: 5,
            transform: {
                x: positions.logo?.x || 0,
                y: positions.logo?.y || 0,
                w: 120, h: 60, rotation: 0, opacity: 1
            },
            style: {
                objectFit: 'contain'
            }
        });
    }

    // 3. Personal Photo (Avatar)
    if (imageUrls.personalPhoto) {
        addElement(placements.photo, {
            id: generateId('avatar'),
            type: 'avatar',
            name: 'Personal Photo',
            src: imageUrls.personalPhoto,
            visible: true,
            locked: false,
            zIndex: 6,
            transform: {
                x: positions.photo?.x || 0,
                y: positions.photo?.y || 0,
                w: 100, h: 100, rotation: 0, opacity: 1
            },
            style: {
                borderRadius: '50%'
            }
        });
    }

    // 4. QR Code
    if (imageUrls.qrCode || placements.qr) {
        addElement(placements.qr, {
            id: generateId('qr'),
            type: 'qr',
            name: 'QR Code',
            src: imageUrls.qrCode || '',
            visible: true,
            locked: false,
            zIndex: 7,
            transform: {
                x: positions.qr?.x || 0,
                y: positions.qr?.y || 0,
                w: 100, h: 100, rotation: 0, opacity: 1
            },
            style: {}
        });
    }

    // 5. Dynamic Phones
    if (Array.isArray(dynamic.phones)) {
        dynamic.phones.forEach(phone => {
            addElement(phone.placement, {
                id: phone.id || generateId('button'),
                type: 'button',
                name: 'Phone ' + phone.value,
                content: phone.value,
                action: { type: 'tel', value: phone.value },
                visible: true,
                locked: false,
                zIndex: 15,
                transform: {
                    x: phone.position?.x || 0,
                    y: phone.position?.y || 0,
                    w: 150, h: 40, rotation: 0, opacity: 1
                },
                style: {
                    backgroundColor: styles.phoneBtnBgColor || '#007bff',
                    color: styles.phoneBtnTextColor || '#ffffff'
                }
            });
        });
    }

    // 6. Dynamic Social
    if (Array.isArray(dynamic.social)) {
        dynamic.social.forEach(social => {
            addElement(social.placement, {
                id: social.id || generateId('social'),
                type: 'social',
                name: social.platform,
                platform: social.platform,
                value: social.value,
                action: { type: 'url', value: social.value },
                visible: true,
                locked: false,
                zIndex: 16,
                transform: {
                    x: social.position?.x || 0,
                    y: social.position?.y || 0,
                    w: 40, h: 40, rotation: 0, opacity: 1
                },
                style: {}
            });
        });
    }

    // 7. Static Social
    if (dynamic.staticSocial) {
        Object.entries(dynamic.staticSocial).forEach(([platform, item]) => {
            if (item && item.value) {
                addElement(item.placement, {
                    id: generateId('social'),
                    type: 'social',
                    name: platform,
                    platform: platform,
                    value: item.value,
                    action: { type: 'url', value: item.value },
                    visible: true,
                    locked: false,
                    zIndex: 17,
                    transform: {
                        x: item.position?.x || 0,
                        y: item.position?.y || 0,
                        w: 40, h: 40, rotation: 0, opacity: 1
                    },
                    style: {}
                });
            }
        });
    }

    return v2;
}

module.exports = {
    convertOldToV2
};
