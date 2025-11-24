// chatbot-guide.js
// Chatbot tour widget for editor.html (Arabic)
// Drop this file into your /nfc/ folder and include <script src="/nfc/chatbot-guide.js" defer></script> in editor.html

(function () {
  if (window.__mcprime_chatbot_loaded) return;
  window.__mcprime_chatbot_loaded = true;

  const CSS = `
  /* Chatbot styles injected by chatbot-guide.js */
  .mc-chatbot { position: fixed; bottom: 18px; left: 18px; z-index: 99999; font-family: Tajawal, Arial, sans-serif; }
  .mc-chatbot .mc-toggle { width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg,#4da6ff,#2d86ff); display:flex;align-items:center;justify-content:center;color:#fff;cursor:pointer;box-shadow:0 8px 22px rgba(13,40,86,0.35); }
  .mc-chatbot-panel { width: 360px; max-width: calc(100vw - 40px); height: 520px; background: #243447; color: var(--text-primary,#e6f0f7); border-radius: 12px; box-shadow:0 18px 50px rgba(10,22,40,0.6); overflow: hidden; transform-origin: bottom left; display:flex; flex-direction:column; }
  .mc-chatbot-header { padding: 12px 14px; display:flex;align-items:center;gap:10px;background: linear-gradient(90deg,#2b3f56, #213246); }
  .mc-chatbot-header h4{ margin:0;font-size:15px }
  .mc-chatbot-messages { flex:1; padding:12px; overflow:auto; display:flex; flex-direction:column; gap:10px; }
  .mc-msg{ max-width:85%; padding:10px 12px;border-radius:10px; line-height:1.4; }
  .mc-msg.bot{ background: linear-gradient(180deg,#324b61,#243447); color:#e6f0f7; align-self:flex-start; }
  .mc-msg.user{ background:#4da6ff; color:white; align-self:flex-end; }
  .mc-chatbot-controls { padding: 10px; border-top: 1px solid rgba(255,255,255,0.03); display:flex; gap:8px; }
  .mc-chatbot-controls button{ flex:1; padding:10px; border-radius:8px; border:none; cursor:pointer; font-weight:600 }
  .mc-btn-neutral{ background: var(--form-bg,#1f2b3a); color:var(--text-primary,#e6f0f7); }
  .mc-btn-primary{ background: linear-gradient(90deg,#4da6ff,#2d86ff); color:white }
  .mc-quick-actions{ display:flex; gap:6px; flex-wrap:wrap }
  .mc-quick-actions button{ padding:6px 8px; border-radius: 6px; border:none; background: rgba(255,255,255,0.03); color:var(--text-primary,#e6f0f7); cursor:pointer }
  .mc-step-title{ font-weight:700; margin-bottom:6px }
  `;

  // inject styles
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);

  // chat DOM
  const container = document.createElement("div");
  container.className = "mc-chatbot";
  container.innerHTML = `
    <div class="mc-toggle" id="mc-chat-toggle" title="مساعد التصميم">💬</div>
    <div class="mc-chatbot-panel" id="mc-chat-panel" style="display:none">
      <div class="mc-chatbot-header">
        <div style="width:44px;height:44px;border-radius:8px;background:linear-gradient(90deg,#4da6ff,#2d86ff);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800">MC</div>
        <div style="flex:1">
          <h4>مساعد تصميم البطاقة — MC PRIME</h4>
          <div style="font-size:12px;opacity:0.8">دليل تفاعلي خطوة بخطوة</div>
        </div>
        <button id="mc-chat-close" style="background:transparent;border:none;color:inherit;font-size:18px;cursor:pointer">×</button>
      </div>
      <div class="mc-chatbot-messages" id="mc-chat-messages"></div>
      <div class="mc-chatbot-controls">
        <button class="mc-btn-neutral" id="mc-btn-steps">عرض الخطوات التفصيلية</button>
        <button class="mc-btn-primary" id="mc-btn-start">ابدأ الجولة</button>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  const panel = document.getElementById("mc-chat-panel");
  const toggle = document.getElementById("mc-chat-toggle");
  const closeBtn = document.getElementById("mc-chat-close");
  const messagesEl = document.getElementById("mc-chat-messages");
  const btnStart = document.getElementById("mc-btn-start");
  const btnSteps = document.getElementById("mc-btn-steps");

  toggle.addEventListener("click", () => {
    panel.style.display = panel.style.display === "none" ? "flex" : "none";
    scrollBottom();
  });
  closeBtn.addEventListener("click", () => (panel.style.display = "none"));

  // message helper
  function bot(msgHtml) {
    const el = document.createElement("div");
    el.className = "mc-msg bot";
    el.innerHTML = msgHtml;
    messagesEl.appendChild(el);
    scrollBottom();
  }
  function user(msgText) {
    const el = document.createElement("div");
    el.className = "mc-msg user";
    el.textContent = msgText;
    messagesEl.appendChild(el);
    scrollBottom();
  }
  function scrollBottom() {
    setTimeout(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }, 50);
  }

  // steps data (Arabic, detailed)
  const STEPS = [
    {
      id: "intro",
      title: "مقدمة سريعة",
      content: `مرحبًا! سأرشدك خطوة بخطوة لتصميم بطاقة احترافية. يمكنك الضغط على "ابدأ الجولة" لبدء تجربة تفاعلية أو "عرض الخطوات التفصيلية" لقراءة كل خطوة الآن.`,
    },
    {
      id: "theme",
      title: "اختيار التصميم (Theme)",
      content: `<div class="mc-step-title">الهدف</div>اختر نغمة لونية متناسقة تناسب علامتك التجارية.<br><div class="mc-step-title">طريقة العمل</div>اذهب إلى معرض التصاميم واضغط على أي تصميم. سيُطبق التدرج والألوان على معاينة البطاقة تلقائياً.<br><div class="mc-step-title">نصيحة</div>اختر تصميمًا يمنح تبايناً كافياً لقراءة النص بسهولة.`,
    },
    {
      id: "logo",
      title: "الشعار (Logo)",
      content: `<div class="mc-step-title">الهدف</div>عرض شعار واضح ومقروء دون إخفاء المعلومات الأساسية.<br><div class="mc-step-title">طريقة العمل</div>في قسم الشعار، يمكنك: إدخال رابط الصورة أو رفع ملف. ثم عدّل حجم الشعار والشفافية وموقعه عبر عناصر التحكم أو أزرار التحريك الدقيق.`,
    },
    {
      id: "photo",
      title: "الصورة الشخصية",
      content: `<div class="mc-step-title">الهدف</div>إضافة صورة شخصية احترافية إن أردت — مفيدة للمديرين التنفيذيين والفعّاليات.<br><div class="mc-step-title">طريقة العمل</div>ارفع صورة أو ألصق رابطها، استخدم أداة القص لتقليمها، اختر شكلها (دائري/مربع) وحجمها.`,
    },
    {
      id: "name",
      title: "الاسم والمسمى الوظيفي",
      content: `<div class="mc-step-title">الهدف</div>عرض الاسم بخط واضح والمسمى الوظيفي بطريقة مختصرة.<br><div class="mc-step-title">طريقة العمل</div>اكتب الاسم والمسمى، عدّل حجم الخط، اللون، ونوع الخط. ضع الاسم في المكان المناسب باستخدام أدوات التحريك.`,
    },
    {
      id: "phones",
      title: "أرقام الهواتف",
      content: `<div class="mc-step-title">الهدف</div>تقديم وسيلة تواصل فورية (اتصال/واتساب).<br><div class="mc-step-title">طريقة العمل</div>أضف أرقام الهاتف من قسم أرقام الهواتف. إذا أردت، فعّل "أزرار" ليظهر الرقم كزر قابل للضغط للاتصال مباشرة.`,
    },
    {
      id: "social",
      title: "الروابط الاجتماعية",
      content: `<div class="mc-step-title">الهدف</div>ربط حساباتك الاجتماعية الأساسية (لينكدإن، انستغرام... ).<br><div class="mc-step-title">طريقة العمل</div>استخدم قسم "بيانات التواصل" لإضافة الروابط الثابتة والديناميكية وقم بترتيبها حسب الأهمية.`,
    },
    {
      id: "qr",
      title: "إنشاء رمز QR",
      content: `<div class="mc-step-title">الهدف</div>تسهيل الوصول إلى بطاقتك عبر المسح أو مشاركة الرابط.<br><div class="mc-step-title">طريقة العمل</div>في قسم QR اختر مصدر الكود (رابط البطاقة أو vCard أو رابط مخصص)، ثم اضغط "إنشاء/تحديث QR Code". ضَبّط الحجم والموقع.`,
    },
    {
      id: "backgrounds",
      title: "الخلفيات والتدرجات",
      content: `<div class="mc-step-title">الهدف</div>اختيار خلفية لا تُشتت انتباه المتلقي.<br><div class="mc-step-title">طريقة العمل</div>يمكنك اختيار لونين لتدرّج أو رفع صورة. اضبط شفافية اللون فوق الصورة للحصول على توازن مناسب.`,
    },
    {
      id: "export",
      title: "الحفظ والمشاركة",
      content: `<div class="mc-step-title">الهدف</div>تصدير ومشاركة بطاقتك بعد الانتهاء.<br><div class="mc-step-title">طريقة العمل</div>استخدم "حفظ في المعرض" للتخزين المحلي أو "مشاركة الكارت" لإنشاء رابط ثابت. يمكنك تنزيل PNG، PDF، أو ملف VCF لإضافة جهة الاتصال مباشرة لهاتفك.`,
    },
  ];

  // quick flow state
  let currentStepIndex = 0;
  let runningTour = false;

  function renderStepsList() {
    messagesEl.innerHTML = "";
    STEPS.forEach((s, idx) => {
      bot(
        `<div style=\"font-weight:700;margin-bottom:6px;\">${idx + 1}. ${s.title}</div><div style=\"font-size:13px;opacity:0.95\">${s.content.substring(0, 200)}...</div><div style=\"margin-top:8px;\"><button data-step="${idx}" class=\"mc-step-btn\" style=\"padding:8px 10px;border-radius:8px;border:none;background:rgba(255,255,255,0.03);color:inherit;cursor:pointer\">عرض التفاصيل</button></div>`,
      );
    });
    // bind buttons
    setTimeout(() => {
      document.querySelectorAll(".mc-step-btn").forEach((btn) =>
        btn.addEventListener("click", (e) => {
          const idx = Number(btn.dataset.step);
          showStepDetail(idx);
        }),
      );
    }, 50);
  }

  function showStepDetail(idx) {
    messagesEl.innerHTML = "";
    const s = STEPS[idx];
    bot(
      `<div style=\"font-size:14px;font-weight:800;margin-bottom:6px\">${idx + 1}. ${s.title}</div>${s.content}<div style=\"margin-top:12px;display:flex;gap:8px\"><button id=\"mc-go-to-section\" class=\"mc-quick\">اذهب إلى هذه الأدوات</button><button id=\"mc-back-to-list\" class=\"mc-quick\">عودة للقائمة</button></div>`,
    );
    // style quick buttons
    setTimeout(() => {
      const go = document.getElementById("mc-go-to-section");
      const back = document.getElementById("mc-back-to-list");
      if (go) {
        go.style.padding = "8px 10px";
        go.style.borderRadius = "8px";
        go.style.border = "none";
        go.style.background = "linear-gradient(90deg,#4da6ff,#2d86ff)";
        go.style.color = "#fff";
      }
      if (back) {
        back.style.padding = "8px 10px";
        back.style.borderRadius = "8px";
        back.style.border = "none";
        back.style.background = "rgba(255,255,255,0.03)";
        back.style.color = "inherit";
      }
      if (go)
        go.addEventListener("click", () => {
          navigateToSection(STEPS[idx].id);
        });
      if (back)
        back.addEventListener("click", () => {
          renderStepsList();
        });
    }, 50);
  }

  function navigateToSection(sectionId) {
    // best-effort: use UIManager.navigateToAndHighlight if available, else try to focus element ids
    const map = {
      theme: "theme-gallery",
      logo: "logo-drop-zone",
      photo: "photo-controls-fieldset",
      name: "name-tagline-accordion",
      phones: "phones-accordion",
      social: "contact-info-accordion",
      qr: "qr-code-accordion",
      backgrounds: "background-gallery",
      export: "export-fieldset-source",
    };
    const targetId = map[sectionId];
    if (window.UIManager && UIManager.navigateToAndHighlight) {
      UIManager.navigateToAndHighlight(targetId);
    } else if (targetId) {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.animate(
          [
            { boxShadow: "0 0 0 8px rgba(77,166,255,0.12)" },
            { boxShadow: "none" },
          ],
          { duration: 700 },
        );
        el.focus && el.focus();
      }
    }
    bot(
      "تم توجيهك إلى القسم — يمكنك الآن متابعة التعليمات الموجودة داخل اللوحة.",
    );
  }

  // tour flow: step-by-step interactive
  async function startTour() {
    runningTour = true;
    currentStepIndex = 1; // skip intro
    messagesEl.innerHTML = "";
    bot(
      'حسنًا! سنبدأ الجولة التفاعلية. يمكنك الضغط "التالي" للانتقال أو "توقف" لإيقاف الجولة.',
    );
    renderTourStep(currentStepIndex);
  }

  function renderTourStep(idx) {
    if (idx < 1 || idx >= STEPS.length) {
      bot("انتهت الجولة. يمكنك إعادة البدء في أي وقت.");
      runningTour = false;
      return;
    }
    const s = STEPS[idx];
    messagesEl.innerHTML = "";
    bot(
      `<div style=\"font-weight:800;margin-bottom:8px\">خطوة ${idx} من ${STEPS.length - 1}: ${s.title}</div>${s.content}`,
    );
    // controls
    const controlsHtml = `
      <div style=\"display:flex;gap:8px;margin-top:10px\"> 
        <button id=\"mc-prev\" class=\"mc-btn-neutral\">السابق</button>
        <button id=\"mc-next\" class=\"mc-btn-primary\">التالي</button>
        <button id=\"mc-stop\" class=\"mc-btn-neutral\">توقف</button>
      </div>
    `;
    bot(controlsHtml);
    setTimeout(() => {
      const prev = document.getElementById("mc-prev");
      const next = document.getElementById("mc-next");
      const stop = document.getElementById("mc-stop");
      if (prev)
        prev.addEventListener("click", () => {
          if (currentStepIndex > 1) {
            currentStepIndex--;
            renderTourStep(currentStepIndex);
          }
        });
      if (next)
        next.addEventListener("click", () => {
          if (currentStepIndex < STEPS.length - 1) {
            currentStepIndex++;
            renderTourStep(currentStepIndex);
          } else {
            bot("انتهت الجولة.");
            runningTour = false;
          }
        });
      if (stop)
        stop.addEventListener("click", () => {
          runningTour = false;
          bot("تم إيقاف الجولة. يمكنك استئنافها لاحقاً.");
        });
    }, 60);

    // attempt to highlight section
    navigateToSection(s.id);
  }

  // initial greeting
  bot(
    '<strong>مرحبًا! 👋</strong><br>أنا مساعد تصميم البطاقة. اضغط "ابدأ الجولة" لتجربة خطوة بخطوة أو "عرض الخطوات التفصيلية" لقراءة كل التعليمات الآن.',
  );

  // event bindings
  btnStart.addEventListener("click", () => {
    if (runningTour) {
      bot("الجولة تعمل بالفعل.");
    } else {
      startTour();
      panel.style.display = "flex";
    }
  });
  btnSteps.addEventListener("click", () => {
    renderStepsList();
    panel.style.display = "flex";
  });

  // expose API for devs
  window.MCChatbotGuide = {
    open() {
      panel.style.display = "flex";
      toggle.style.display = "none";
    },
    close() {
      panel.style.display = "none";
      toggle.style.display = "flex";
    },
    startTour() {
      startTour();
      panel.style.display = "flex";
    },
  };
})();
