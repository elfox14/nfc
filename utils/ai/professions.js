'use strict';
/**
 * professions.js — profession data for the AI Card Designer (Phase 1).
 *
 * Holds, per profession:
 *  - labels (ar/en)
 *  - fallback copy patterns (used when no LLM provider is configured,
 *    or when the provider call fails). Written by hand in a natural,
 *    professional Egyptian-friendly tone — these are starter texts the
 *    user edits, never marketing fluff.
 *  - suggested link ideas (title + hint). URLs are supplied by the user
 *    in the designer panel; links are only embedded into a design state
 *    once a real URL exists (the save sanitizer drops URL-less links).
 *  - a seed palette used when the user has no logo to extract from.
 *
 * Placeholders: {name} {company} {line} — filled by copy.js.
 */

const PROFESSIONS = {
  medical: {
    label_ar: 'طبيب / عيادة',
    label_en: 'Doctor / Clinic',
    seed: ['#0E7C7B', '#0A4F4E'],
    tagline_ar: ['استشاري {line}', 'خدمات طبية موثوقة'],
    tagline_en: ['{line} Consultant', 'Trusted medical care'],
    bio_ar: [
      '{name} — {tagline}. للحجز والاستفسار، واتساب أسرع وسيلة للتواصل، وهتلاقي عنوان العيادة ومواعيد العمل هنا في الكارت.',
      'أهلًا بيك في صفحة {name}. تقدر تحجز موعدك أو تستفسر عن الخدمات من وسائل التواصل اللي تحت، والعنوان موجود على الخريطة.'
    ],
    bio_en: [
      '{name} — {tagline}. For appointments and questions, WhatsApp is the fastest way to reach me. Clinic address and working hours are on this card.',
      'Welcome to {name}\'s page. You can book an appointment or ask about services through the contact options below.'
    ],
    links: [
      { key: 'booking', title_ar: 'احجز موعد', title_en: 'Book an appointment', hint_ar: 'رابط الحجز أو صفحة الحجوزات' },
      { key: 'whatsapp', title_ar: 'استشارة واتساب', title_en: 'WhatsApp consultation', hint_ar: 'رابط واتساب wa.me' },
      { key: 'location', title_ar: 'عنوان العيادة', title_en: 'Clinic location', hint_ar: 'رابط خرائط جوجل' },
      { key: 'services', title_ar: 'خدمات العيادة', title_en: 'Clinic services', hint_ar: 'صفحة الخدمات أو قائمة الأسعار' }
    ]
  },
  realestate: {
    label_ar: 'عقارات',
    label_en: 'Real Estate',
    seed: ['#8C6A2F', '#3E2F16'],
    tagline_ar: ['مستشار عقاري', 'وسيط عقاري معتمد'],
    tagline_en: ['Real estate consultant', 'Licensed real estate agent'],
    bio_ar: [
      '{name} — {tagline}. بساعدك تلاقي وحدتك المناسبة من غير لف كتير: قولي ميزانيتك والمنطقة اللي في بالك، وهبعت لك أنسب الاختيارات المتاحة.',
      'شغال في السوق العقاري وبشارك هنا أحدث الوحدات المتاحة. للاستفسار عن وحدة أو لعرض وحدتك للبيع أو الإيجار، تواصل معايا مباشرة.'
    ],
    bio_en: [
      '{name} — {tagline}. I help you find the right unit without the endless search: tell me your budget and area, and I will send you the best available options.',
      'Working in real estate and sharing the latest available units here. To ask about a unit or list yours for sale or rent, contact me directly.'
    ],
    links: [
      { key: 'listings', title_ar: 'الوحدات المتاحة', title_en: 'Available units', hint_ar: 'صفحة أو ملف الوحدات الحالية' },
      { key: 'whatsapp', title_ar: 'استفسر واتساب', title_en: 'Ask on WhatsApp', hint_ar: 'رابط واتساب wa.me' },
      { key: 'location', title_ar: 'مقر المكتب', title_en: 'Office location', hint_ar: 'رابط خرائط جوجل' }
    ]
  },
  sales: {
    label_ar: 'مبيعات وتسويق',
    label_en: 'Sales & Marketing',
    seed: ['#B3540E', '#5E2C05'],
    tagline_ar: ['أخصائي مبيعات', 'استشاري تسويق ومبيعات'],
    tagline_en: ['Sales specialist', 'Sales & marketing consultant'],
    bio_ar: [
      '{name} — {tagline}. لو بتدور على حل يناسب شغلك، كلمني وهنراجع الاحتياج مع بعض ونطلع بأنسب اختيار من غير ضغط شراء.',
      'دي صفحتي التعريفية: هتلاقي فيها الكتالوج ووسائل التواصل. أي استفسار عن منتج أو عرض، واتساب هو الأسرع.'
    ],
    bio_en: [
      '{name} — {tagline}. If you are looking for the right fit for your business, let us talk through what you need and find the best option — no pressure.',
      'This is my profile page: catalog and contact options are below. For any product question, WhatsApp is fastest.'
    ],
    links: [
      { key: 'catalog', title_ar: 'الكتالوج', title_en: 'Catalog', hint_ar: 'رابط الكتالوج أو المتجر' },
      { key: 'whatsapp', title_ar: 'اطلب أو استفسر واتساب', title_en: 'Order or ask on WhatsApp', hint_ar: 'رابط واتساب wa.me' },
      { key: 'location', title_ar: 'العنوان', title_en: 'Location', hint_ar: 'رابط خرائط جوجل' }
    ]
  },
  food: {
    label_ar: 'مطعم / كافيه',
    label_en: 'Restaurant / Café',
    seed: ['#7A2E1D', '#38120A'],
    tagline_ar: ['أكلات ومشروبات على أصولها', 'تجربة طعم تستاهل'],
    tagline_en: ['Food made the right way', 'A taste worth coming back for'],
    bio_ar: [
      'أهلًا بيك عندنا. المنيو والعنوان وروابط الطلب كلها هنا، ولو عندك مناسبة أو طلب خاص كلمنا واتساب وهنظبطه معاك.',
      'صفحة {company} التعريفية: شوف المنيو، واعرف عنواننا على الخريطة، واطلب أو احجز من الروابط اللي تحت.'
    ],
    bio_en: [
      'Welcome in. Menu, address and ordering links are all here — for events or special orders, message us on WhatsApp and we will sort it out.',
      'This is {company}\'s page: check the menu, find us on the map, and order or book from the links below.'
    ],
    links: [
      { key: 'menu', title_ar: 'المنيو', title_en: 'Menu', hint_ar: 'رابط المنيو الرقمي' },
      { key: 'order', title_ar: 'اطلب دلوقتي', title_en: 'Order now', hint_ar: 'رابط تطبيق أو صفحة الطلب' },
      { key: 'location', title_ar: 'العنوان على الخريطة', title_en: 'Location on map', hint_ar: 'رابط خرائط جوجل' }
    ]
  },
  services: {
    label_ar: 'خدمات / صيانة',
    label_en: 'Services / Maintenance',
    seed: ['#33526B', '#16242F'],
    tagline_ar: ['خدمة سريعة وشغل نضيف', 'فني متخصص'],
    tagline_en: ['Fast service, clean work', 'Specialist technician'],
    bio_ar: [
      '{name} — {tagline}. محتاج الخدمة؟ ابعت لي واتساب بصورة أو وصف بسيط للمشكلة، وهرد عليك بالتكلفة والميعاد المتاح على طول.',
      'بقدم خدماتي هنا مع وسائل التواصل وصور من شغل فات. للحجز أو الاستفسار عن سعر، واتساب أسرع وسيلة.'
    ],
    bio_en: [
      '{name} — {tagline}. Need the service? Send me a WhatsApp message with a photo or a short description, and I will reply with the cost and the nearest available slot.',
      'My services are listed here with contact options and photos of past work. For booking or a price, WhatsApp is fastest.'
    ],
    links: [
      { key: 'whatsapp', title_ar: 'اطلب الخدمة واتساب', title_en: 'Request on WhatsApp', hint_ar: 'رابط واتساب wa.me' },
      { key: 'work', title_ar: 'صور من الشغل', title_en: 'Work samples', hint_ar: 'معرض أعمال أو صفحة فيسبوك' },
      { key: 'location', title_ar: 'منطقة التغطية', title_en: 'Service area', hint_ar: 'رابط خرائط أو صفحة التغطية' }
    ]
  },
  business: {
    label_ar: 'شركة / أعمال',
    label_en: 'Business / Company',
    seed: ['#2F3E63', '#131A2C'],
    tagline_ar: ['شريكك في الشغل', 'حلول عملية للشركات'],
    tagline_en: ['Your business partner', 'Practical business solutions'],
    bio_ar: [
      '{name} — {tagline} في {company}. دي صفحتي للتواصل المباشر: اجتماعات وشراكات واستفسارات الشغل كلها من هنا.',
      'أهلًا بيك. أنا {name} من {company}. أسرع طريقة توصّلني هي واتساب أو البريد اللي تحت، وهتلاقي موقع الشركة وروابطنا الرسمية في الكارت.'
    ],
    bio_en: [
      '{name} — {tagline} at {company}. This is my direct contact page: meetings, partnerships and business inquiries all start here.',
      'Welcome. I am {name} from {company}. The fastest way to reach me is WhatsApp or the email below; company website and official links are on this card.'
    ],
    links: [
      { key: 'website', title_ar: 'موقع الشركة', title_en: 'Company website', hint_ar: 'رابط موقع الشركة' },
      { key: 'meeting', title_ar: 'احجز اجتماع', title_en: 'Book a meeting', hint_ar: 'رابط حجز المواعيد' },
      { key: 'location', title_ar: 'مقر الشركة', title_en: 'Company HQ', hint_ar: 'رابط خرائط جوجل' }
    ]
  },
  beauty: {
    label_ar: 'تجميل / صالون',
    label_en: 'Beauty / Salon',
    seed: ['#7C3E57', '#331824'],
    tagline_ar: ['عناية واهتمام بالتفاصيل', 'أخصائية تجميل'],
    tagline_en: ['Care in every detail', 'Beauty specialist'],
    bio_ar: [
      'أهلًا بيك في صفحة {name}. الحجز بيتم واتساب عشان نثبت لك الميعاد المناسب، وهتلاقي صور الشغل والعنوان هنا في الكارت.',
      '{name} — {tagline}. شوفي شغلنا من الروابط اللي تحت، وللحجز أو الاستفسار عن خدمة معينة كلمينا واتساب.'
    ],
    bio_en: [
      'Welcome to {name}\'s page. Bookings are confirmed on WhatsApp so we can lock in your slot — work samples and address are on this card.',
      '{name} — {tagline}. See our work through the links below; for bookings or questions about a service, message us on WhatsApp.'
    ],
    links: [
      { key: 'booking', title_ar: 'احجزي موعدك', title_en: 'Book your appointment', hint_ar: 'رابط الحجز أو واتساب' },
      { key: 'gallery', title_ar: 'صور الشغل', title_en: 'Work gallery', hint_ar: 'إنستاجرام أو معرض صور' },
      { key: 'location', title_ar: 'العنوان', title_en: 'Location', hint_ar: 'رابط خرائط جوجل' }
    ]
  },
  other: {
    label_ar: 'أخرى / عام',
    label_en: 'Other / General',
    seed: ['#3C4A5A', '#1A222B'],
    tagline_ar: ['صفحة التواصل الرسمية', 'نتواصل ونشتغل'],
    tagline_en: ['Official contact page', 'Let\'s connect and work'],
    bio_ar: [
      'أهلًا بيك في صفحة {name} التعريفية. كل وسائل التواصل معايا وروابط شغلي موجودة هنا في مكان واحد، وأسرع وسيلة توصّلني هي واتساب.',
      'دي النسخة الرقمية من كارت التعريف بتاعي: بياناتي وروابطي دايمًا محدثة هنا. لأي شغل أو استفسار، تواصل معايا من اللي تحت.'
    ],
    bio_en: [
      'Welcome to {name}\'s profile page. All my contact options and work links live here in one place — WhatsApp is the fastest way to reach me.',
      'This is the digital version of my business card: my details and links are always up to date here. For work or questions, use the options below.'
    ],
    links: [
      { key: 'whatsapp', title_ar: 'تواصل واتساب', title_en: 'WhatsApp', hint_ar: 'رابط واتساب wa.me' },
      { key: 'website', title_ar: 'موقعي', title_en: 'My website', hint_ar: 'رابط الموقع أو البورتفوليو' },
      { key: 'location', title_ar: 'العنوان', title_en: 'Location', hint_ar: 'رابط خرائط جوجل' }
    ]
  }
};

const PROFESSION_KEYS = Object.keys(PROFESSIONS);

function getProfession(key) {
  return PROFESSIONS[key] || PROFESSIONS.other;
}

module.exports = { PROFESSIONS, PROFESSION_KEYS, getProfession };
