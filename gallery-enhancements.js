// gallery-enhancements.js
// Keeps current gallery HTML intact — enhances lazy-loading, overlay, skeleton, infinite-scroll.
// Include this file in gallery.html: <script src="gallery-enhancements.js" defer></script>

document.addEventListener("DOMContentLoaded", () => {
  // ---- Lazy Load Observer (observes .thumb-bg-layer) ----
  const lazyLoadObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const bgLayer = entry.target;
          try {
            if (bgLayer && bgLayer.dataset && bgLayer.dataset.bg) {
              // Set background image and mark as loaded
              bgLayer.style.backgroundImage = `url('${bgLayer.dataset.bg}')`;
              bgLayer.classList.add("loaded");
              delete bgLayer.dataset.bg;
              // Remove skeleton on parent if present
              const parentThumb = bgLayer.closest(".card-thumbnail");
              if (parentThumb) parentThumb.classList.remove("card-skeleton");
            }
          } catch (err) {
            console.warn("Lazy load error:", err);
          }
          observer.unobserve(bgLayer);
        }
      });
    },
    {
      rootMargin: "0px 0px 300px 0px",
      threshold: 0.01,
    },
  );

  // ---- Helper: create thumb-bg-layer and overlay for a given thumbnail container ----
  function enhanceThumbnail(
    thumbnailContainer,
    existingImgSrc,
    viewUrl,
    editUrl,
  ) {
    if (!thumbnailContainer) return null;

    // If already enhanced, skip
    if (thumbnailContainer.dataset.enhanced === "1")
      return thumbnailContainer.querySelector(".thumb-bg-layer");

    // mark as enhanced
    thumbnailContainer.dataset.enhanced = "1";

    // add skeleton class until loaded
    thumbnailContainer.classList.add("card-skeleton");

    // create bg layer
    const bgLayer = document.createElement("div");
    bgLayer.className = "thumb-bg-layer";

    if (existingImgSrc) {
      bgLayer.dataset.bg = existingImgSrc;
    } else {
      // if there's a data-bg attribute already on thumbnailContainer, use it
      if (thumbnailContainer.dataset.bg)
        bgLayer.dataset.bg = thumbnailContainer.dataset.bg;
    }

    // remove any <img> inside thumbnail to avoid double images
    const imgs = thumbnailContainer.querySelectorAll("img");
    imgs.forEach((img) => {
      // If the img has the same src as dataset, we can remove it after saving src
      if (!bgLayer.dataset.bg && img.src) bgLayer.dataset.bg = img.src;
      // hide the img to keep layout until bg loaded (safer than remove)
      img.style.display = "none";
    });

    // append bgLayer as first child
    thumbnailContainer.insertBefore(bgLayer, thumbnailContainer.firstChild);

    // overlay
    const overlay = document.createElement("div");
    overlay.className = "thumb-overlay";
    overlay.setAttribute("aria-hidden", "true");

    const btnView = document.createElement("a");
    btnView.className = "thumb-btn";
    btnView.href = viewUrl || "#";
    btnView.target = "_blank";
    btnView.rel = "noopener noreferrer";
    btnView.setAttribute("aria-label", "عرض البطاقة");
    btnView.innerHTML =
      '<i class="fas fa-eye" aria-hidden="true"></i>&nbsp;عرض';

    const btnEdit = document.createElement("a");
    btnEdit.className = "thumb-btn";
    btnEdit.href = editUrl || "#";
    btnEdit.target = "_blank";
    btnEdit.rel = "noopener noreferrer";
    btnEdit.setAttribute("aria-label", "استخدم كقالب");
    btnEdit.innerHTML =
      '<i class="fas fa-pencil-alt" aria-hidden="true"></i>&nbsp;قالب';

    overlay.appendChild(btnView);
    overlay.appendChild(btnEdit);
    thumbnailContainer.appendChild(overlay);

    // observe bgLayer
    lazyLoadObserver.observe(bgLayer);

    return bgLayer;
  }

  // ---- Enhance existing gallery cards on the page ----
  function enhanceExistingCards() {
    const cards = Array.from(document.querySelectorAll(".gallery-card"));
    if (!cards.length) return;

    cards.forEach((card) => {
      // try to find thumbnail container
      let thumbnail = card.querySelector(".card-thumbnail");
      // if no thumbnail wrapper exists, try to find first img and create wrapper
      if (!thumbnail) {
        const firstImg = card.querySelector("img");
        if (firstImg) {
          // create a wrapper
          thumbnail = document.createElement("div");
          thumbnail.className = "card-thumbnail";
          // move img into wrapper (we will hide img and use bg layer)
          firstImg.parentNode.insertBefore(thumbnail, firstImg);
          thumbnail.appendChild(firstImg);
        } else {
          // create an empty thumbnail container
          thumbnail = document.createElement("div");
          thumbnail.className = "card-thumbnail";
          // prepend to card
          card.insertBefore(thumbnail, card.firstChild);
        }
      }

      // determine viewUrl and editUrl if available from attributes or dataset
      let viewUrl = "#";
      let editUrl = "#";
      // check for data attributes on card (common pattern)
      if (card.dataset && card.dataset.viewUrl) viewUrl = card.dataset.viewUrl;
      if (card.dataset && card.dataset.editUrl) editUrl = card.dataset.editUrl;

      // fallback tries: find existing link to view/edit
      const possibleView = card.querySelector("a.view-link, a.view, a.preview");
      if (possibleView && possibleView.href) viewUrl = possibleView.href;
      const possibleEdit = card.querySelector(
        "a.edit-link, a.edit, a.use-template",
      );
      if (possibleEdit && possibleEdit.href) editUrl = possibleEdit.href;

      // if thumbnail contains <img>, use its src
      const img = thumbnail.querySelector("img");
      const imgSrc = img
        ? img.dataset.src || img.getAttribute("src") || ""
        : "";

      // enhance
      enhanceThumbnail(thumbnail, imgSrc, viewUrl, editUrl);
    });
  }

  // run enhancement on load
  enhanceExistingCards();

  // If gallery is dynamically appended later, observe mutations to enhance new cards
  const galleryContainer =
    document.querySelector(".gallery-grid") ||
    document.querySelector(".gallery-container");
  if (galleryContainer) {
    const mo = new MutationObserver((muts) => {
      let newFound = false;
      muts.forEach((m) => {
        m.addedNodes.forEach((n) => {
          if (n.nodeType === 1 && n.matches && n.matches(".gallery-card"))
            newFound = true;
        });
      });
      if (newFound) enhanceExistingCards();
    });
    mo.observe(galleryContainer, { childList: true, subtree: true });
  }

  // ---- Infinite Scroll sentinel (optional, non-intrusive) ----
  // This will try to click the existing "load more" button if present.
  (function setupInfiniteScroll() {
    // find container to append sentinel
    const container = galleryContainer || document.body;
    const sentinel = document.createElement("div");
    sentinel.id = "infinite-sentinel";
    sentinel.style.width = "100%";
    sentinel.style.height = "8px";
    container.appendChild(sentinel);

    const infiniteObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          // try to find a real "load more" button on the page
          const loadMoreBtn = document.querySelector(
            "#load-more-btn, .load-more-btn, button.load-more, .btn-load-more",
          );
          if (loadMoreBtn) {
            // small guard: avoid double-clicking while loading
            const isDisabled =
              loadMoreBtn.disabled || loadMoreBtn.classList.contains("loading");
            if (!isDisabled) {
              loadMoreBtn.click();
            }
          }
        });
      },
      { rootMargin: "0px 0px 600px 0px" },
    );

    infiniteObserver.observe(sentinel);
  })();

  // ---- Public API (optional) ----
  window.GalleryEnhancements = {
    enhanceNow: enhanceExistingCards,
  };
});
