document.addEventListener("DOMContentLoaded", () => {
  const loader = document.getElementById("loader");
  const viewerContainer = document.querySelector(".viewer-container");
  const cardsWrapper = document.getElementById("cards-wrapper");
  const mobileFlipBtn = document.getElementById("mobile-flip-btn");

  // تم تعديل هذا الرابط ليكون نسبيًا، حيث أن الخادم يخدمه من نفس النطاق
  const API_BASE_URL = "/api";

  // تم الاحتفاظ بهذه المتغيرات لاستخدامها في دوال الحفظ
  let localCardData = null;

  const setupEventListeners = () => {
    document
      .getElementById("save-front-png-btn")
      .addEventListener("click", () =>
        captureAndDownload(
          document.getElementById("card-front-preview"),
          "card-front.png",
        ),
      );
    document
      .getElementById("save-back-png-btn")
      .addEventListener("click", () =>
        captureAndDownload(
          document.getElementById("card-back-preview"),
          "card-back.png",
        ),
      );
    document
      .getElementById("save-pdf-btn")
      .addEventListener("click", saveAsPdf);
    document
      .getElementById("save-vcf-btn")
      .addEventListener("click", saveAsVcf);

    if (mobileFlipBtn) {
      mobileFlipBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        cardsWrapper.classList.toggle("is-flipped");
      });
    }
  };

  const finishLoading = () => {
    loader.style.display = "none";
    viewerContainer.style.display = "flex";
    setupEventListeners();
  };

  const captureAndDownload = async (element, filename, scale = 2) => {
    try {
      const canvas = await html2canvas(element, {
        backgroundColor: null,
        scale,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = filename;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("Failed to capture element:", error);
      alert("حدث خطأ أثناء حفظ الصورة.");
    }
  };

  const saveAsPdf = async () => {
    const front = document.getElementById("card-front-preview");
    const back = document.getElementById("card-back-preview");
    if (!front || !back) return;

    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [510, 330],
      });
      const frontCanvas = await html2canvas(front, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
      });
      doc.addImage(frontCanvas.toDataURL("image/png"), "PNG", 0, 0, 510, 330);
      doc.addPage();
      const backCanvas = await html2canvas(back, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
      });
      doc.addImage(backCanvas.toDataURL("image/png"), "PNG", 0, 0, 510, 330);
      doc.save("business-card.pdf");
    } catch (e) {
      console.error("PDF export failed:", e);
      alert("فشل تصدير PDF.");
    }
  };

  const getVCardString = () => {
    if (!localCardData) return "";
    const data = localCardData;
    const name = data.inputs["input-name"] || "";
    const nameParts = name.split(" ");
    const lastName = nameParts.pop() || "";
    const firstName = nameParts.join(" ") || "";

    let vCard = `BEGIN:VCARD\nVERSION:3.0\n`;
    vCard += `N:${lastName};${firstName};;;\n`;
    vCard += `FN:${name}\n`;
    if (data.inputs["input-tagline"])
      vCard += `TITLE:${data.inputs["input-tagline"]}\n`;
    if (data.inputs["input-email"])
      vCard += `EMAIL;TYPE=PREF,INTERNET:${data.inputs["input-email"]}\n`;
    if (data.inputs["input-website"])
      vCard += `URL:${data.inputs["input-website"]}\n`;
    if (data.dynamic.phones) {
      data.dynamic.phones.forEach((phone) => {
        if (phone) vCard += `TEL;TYPE=CELL:${phone}\n`;
      });
    }
    vCard += `END:VCARD`;
    return vCard;
  };

  const saveAsVcf = () => {
    const vcfData = getVCardString();
    if (!vcfData) {
      alert("لا توجد بيانات كافية لحفظ جهة الاتصال.");
      return;
    }
    const blob = new Blob([vcfData], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "contact.vcf";
    link.click();
    URL.revokeObjectURL(url);
  };

  const buildCard = (data) => {
    localCardData = data; // حفظ البيانات محليًا لاستخدامها في دوال الحفظ

    const layout = data.inputs["layout-select"] || "classic";
    cardsWrapper.dataset.layout = layout;

    const frontHtml = `
            <div class="business-card" id="card-front-preview">
                <div class="card-background-layer" style="background-image: url(${data.imageUrls.front || ""});"></div>
                <div class="card-background-layer" style="background-image: linear-gradient(135deg, ${data.inputs["front-bg-start"]}, ${data.inputs["front-bg-end"]}); opacity: ${data.inputs["front-bg-opacity"]};"></div>
                <div class="card-content-layer card-front">
                    <div id="drag-container" class="drag-container" style="transform: translate(${data.positions["drag-container"]?.x || 0}px, ${data.positions["drag-container"]?.y || 0}px);">
                        <img src="${data.inputs["input-logo"]}" alt="شعار الشركة" class="logo-front" id="card-logo" style="max-width: ${data.inputs["logo-size"]}%; opacity: ${data.inputs["logo-opacity"]}; transform: translate(${data.positions["card-logo"]?.x || 0}px, ${data.positions["card-logo"]?.y || 0}px);">
                        <div class="identity-front" id="identity-front" style="transform: translate(${data.positions["identity-front"]?.x || 0}px, ${data.positions["identity-front"]?.y || 0}px);">
                            <h1 id="card-name" style="font-size: ${data.inputs["name-font-size"]}px; color: ${data.inputs["name-color"]}; font-family: ${data.inputs["name-font"]};">${data.inputs["input-name"]}</h1>
                            <h2 class="tagline" id="card-tagline" style="font-size: ${data.inputs["tagline-font-size"]}px; color: ${data.inputs["tagline-color"]}; font-family: ${data.inputs["tagline-font"]};">${data.inputs["input-tagline"]}</h2>
                        </div>
                    </div>
                    <div class="phone-buttons-wrapper" id="phone-buttons-wrapper" style="transform: translate(${data.positions["phone-buttons-wrapper"]?.x || 0}px, ${data.positions["phone-buttons-wrapper"]?.y || 0}px);">
                        ${(data.dynamic.phones || [])
                          .map((phone) => {
                            const bgColor = data.inputs["phone-btn-bg-color"];
                            const textColor =
                              data.inputs["phone-btn-text-color"];
                            return `<a href="tel:${phone}" class="phone-button" style="background-color: ${bgColor}; color: ${textColor}; border-color: ${bgColor === "transparent" || bgColor.includes("rgba(0,0,0,0)") ? textColor : "transparent"}; font-size: ${data.inputs["phone-btn-font-size"]}px; padding: ${data.inputs["phone-btn-padding"]}px ${data.inputs["phone-btn-padding"] * 2}px; font-family: ${data.inputs["phone-btn-font"]};"><i class="fas fa-phone-alt"></i><span>${phone}</span></a>`;
                          })
                          .join("")}
                    </div>
                </div>
            </div>`;

    const backHtml = `
            <div class="business-card" id="card-back-preview">
                <div class="card-background-layer" style="background-image: url(${data.imageUrls.back || ""});"></div>
                <div class="card-background-layer" style="background-image: linear-gradient(135deg, ${data.inputs["back-bg-start"]}, ${data.inputs["back-bg-end"]}); opacity: ${data.inputs["back-bg-opacity"]};"></div>
                <div class="card-content-layer card-back" id="card-back-content"></div>
            </div>`;

    cardsWrapper.innerHTML = frontHtml + backHtml;
    buildBackCardContent(data);
  };

  const buildBackCardContent = (data) => {
    const cardBackContent = document.getElementById("card-back-content");
    if (!cardBackContent) return;

    const qrSource = data.inputs["qr-source"];
    let qrImageSrc = null;
    if (qrSource === "custom") qrImageSrc = data.inputs["input-qr-url"];
    if (qrSource === "upload") qrImageSrc = data.imageUrls.qrCode;

    if (qrImageSrc) {
      cardBackContent.innerHTML += `<div class="card-back-qr-image-wrapper" style="width: ${data.inputs["qr-size"]}%;"><img src="${qrImageSrc}" alt="QR Code"></div>`;
    }

    const contactsWrapper = document.createElement("div");
    contactsWrapper.className = "contact-icons-wrapper";

    const socialPlatforms = {
      email: { icon: "fas fa-envelope", prefix: "mailto:" },
      website: { icon: "fas fa-globe" },
      whatsapp: { icon: "fab fa-whatsapp", prefix: "https://wa.me/" },
      facebook: { icon: "fab fa-facebook-f" },
      linkedin: { icon: "fab fa-linkedin-in" },
      instagram: { icon: "fab fa-instagram", prefix: "https://instagram.com/" },
      x: { icon: "fab fa-xing", prefix: "https://x.com/" },
      telegram: { icon: "fab fa-telegram", prefix: "https://t.me/" },
      tiktok: { icon: "fab fa-tiktok", prefix: "https://tiktok.com/@" },
      snapchat: {
        icon: "fab fa-snapchat",
        prefix: "https://snapchat.com/add/",
      },
      youtube: { icon: "fab fa-youtube", prefix: "https://youtube.com/" },
      pinterest: { icon: "fab fa-pinterest", prefix: "https://pinterest.com/" },
    };

    const renderLink = (value, platform) => {
      if (!value) return "";
      let fullUrl = value;
      if (
        platform.prefix &&
        !value.startsWith("http") &&
        !value.startsWith("mailto:")
      ) {
        fullUrl = platform.prefix + value;
      } else if (!value.startsWith("http") && !value.startsWith("mailto:")) {
        fullUrl = "https://" + value;
      }

      return `<a href="${fullUrl}" target="_blank" rel="noopener noreferrer" style="background-color: ${data.inputs["back-buttons-bg-color"]}; color: ${data.inputs["back-buttons-text-color"]}; font-size: ${data.inputs["back-buttons-size"]}px; padding: ${data.inputs["back-buttons-size"] * 0.5}px ${data.inputs["back-buttons-size"]}px; font-family: ${data.inputs["back-buttons-font"]};">
                        <i class="${platform.icon}"></i>
                    </a>`;
    };

    let linksHtml = "";
    linksHtml += renderLink(data.inputs["input-email"], socialPlatforms.email);
    linksHtml += renderLink(
      data.inputs["input-website"],
      socialPlatforms.website,
    );
    linksHtml += renderLink(
      data.inputs["input-whatsapp"],
      socialPlatforms.whatsapp,
    );
    linksHtml += renderLink(
      data.inputs["input-facebook"],
      socialPlatforms.facebook,
    );
    linksHtml += renderLink(
      data.inputs["input-linkedin"],
      socialPlatforms.linkedin,
    );

    (data.dynamic.social || []).forEach((social) => {
      const platform = socialPlatforms[social.platform];
      if (platform) {
        linksHtml += renderLink(social.value, platform);
      }
    });

    contactsWrapper.innerHTML = linksHtml;
    cardBackContent.appendChild(contactsWrapper);
  };

  const loadCardData = async () => {
    // --- المسار السريع: التحقق من وجود البيانات المحقونة من الخادم ---
    if (window.cardData) {
      console.log("SSR data found. Building card directly.");
      buildCard(window.cardData);
      finishLoading();
      return; // إنهاء التنفيذ هنا
    }

    // --- المسار الاحتياطي: جلب البيانات من API إذا لم تكن محقونة ---
    console.log("No SSR data. Fetching from API.");
    const params = new URLSearchParams(window.location.search);
    const cardId = params.get("id");

    if (!cardId) {
      // استخلاص الـ ID من المسار النظيف مثل /card/xxxxxxx
      const pathParts = window.location.pathname.split("/");
      const idFromPath = pathParts[pathParts.length - 1];

      if (idFromPath && pathParts[pathParts.length - 2] === "card") {
        cardId = idFromPath;
      } else {
        loader.innerHTML =
          "<h1>لم يتم العثور على البطاقة</h1><p>الرابط غير صحيح أو ناقص.</p>";
        return;
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/get-design/${cardId}`);
      if (!response.ok) {
        throw new Error("Card not found");
      }
      const data = await response.json();
      buildCard(data);
      finishLoading();
    } catch (error) {
      console.error(error);
      loader.innerHTML = "<h1>خطأ</h1><p>لم نتمكن من تحميل بيانات البطاقة.</p>";
    }
  };

  loadCardData();
});
