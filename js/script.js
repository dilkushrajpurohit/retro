const videos = Array.from(document.querySelectorAll(".hero-video-layer"));
const heroWrapper = document.querySelector(".hero-wrapper");
const heroStageShell = document.querySelector(".hero-stage-shell");
const heroSidebar = document.querySelector(".hero-sidebar");
const heroSubmenu = document.querySelector("[data-hero-submenu]");
const heroCursor = document.querySelector("[data-hero-cursor]");
const heroNavItems = Array.from(document.querySelectorAll(".hero-nav-vertical .nav-item[data-hero-target]"));
const showcaseSection = document.querySelector("#craft-showcase");
const menuToggle = document.querySelector("[data-hero-menu-toggle]");
const mobileMenu = document.querySelector("[data-hero-mobile-menu]");
const mobileMenuCloseTargets = Array.from(document.querySelectorAll("[data-hero-mobile-menu-close]"));
const mobileMenuLinks = Array.from(document.querySelectorAll(".hero-mobile-link[data-video-target]"));
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hasFinePointer = window.matchMedia("(pointer: fine)").matches;

if (videos.length > 0 && heroWrapper) {
  const activeClass = "is-active";
  const SWITCH_DELAY_MS = prefersReducedMotion ? 0 : 110;
  let activeKey = "default";
  let switchTimer = null;
  let submenuTimer = null;

  const videoMap = videos.reduce((acc, video) => {
    const key = video.dataset.video;
    if (key) {
      acc[key] = video;
    }
    return acc;
  }, {});

  const submenuData = {
    default: {
      kicker: "Craft story",
      title: "Material stories with a cinematic finish.",
      copy:
        "Explore reclaimed wood, custom interiors, and premium accessories through a slower, more tactile lens.",
      metrics: [
        { value: "11+", label: "Years building spaces" },
        { value: "30+", label: "Countries reached" }
      ],
      action: "Schedule a consult"
    },
    about: {
      kicker: "Inside Retro",
      title: "A studio shaped by grain, light, and precision.",
      copy:
        "See how the team balances reclaimed character with a disciplined, premium interior language.",
      metrics: [
        { value: "Story-led", label: "Design approach" },
        { value: "Made to fit", label: "Custom detailing" }
      ],
      action: "Meet the team"
    },
    contact: {
      kicker: "Start here",
      title: "Book a consult and define the space.",
      copy:
        "Talk through measurements, materials, timelines, and visual direction with the studio.",
      metrics: [
        { value: "Fast", label: "Response window" },
        { value: "Personal", label: "Project guidance" }
      ],
      action: "Open contact"
    },
    projects: {
      kicker: "Selected work",
      title: "Retail, residential, and hospitality stories.",
      copy:
        "Browse projects that blend bold atmosphere with warm, material-driven execution.",
      metrics: [
        { value: "Retail", label: "Mood setting" },
        { value: "Residential", label: "Comfort focus" }
      ],
      action: "View projects"
    },
    showroom: {
      kicker: "Immersive view",
      title: "Walk the showroom before you arrive.",
      copy:
        "Use the virtual showroom to preview the tactile mix of wood, texture, and tailored furniture.",
      metrics: [
        { value: "Virtual", label: "Preview experience" },
        { value: "Spatial", label: "Product context" }
      ],
      action: "Enter showroom"
    },
    products: {
      kicker: "Collections",
      title: "Furniture and accessories with a premium edge.",
      copy:
        "Move through chairs, tables, and decorative pieces with the same cinematic treatment.",
      metrics: [
        { value: "Chairs", label: "Featured range" },
        { value: "Tables", label: "Anchor pieces" }
      ],
      action: "Browse products"
    }
  };

  const safePlay = (video) => {
    if (!video) {
      return;
    }

    const playResult = video.play();
    if (playResult && typeof playResult.catch === "function") {
      playResult.catch(() => {
        // Autoplay can still be deferred until a user gesture.
      });
    }
  };

  const setMenuState = (isOpen) => {
    if (!menuToggle || !mobileMenu) {
      return;
    }

    mobileMenu.hidden = !isOpen;
    menuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    document.body.classList.toggle("menu-open", isOpen);
  };

  const closeMenu = () => setMenuState(false);
  const openMenu = () => setMenuState(true);

  const setActiveNavItem = (key) => {
    heroNavItems.forEach((item) => {
      item.classList.toggle("is-active", item.dataset.heroTarget === key);
    });
  };

  const renderSubmenu = (key) => {
    if (!heroSubmenu) {
      return;
    }

    const data = submenuData[key] || submenuData.default;
    const metricMarkup = data.metrics
      .map(
        (metric) => `
          <div>
            <span>${metric.value}</span>
            <small>${metric.label}</small>
          </div>
        `
      )
      .join("");

    heroSubmenu.innerHTML = `
      <p class="hero-submenu-kicker">${data.kicker}</p>
      <h3 class="hero-submenu-title">${data.title}</h3>
      <p class="hero-submenu-copy">${data.copy}</p>
      <div class="hero-submenu-metrics">${metricMarkup}</div>
      <a class="hero-secondary hero-submenu-link" href="contact.html">${data.action}</a>
    `;

    if (window.gsap && !prefersReducedMotion) {
      const elements = Array.from(heroSubmenu.children);
      window.gsap.fromTo(
        elements,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.45, stagger: 0.045, ease: "power2.out" }
      );
    }
  };

  const switchVideo = (nextKey, immediate = false) => {
    const nextVideo = videoMap[nextKey] || videoMap.default;
    const currentVideo = videoMap[activeKey] || videoMap.default;

    if (!nextVideo || nextKey === activeKey) {
      setActiveNavItem(nextKey || activeKey);
      return;
    }

    if (switchTimer) {
      window.clearTimeout(switchTimer);
      switchTimer = null;
    }

    const runSwitch = () => {
      const previousKey = activeKey;
      const previousVideo = videoMap[previousKey] || videoMap.default;

      nextVideo.currentTime = 0;
      nextVideo.classList.add(activeClass);
      safePlay(nextVideo);

      if (window.gsap) {
        window.gsap.killTweensOf([previousVideo, nextVideo]);
        const timeline = window.gsap.timeline({ defaults: { overwrite: true } });

        timeline.set(nextVideo, { opacity: 0, scale: 1.06, zIndex: 2 });
        if (previousVideo && previousVideo !== nextVideo) {
          timeline.set(previousVideo, { zIndex: 1 });
        }

        timeline.to(nextVideo, { opacity: 1, scale: 1, duration: prefersReducedMotion ? 0 : 0.95, ease: "power3.out" }, 0);

        if (previousVideo && previousVideo !== nextVideo) {
          timeline.to(previousVideo, { opacity: 0, scale: 1.03, duration: prefersReducedMotion ? 0 : 0.72, ease: "power2.inOut" }, 0);
        }

        timeline.add(() => {
          if (previousVideo && previousVideo !== nextVideo) {
            previousVideo.classList.remove(activeClass);
            previousVideo.pause();
          }

          activeKey = nextKey;
          setActiveNavItem(nextKey);
          renderSubmenu(nextKey);
        }, prefersReducedMotion ? 0 : 0.12);
      } else {
        if (previousVideo && previousVideo !== nextVideo) {
          previousVideo.classList.remove(activeClass);
          previousVideo.pause();
          previousVideo.style.opacity = 0;
        }

        nextVideo.style.opacity = 1;
        nextVideo.style.transform = "scale(1)";
        activeKey = nextKey;
        setActiveNavItem(nextKey);
        renderSubmenu(nextKey);
      }
    };

    if (immediate || SWITCH_DELAY_MS === 0) {
      runSwitch();
      return;
    }

    switchTimer = window.setTimeout(runSwitch, SWITCH_DELAY_MS);
  };

  const resetHeroMotion = () => {
    if (!heroWrapper) {
      return;
    }

    heroWrapper.style.setProperty("--hero-media-offset-x", "0px");
    heroWrapper.style.setProperty("--hero-media-offset-y", "0px");
    heroWrapper.style.setProperty("--hero-stage-offset-x", "0px");
    heroWrapper.style.setProperty("--hero-stage-offset-y", "0px");

    if (heroCursor) {
      heroCursor.classList.remove("is-visible", "is-hover");
    }
  };

  const updateHeroMotion = (event) => {
    if (!heroWrapper || !hasFinePointer || prefersReducedMotion) {
      return;
    }

    const bounds = heroWrapper.getBoundingClientRect();
    const relativeX = (event.clientX - bounds.left) / bounds.width - 0.5;
    const relativeY = (event.clientY - bounds.top) / bounds.height - 0.5;

    heroWrapper.style.setProperty("--hero-media-offset-x", `${relativeX * 24}px`);
    heroWrapper.style.setProperty("--hero-media-offset-y", `${relativeY * 18}px`);
    heroWrapper.style.setProperty("--hero-stage-offset-x", `${relativeX * 12}px`);
    heroWrapper.style.setProperty("--hero-stage-offset-y", `${relativeY * 10}px`);
  };

  if (window.gsap && heroCursor && hasFinePointer && !prefersReducedMotion) {
    const cursorToX = window.gsap.quickTo(heroCursor, "x", { duration: 0.32, ease: "power3.out" });
    const cursorToY = window.gsap.quickTo(heroCursor, "y", { duration: 0.32, ease: "power3.out" });

    heroWrapper.addEventListener("pointerenter", () => {
      heroCursor.classList.add("is-visible");
    });

    heroWrapper.addEventListener("pointermove", (event) => {
      cursorToX(event.clientX);
      cursorToY(event.clientY);
      updateHeroMotion(event);
      heroCursor.classList.add("is-visible");
    });

    heroWrapper.addEventListener("pointerleave", () => {
      resetHeroMotion();
      cursorToX(-120);
      cursorToY(-120);
    });

    const hoverTargets = Array.from(
      heroWrapper.querySelectorAll(".nav-item, .hero-secondary, .hero-menu-toggle, .hero-mobile-link")
    );

    hoverTargets.forEach((target) => {
      target.addEventListener("pointerenter", () => {
        heroCursor.classList.add("is-hover", "is-visible");
      });

      target.addEventListener("pointerleave", () => {
        heroCursor.classList.remove("is-hover");
      });
    });
  }

  videos.forEach((video, index) => {
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    if (index === 0) {
      video.classList.add(activeClass);
      video.style.opacity = 1;
      video.style.transform = "scale(1)";
    } else {
      video.style.opacity = 0;
      video.style.transform = "scale(1.06)";
    }

    if (!prefersReducedMotion) {
      safePlay(video);
    }
  });

  setActiveNavItem(activeKey);
  renderSubmenu(activeKey);

  heroNavItems.forEach((item) => {
    item.addEventListener("pointerenter", () => {
      switchVideo(item.dataset.heroTarget || "default");
    });

    item.addEventListener("focus", () => {
      switchVideo(item.dataset.heroTarget || "default", true);
    });

    item.addEventListener("click", () => {
      switchVideo(item.dataset.heroTarget || "default", true);
    });
  });

  if (heroSidebar) {
    heroSidebar.addEventListener("pointerleave", () => {
      switchVideo("default");
    });
  }

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener("click", () => {
      const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
      setMenuState(!isOpen);
    });

    mobileMenuCloseTargets.forEach((target) => {
      target.addEventListener("click", closeMenu);
    });

    mobileMenuLinks.forEach((link) => {
      link.addEventListener("click", () => {
        closeMenu();
      });
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    });
  }

  window.addEventListener("resize", () => {
    if (!window.matchMedia("(max-width: 760px)").matches) {
      closeMenu();
    }
  });

  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) {
        videos.forEach((video) => video.pause());
        return;
      }

      if (prefersReducedMotion) {
        return;
      }

      const currentVideo = videoMap[activeKey] || videoMap.default;
      safePlay(currentVideo);
      videos.forEach((video) => {
        if (video !== currentVideo) {
          video.pause();
        }
      });
    },
    { passive: true }
  );
}

