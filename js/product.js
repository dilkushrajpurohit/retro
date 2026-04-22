(() => {
  const catalog = window.RETRO_CATALOG;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const header = document.querySelector("[data-premium-nav]");
  const params = new URLSearchParams(window.location.search);
  const categorySlug = params.get("category") || document.body.dataset.category || "chairs";
  const productSlug = params.get("product");
  const category = catalog?.findCategory(categorySlug) || catalog?.categories[0];
  const product = catalog?.findProduct(category.slug, productSlug) || category.products[0];
  const heroImage = document.querySelector("[data-product-hero-image]");
  const heroKicker = document.querySelector("[data-product-kicker]");
  const heroTitle = document.querySelector("[data-product-title]");
  const heroCopy = document.querySelector("[data-product-copy]");
  const stageEl = document.querySelector("[data-book-stage]");
  const contentEl = document.querySelector("[data-book-content]");
  const prevButton = document.querySelector("[data-book-prev]");
  const nextButton = document.querySelector("[data-book-next]");
  const zoomInButton = document.querySelector("[data-book-zoom-in]");
  const zoomOutButton = document.querySelector("[data-book-zoom-out]");
  const zoomRangeEl = document.querySelector("[data-book-zoom]");
  const pageCurrentEl = document.querySelector("[data-book-current]");
  const pageTotalEl = document.querySelector("[data-book-total]");
  const detailsTitle = document.querySelector("[data-product-details-title]");
  const detailsCopy = document.querySelector("[data-product-details-copy]");
  const detailsMaterial = document.querySelector("[data-product-details-material]");
  const detailsPrice = document.querySelector("[data-product-details-price]");
  const detailsCategory = document.querySelector("[data-product-details-category]");
  const detailsLink = document.querySelector("[data-product-details-link]");
  const shell = document.querySelector(".product-page");

  if (!catalog || !category || !product || !stageEl || !contentEl) {
    return;
  }

  document.title = `${product.name} | Retro INC`;

  const setHeaderState = () => {
    if (!header) {
      return;
    }

    header.classList.toggle("is-solid", window.scrollY > 18);
  };

  const renderPage = (galleryImage, index) => `
    <article class="flipbook-sheet-content product-book-page">
      <div class="catalog-book-visual">
        <img src="${galleryImage}" alt="${product.name} gallery ${index + 1}">
      </div>
      <div class="catalog-book-copy product-book-copy">
        <p class="catalog-book-kicker">Gallery ${String(index + 1).padStart(2, "0")}</p>
        <h2>${product.name}</h2>
        <p class="catalog-book-description">${product.description}</p>
        <dl class="catalog-spec-grid product-spec-grid">
          <div>
            <dt>Material</dt>
            <dd>${product.material}</dd>
          </div>
          <div>
            <dt>Price</dt>
            <dd>${product.price}</dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>${category.title}</dd>
          </div>
        </dl>
        <a class="catalog-book-button" href="${catalog.getCategoryPage(category.slug)}">Back to ${category.title}</a>
      </div>
    </article>
  `;

  if (heroImage) {
    heroImage.src = product.image;
  }

  if (heroKicker) {
    heroKicker.textContent = category.title;
  }

  if (heroTitle) {
    heroTitle.textContent = product.name;
  }

  if (heroCopy) {
    heroCopy.textContent = product.description;
  }

  if (detailsTitle) {
    detailsTitle.textContent = product.name;
  }

  if (detailsCopy) {
    detailsCopy.textContent = product.description;
  }

  if (detailsMaterial) {
    detailsMaterial.textContent = product.material;
  }

  if (detailsPrice) {
    detailsPrice.textContent = product.price;
  }

  if (detailsCategory) {
    detailsCategory.textContent = category.title;
  }

  if (detailsLink) {
    detailsLink.href = catalog.getCategoryPage(category.slug);
  }

  if (shell && category.accent) {
    shell.style.setProperty("--catalog-accent", category.accent);
  }

  if (window.gsap && window.ScrollTrigger) {
    window.gsap.registerPlugin(window.ScrollTrigger);

    if (!prefersReducedMotion && heroImage) {
      window.gsap.fromTo(heroImage, { scale: 1.08 }, { scale: 1, duration: 1.5, ease: "power2.out" });
    }

    if (document.querySelector(".catalog-hero-copy")) {
      window.gsap.from(".catalog-hero-copy > *", {
        opacity: 0,
        y: 24,
        duration: 0.8,
        stagger: 0.08,
        ease: "power2.out",
        delay: 0.12
      });
    }
  }

  const flipbook = window.RetroFlipbook?.create({
    stageEl,
    contentEl,
    pages: product.gallery,
    renderPage,
    prevButton,
    nextButton,
    zoomInButton,
    zoomOutButton,
    zoomRangeEl,
    pageCurrentEl,
    pageTotalEl,
    reducedMotion: prefersReducedMotion,
    initialZoom: 1.02
  });

  setHeaderState();
  window.addEventListener("scroll", setHeaderState, { passive: true });

  window.addEventListener("beforeunload", () => {
    flipbook?.destroy?.();
  });
})();
