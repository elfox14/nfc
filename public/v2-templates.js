/**
 * V2 Native Templates
 */
const V2_TEMPLATES = [
    {
        id: 'modern-business',
        name: 'أعمال عصري',
        category: 'business',
        thumbnail: '💼',
        data: {
            sides: {
                front: {
                    elements: [
                        {
                            id: 'bg-1',
                            type: 'shape',
                            transform: { x: 0, y: 0, w: 510, h: 330 },
                            style: { backgroundColor: '#1a2a3b' }
                        },
                        {
                            id: 'accent-1',
                            type: 'shape',
                            transform: { x: 0, y: 0, w: 10, h: 330 },
                            style: { backgroundColor: '#4da6ff' }
                        },
                        {
                            id: 'name-1',
                            type: 'text',
                            content: 'الاسم الكريم',
                            transform: { x: 40, y: 100, w: 400, h: 40 },
                            style: { color: '#ffffff', fontSize: 32, fontWeight: 'bold', textAlign: 'right', fontFamily: 'Tajawal' }
                        },
                        {
                            id: 'tagline-1',
                            type: 'text',
                            content: 'المسمى الوظيفي هنا',
                            transform: { x: 40, y: 145, w: 400, h: 30 },
                            style: { color: '#4da6ff', fontSize: 18, textAlign: 'right', fontFamily: 'Tajawal' }
                        }
                    ]
                },
                back: {
                    elements: [
                        {
                            id: 'bg-2',
                            type: 'shape',
                            transform: { x: 0, y: 0, w: 510, h: 330 },
                            style: { backgroundColor: '#ffffff' }
                        },
                        {
                            id: 'qr-1',
                            type: 'qr',
                            transform: { x: 180, y: 90, w: 150, h: 150 },
                            src: '' // Will be generated
                        }
                    ]
                }
            }
        }
    },
    {
        id: 'creative-dark',
        name: 'إبداعي داكن',
        category: 'creative',
        thumbnail: '🎨',
        data: {
            sides: {
                front: {
                    elements: [
                        {
                            id: 'bg-1',
                            type: 'shape',
                            transform: { x: 0, y: 0, w: 510, h: 330 },
                            style: { backgroundColor: '#0f172a' }
                        },
                        {
                            id: 'circle-1',
                            type: 'avatar',
                            src: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
                            transform: { x: 40, y: 65, w: 200, h: 200 },
                            style: { borderRadius: '50%', border: '4px solid #f43f5e' }
                        },
                        {
                            id: 'name-1',
                            type: 'text',
                            content: 'مصمم مبدع',
                            transform: { x: 260, y: 120, w: 220, h: 40 },
                            style: { color: '#ffffff', fontSize: 28, fontWeight: 'bold', textAlign: 'left', fontFamily: 'Tajawal' }
                        }
                    ]
                },
                back: {
                    elements: [
                        {
                            id: 'bg-2',
                            type: 'shape',
                            transform: { x: 0, y: 0, w: 510, h: 330 },
                            style: { backgroundColor: '#f43f5e' }
                        },
                        {
                            id: 'qr-1',
                            type: 'qr',
                            transform: { x: 30, y: 90, w: 150, h: 150 },
                            style: { border: '10px solid white' }
                        }
                    ]
                }
            }
        }
    }
];

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { V2_TEMPLATES };
} else {
    window.V2_TEMPLATES = V2_TEMPLATES;
}
