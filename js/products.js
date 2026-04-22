(() => {
  const catalog = window.RETRO_CATALOG;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const header = document.querySelector("[data-premium-nav]");
  const hero = document.querySelector(".products-hero");
  const bgStack = document.querySelector(".products-story-bg-stack");
  const cardStack = document.querySelector(".products-story-card-stack");
  const timeline = document.querySelector(".products-story-timeline");
  const storySection = document.querySelector("#products-story");

  if (!catalog || !bgStack || !cardStack || !timeline || !storySection) {
    return;
  }

  const categories = catalog.categories;
  const heroImage = hero?.querySelector("img");
  const heroCopy = hero?.querySelectorAll(".products-hero-content > *");
  const categoryCards = [];
  const bgCards = [];
  let activeIndex = 0;
  let scrollBounds = null;

  const buildBackgrounds = () => {
    bgStack.innerHTML = categories
      .map((category, index) => `
        <figure class="products-story-bg ${index === 0 ? "is-active" : ""}" data-bg-index="${index}">
          <img src="${category.heroImage}" alt="${category.title} background">
        </figure>
      `)
      .join("") + '<div class="products-story-overlay"></div>';

    bgCards.push(...Array.from(bgStack.querySelectorAll(".products-story-bg")));
  };

  const buildCards = () => {
    cardStack.innerHTML = categories
      .map((category, index) => `
        <article class="products-story-card ${index === 0 ? "is-active" : ""}" data-card-index="${index}">
          <div class="products-story-card-media">
            <img src="${category.heroImage}" alt="${category.title}">
          </div>
          <div class="products-story-card-copy">
            <p class="products-card-kicker">0${index + 1} / Category</p>
            <h2>${category.title}</h2>
            <p>${category.story}</p>
            <a class="products-card-button" href="${catalog.getCategoryPage(category.slug)}">View Catalog</a>
          </div>
        </article>
      `)
      .join("");

    categoryCards.push(...Array.from(cardStack.querySelectorAll(".products-story-card")));
  };

  const buildTimeline = () => {
    timeline.innerHTML = categories
      .map((category, index) => `
        <button type="button" class="products-timeline-step ${index === 0 ? "is-active" : ""}" data-step="${index}">
          <span class="products-timeline-dot"></span>
          <span class="products-timeline-label">${category.title}</span>
        </button>
      `)
      .join("");
  };

  const setHeaderState = () => {
    if (!header) {
      return;
    }

    header.classList.toggle("is-solid", window.scrollY > 18);
  };

  const setActive = (nextIndex, animated = true) => {
    if (nextIndex === activeIndex || nextIndex < 0 || nextIndex >= categories.length) {
      return;
    }

    const prevCard = categoryCards[activeIndex];
    const nextCard = categoryCards[nextIndex];
    const prevBg = bgCards[activeIndex];
    const nextBg = bgCards[nextIndex];

    categoryCards.forEach((card, index) => {
      card.classList.toggle("is-active", index === nextIndex);
    });

    bgCards.forEach((bg, index) => {
      bg.classList.toggle("is-active", index === nextIndex);
    });

    timeline.querySelectorAll(".products-timeline-step").forEach((step, index) => {
      step.classList.toggle("is-active", index === nextIndex);
    });

    if (animated && !prefersReducedMotion && window.gsap) {
      window.gsap.to(prevBg, { opacity: 0, scale: 1.05, duration: 0.7, ease: "power2.out", overwrite: "auto" });
      window.gsap.fromTo(nextBg, { opacity: 0, scale: 1.05 }, { opacity: 1, scale: 1, duration: 0.9, ease: "power2.out", overwrite: "auto" });
      window.gsap.to(prevCard, { opacity: 0, y: -26, duration: 0.5, ease: "power2.out", overwrite: "auto" });
      window.gsap.fromTo(nextCard, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.8, ease: "power2.out", overwrite: "auto" });
    } else {
      categoryCards.forEach((card, index) => {
        card.style.opacity = index === nextIndex ? "1" : "0";
        card.style.transform = index === nextIndex ? "translateY(0)" : "translateY(18px)";
      });

      bgCards.forEach((bg, index) => {
        bg.style.opacity = index === nextIndex ? "1" : "0";
        bg.style.transform = index === nextIndex ? "scale(1)" : "scale(1.05)";
      });
    }

    activeIndex = nextIndex;
  };

  const setup = () => {
    buildBackgrounds();
    buildCards();
    buildTimeline();

    if (heroImage && categories[0]) {
      heroImage.src = categories[0].heroImage;
    }

    if (heroCopy?.length && categories[0]) {
      const heading = hero.querySelector("h1");
      const paragraph = hero.querySelector(".products-hero-copy");
      if (heading) {
        heading.textContent = "Our Products";
      }
      if (paragraph) {
        paragraph.textContent = categories[0].heroCopy;
      }
    }

    if (window.gsap) {
      window.gsap.registerPlugin(window.ScrollTrigger);

      if (!prefersReducedMotion) {
        if (heroImage) {
          window.gsap.fromTo(heroImage, { scale: 1.08 }, { scale: 1, duration: 1.5, ease: "power2.out" });
        }

        if (heroCopy?.length) {
          window.gsap.from(heroCopy, {
            opacity: 0,
            y: 28,
            duration: 0.8,
            stagger: 0.1,
            ease: "power2.out",
            delay: 0.1
          });
        }
      } else {
        window.gsap.set(heroCopy, { opacity: 1, y: 0 });
      }
    }

    if (prefersReducedMotion) {
      setActive(0, false);
    }

    const trigger = window.ScrollTrigger.create({
      trigger: storySection,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.8,
      onUpdate: (self) => {
        const nextIndex = Math.round(self.progress * (categories.length - 1));
        setActive(nextIndex, true);
        bgCards.forEach((bg, index) => {
          const offset = (index - nextIndex) * 5;
          if (window.gsap) {
            window.gsap.to(bg, { yPercent: offset, duration: 0.3, ease: "none", overwrite: true });
          }
        });
      },
      onRefresh: (instance) => {
        scrollBounds = { start: instance.start, end: instance.end };
      }
    });

    scrollBounds = { start: trigger.start, end: trigger.end };

    timeline.querySelectorAll(".products-timeline-step").forEach((step) => {
      step.addEventListener("click", () => {
        if (!scrollBounds) {
          return;
        }

        const targetIndex = Number(step.dataset.step || 0);
        const targetProgress = targetIndex / (categories.length - 1);
        const targetScroll = scrollBounds.start + (scrollBounds.end - scrollBounds.start) * targetProgress;
        window.scrollTo({ top: targetScroll, behavior: "smooth" });
      });
    });
  };

  setHeaderState();
  setup();

  window.addEventListener("scroll", setHeaderState, { passive: true });
})();
