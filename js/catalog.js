(() => {
  const catalog = window.RETRO_CATALOG;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const header = document.querySelector("[data-premium-nav]");
  const body = document.body;
  const categorySlug = body.dataset.category;
  const category = catalog?.findCategory(categorySlug);
  const heroImage = document.querySelector("[data-catalog-hero-image]");
  const heroKicker = document.querySelector("[data-catalog-kicker]");
  const heroTitle = document.querySelector("[data-catalog-title]");
  const heroCopy = document.querySelector("[data-catalog-copy]");
  const stageEl = document.querySelector("[data-book-stage]");
  const contentEl = document.querySelector("[data-book-content]");
  const prevButton = document.querySelector("[data-book-prev]");
  const nextButton = document.querySelector("[data-book-next]");
  const zoomInButton = document.querySelector("[data-book-zoom-in]");
  const zoomOutButton = document.querySelector("[data-book-zoom-out]");
  const zoomRangeEl = document.querySelector("[data-book-zoom]");
  const pageCurrentEl = document.querySelector("[data-book-current]");
  const pageTotalEl = document.querySelector("[data-book-total]");
  const jumpInputEl = document.querySelector("[data-book-jump]");
  const jumpGoButton = document.querySelector("[data-book-jump-go]");
  const shell = document.querySelector(".catalog-page");

  if (!catalog || !category || !stageEl || !contentEl) {
    return;
  }

  document.title = `${category.title} Catalog | Retro INC`;

  const setHeaderState = () => {
    if (!header) {
      return;
    }

    header.classList.toggle("is-solid", window.scrollY > 18);
  };

  const products = category.products;

  const preloadImage = (src) =>
    new Promise((resolve) => {
      const image = new Image();
      image.onload = resolve;
      image.onerror = resolve;
      image.src = src;
    });

  const preloadAssets = () => {
    const productImages = products.map((product) => product.image);
    const urls = [category.heroImage, ...productImages];
    return Promise.all(urls.map((src) => preloadImage(src)));
  };

  const getDimensions = (product) => product.dimensions || "Custom dimensions on request";

  const buildSpreadMarkup = (product, index) => {
    const detailPageUrl = catalog.getProductPage(category.slug, product.slug);
    const enquireLink = `mailto:hello@retroinc.com?subject=${encodeURIComponent(`Enquiry: ${product.name}`)}`;

    return `
      <article class="book-spread">
        <section class="book-left">
          <img src="${product.image}" alt="${product.name}">
        </section>
        <section class="book-right">
          <p class="catalog-book-kicker">${category.title} ${String(index + 1).padStart(2, "0")}</p>
          <h2>${product.name}</h2>
          <p class="catalog-book-description">${product.description}</p>
          <dl class="catalog-spec-grid">
            <div>
              <dt>Material</dt>
              <dd>${product.material}</dd>
            </div>
            <div>
              <dt>Dimensions</dt>
              <dd>${getDimensions(product)}</dd>
            </div>
            <div>
              <dt>Price</dt>
              <dd>${product.price || "On request"}</dd>
            </div>
          </dl>
          <div class="catalog-book-actions">
            <a class="catalog-book-button" href="${detailPageUrl}">View Details</a>
            <a class="catalog-book-button catalog-book-button--ghost" href="${enquireLink}">Enquire</a>
          </div>
        </section>
      </article>
    `;
  };

  const buildSpreadPages = () => {
    contentEl.innerHTML = products
      .map(
        (product, index) => `
          <div class="catalog-spread-page" data-product-index="${index}">
            ${buildSpreadMarkup(product, index)}
          </div>
        `
      )
      .join("");

    return Array.from(contentEl.querySelectorAll(".catalog-spread-page"));
  };

  if (heroImage) {
    heroImage.src = category.heroImage;
  }

  if (heroKicker) {
    heroKicker.textContent = category.title;
  }

  if (heroTitle) {
    heroTitle.textContent = category.title;
  }

  if (heroCopy) {
    heroCopy.textContent = category.heroCopy;
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

  let pageFlip = null;
  let zoomValue = 1;

  const setScale = (value) => {
    const next = Math.max(0.88, Math.min(1.14, value));
    stageEl.style.setProperty("--book-scale", next.toFixed(3));
    zoomValue = next;
    if (zoomRangeEl) {
      zoomRangeEl.value = String(next);
    }
  };

  const updatePagingUi = () => {
    if (!pageFlip) {
      return;
    }

    const total = products.length;
    const current = pageFlip.getCurrentPageIndex() + 1;

    if (pageCurrentEl) {
      pageCurrentEl.textContent = String(current).padStart(2, "0");
    }

    if (pageTotalEl) {
      pageTotalEl.textContent = String(total).padStart(2, "0");
    }

    if (jumpInputEl) {
      jumpInputEl.value = String(current);
      jumpInputEl.max = String(total);
    }

    if (prevButton) {
      prevButton.disabled = current <= 1;
    }

    if (nextButton) {
      nextButton.disabled = current >= total;
    }
  };

  const goToPage = (pageNumber) => {
    if (!pageFlip) {
      return;
    }

    const total = products.length;
    const targetPage = Math.max(1, Math.min(total, pageNumber));
    pageFlip.flip(targetPage - 1, "top");
  };

  const initBook = () => {
    if (!window.St?.PageFlip) {
      return;
    }

    const pageNodes = buildSpreadPages();

    pageFlip = new window.St.PageFlip(stageEl, {
      width: 1120,
      height: 620,
      size: "stretch",
      minWidth: 320,
      maxWidth: 1300,
      minHeight: 440,
      maxHeight: 840,
      autoSize: true,
      maxShadowOpacity: prefersReducedMotion ? 0 : 0.38,
      showCover: false,
      mobileScrollSupport: false,
      usePortrait: true,
      drawShadow: !prefersReducedMotion,
      flippingTime: prefersReducedMotion ? 0 : 900,
      swipeDistance: 34,
      startPage: 0,
      useMouseEvents: true
    });

    pageFlip.loadFromHTML(pageNodes);
    updatePagingUi();

    pageFlip.on("flip", updatePagingUi);
    pageFlip.on("changeOrientation", updatePagingUi);
  };

  const bindControls = () => {
    if (prevButton) {
      prevButton.addEventListener("click", () => {
        pageFlip?.flipPrev("top");
      });
    }

    if (nextButton) {
      nextButton.addEventListener("click", () => {
        pageFlip?.flipNext("top");
      });
    }

    if (zoomOutButton) {
      zoomOutButton.addEventListener("click", () => setScale(zoomValue - 0.06));
    }

    if (zoomInButton) {
      zoomInButton.addEventListener("click", () => setScale(zoomValue + 0.06));
    }

    if (zoomRangeEl) {
      zoomRangeEl.addEventListener("input", (event) => {
        setScale(Number(event.target.value));
      });
    }

    if (jumpGoButton && jumpInputEl) {
      jumpGoButton.addEventListener("click", () => {
        goToPage(Number(jumpInputEl.value));
      });
    }

    if (jumpInputEl) {
      jumpInputEl.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          goToPage(Number(jumpInputEl.value));
        }
      });
    }
  };

  setScale(1);
  bindControls();
  preloadAssets().then(initBook);

  setHeaderState();
  window.addEventListener("scroll", setHeaderState, { passive: true });

  window.addEventListener("beforeunload", () => {
    pageFlip?.destroy();
  });
})();