if (showcaseSection && window.gsap && window.ScrollTrigger) {
  window.gsap.registerPlugin(window.ScrollTrigger);

  const typingTarget = showcaseSection.querySelector("[data-mobile-typing]");

  const startTypingLoop = () => {
    if (!typingTarget || typingTarget.dataset.typingLoopStarted === "true") {
      return;
    }

    const originalText = typingTarget.dataset.mobileTyping || typingTarget.textContent.trim();
    typingTarget.dataset.typingLoopStarted = "true";
    typingTarget.classList.add("is-typing-years");

    const textNode = typingTarget.querySelector(".basant-typewriter-text");
    const cursorNode = typingTarget.querySelector(".basant-typewriter-cursor");

    if (!textNode || !cursorNode) {
      typingTarget.textContent = "";
      typingTarget.textContent = originalText;
      return;
    }

    textNode.textContent = "";

    const typeDelay = 90;
    const deleteDelay = 60;
    const holdDelay = 1050;
    const restartDelay = 240;
    let charIndex = 0;

    const typeNext = () => {
      charIndex += 1;
      textNode.textContent = originalText.slice(0, charIndex);

      if (charIndex < originalText.length) {
        window.setTimeout(typeNext, typeDelay);
        return;
      }

      window.setTimeout(deleteNext, holdDelay);
    };

    const deleteNext = () => {
      charIndex -= 1;
      textNode.textContent = originalText.slice(0, Math.max(charIndex, 0));

      if (charIndex > 0) {
        window.setTimeout(deleteNext, deleteDelay);
        return;
      }

      window.setTimeout(typeNext, restartDelay);
    };

    window.setTimeout(typeNext, 260);
  };

  window.ScrollTrigger.create({
    trigger: showcaseSection,
    start: "top 84%",
    onEnter: startTypingLoop,
    toggleActions: "play pause resume pause"
  });

  if (prefersReducedMotion) {
    const staticItems = showcaseSection.querySelectorAll(".basant-stat, .basant-description, .frame-image");
    window.gsap.set(staticItems, { clearProps: "all", opacity: 1, y: 0, x: 0, rotate: 0, scale: 1 });
  } else {
    const mm = window.gsap.matchMedia();

    mm.add("(min-width: 761px)", () => {
      const frameItems = {
        main: showcaseSection.querySelector('[data-assemble="main"]'),
        topRight: showcaseSection.querySelector('[data-assemble="top-right"]'),
        bottomLeft: showcaseSection.querySelector('[data-assemble="bottom-left"]'),
        rightMid: showcaseSection.querySelector('[data-assemble="right-mid"]'),
        topLeft: showcaseSection.querySelector('[data-assemble="top-left"]')
      };

      const textItems = showcaseSection.querySelectorAll(".basant-stat, .basant-description");

      window.gsap.set(textItems, { opacity: 0, y: 30, willChange: "transform, opacity" });
      window.gsap.set(frameItems.main, { opacity: 0, x: 0, y: 90, scale: 1.08, rotate: -1.4, zIndex: 2, willChange: "transform, opacity" });
      window.gsap.set(frameItems.topRight, { opacity: 0, x: 210, y: -120, scale: 1.13, rotate: 5, zIndex: 5, willChange: "transform, opacity" });
      window.gsap.set(frameItems.bottomLeft, { opacity: 0, x: -220, y: 130, scale: 1.11, rotate: -4, zIndex: 4, willChange: "transform, opacity" });
      window.gsap.set(frameItems.rightMid, { opacity: 0, x: 260, y: 45, scale: 1.12, rotate: 4, zIndex: 3, willChange: "transform, opacity" });
      window.gsap.set(frameItems.topLeft, { opacity: 0, x: -180, y: -130, scale: 1.11, rotate: -6, zIndex: 6, willChange: "transform, opacity" });

      const timeline = window.gsap.timeline({
        defaults: { ease: "power2.out" },
        scrollTrigger: {
          trigger: showcaseSection,
          start: "top 76%",
          end: "bottom 18%",
          scrub: 0.95
        }
      });

      timeline
        .to(textItems, { opacity: 1, y: 0, duration: 0.55, stagger: 0.08 }, 0)
        .to(frameItems.main, { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0, duration: 1.15 }, 0.04)
        .to(frameItems.topRight, { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0, duration: 1.05 }, 0.1)
        .to(frameItems.bottomLeft, { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0, duration: 1.1 }, 0.16)
        .to(frameItems.rightMid, { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0, duration: 1.05 }, 0.22)
        .to(frameItems.topLeft, { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0, duration: 1.15 }, 0.28);
    });

    mm.add("(max-width: 760px)", () => {
      const statElements = showcaseSection.querySelectorAll(".basant-stat");
      const textItems = showcaseSection.querySelectorAll(".basant-description");
      const imageItems = showcaseSection.querySelectorAll(".frame-image");

      window.gsap.set(statElements, { clearProps: "all", opacity: 1, y: 0, x: 0, scale: 1, rotate: 0 });
      window.gsap.set(textItems, { opacity: 0, y: 18, scale: 0.98, willChange: "transform, opacity" });
      window.gsap.set(imageItems, { opacity: 0, x: -52, y: 18, scale: 0.96, willChange: "transform, opacity" });

      window.gsap.timeline({
        scrollTrigger: {
          trigger: showcaseSection,
          start: "top 82%",
          end: "bottom 20%",
          scrub: 0.95
        }
      })
        .to(textItems, { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "power2.out" }, 0.12)
        .to(imageItems, { opacity: 1, x: 0, y: 0, scale: 1, duration: 0.85, stagger: 0.12, ease: "power3.out" }, 0.22);
    });
  }
}
