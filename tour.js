
// MC PRIME Interactive Tour - Using driver.js

document.addEventListener('DOMContentLoaded', function () {
    // Check if we are on the homepage
    if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/nfc/') || window.location.pathname === '/') {
        suppressLegacyTours();
        initHomepageTour();
    }
    // Check if we are on the editor page
    else if (window.location.pathname.includes('editor.html')) {
        suppressLegacyTours();
        initEditorTour();
    }
});

function suppressLegacyTours() {
    // Suppress old Shepherd.js tours by marking them as seen
    localStorage.setItem('digitalCardTourShown_v6_desktop', 'true'); // From script-ui.js
    localStorage.setItem('digitalCardTourShown_v4', 'true');         // From card/script.js
}

function initHomepageTour() {
    // Check if tour should run (e.g., first visit)
    // For demo purposes, we can add a button or just run it if a query param exists ?tour=true
    const urlParams = new URLSearchParams(window.location.search);
    const startTour = urlParams.get('tour');

    const driver = window.driver.js.driver;

    const tour = driver({
        showProgress: true,
        steps: [
            { element: '#hero-title', popover: { title: 'مرحباً بك في MC PRIME', description: 'صمم بطاقتك الذكية في دقائق وبشكل مجاني بالكامل.' } },
            { element: '#cta-button', popover: { title: 'ابدأ الآن', description: 'اضغط هنا للتوجه لمحرر البطاقات مباشرة.' } },
            { element: '#features-section', popover: { title: 'المميزات', description: 'تعرف على خصائص البطاقات الذكية.' } }
        ]
    });

    if (startTour === 'true' || !localStorage.getItem('homepage_tour_seen')) {
        tour.drive();
        localStorage.setItem('homepage_tour_seen', 'true');
    }
}

function initEditorTour() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('tour') !== 'start') return;

    const isEnglish = document.documentElement.lang === 'en' || window.location.pathname.includes('-en.html');
    const driver = window.driver.js.driver;

    // Bilingual steps
    const steps = isEnglish ? [
        { element: '#panel-design', popover: { title: 'Design Panel', description: 'Control every detail of your card here.' } },
        { element: 'input[id^="input-name"]', popover: { title: 'Personal Info', description: 'Edit your name and job title directly.' } },
        { element: '#phone-buttons-wrapper', popover: { title: 'Contact Buttons', description: 'Manage phone numbers and contact buttons here.' } },
        { element: '#social-media-section', popover: { title: 'Social Links', description: 'Add your social media links easily.' } },
        { element: '#start-tour-btn', popover: { title: 'Interactive Tour', description: 'Click here to start an interactive guide of the editor.' } },
        { element: '#flip-card-btn-mobile', popover: { title: 'Card Face', description: 'Use the button below the card to switch between Front and Back Face.' } }
    ] : [
        { element: '#panel-design', popover: { title: 'لوحة التصميم', description: 'من هنا يمكنك التحكم في كل تفاصيل بطاقتك.' } },
        { element: 'input[id^="input-name"]', popover: { title: 'البيانات الشخصية', description: 'عدل اسمك والمسمى الوظيفي مباشرة.' } },
        { element: '#phone-buttons-wrapper', popover: { title: 'أزرار التواصل', description: 'تحكم في أرقام الهواتف وأزرار الاتصال.' } },
        { element: '#social-media-section', popover: { title: 'روابط التواصل', description: 'أضف حساباتك على مواقع التواصل بسهولة.' } },
        { element: '#start-tour-btn', popover: { title: 'جولة تفاعلية', description: 'اضغط هنا لبدء جولة تعليمية داخل المحرر.' } },
        { element: '#flip-card-btn-mobile', popover: { title: 'وجه الكارت', description: 'استخدم الزر أسفل الكارت للتبديل بين الوجه الأمامي والخلفي.' } }
    ];

    const tour = driver({
        showProgress: true,
        steps: steps
    });

    // Start editor tour after a short delay to allow page load
    setTimeout(() => {
        tour.drive();
    }, 1000);
}
