const videos = Array.from(document.querySelectorAll(".hero-video-layer"));
const navDock = document.querySelector(".hero-nav-dock");
const navItems = Array.from(document.querySelectorAll(".hero-nav-bottom .nav-item[data-video-target]"));
const panels = Array.from(document.querySelectorAll(".mega-panel[data-panel]"));
const showcaseSection = document.querySelector("#craft-showcase");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (videos.length > 0) {
  const SWITCH_DELAY_MS = prefersReducedMotion ? 0 : 130;
  const PANEL_HIDE_DELAY_MS = 100;
  const activeClass = "is-active";
  const openPanelClass = "is-open";
  let activeKey = "default";
  let activePanelKey = null;
  let switchTimer = null;
  let panelHideTimer = null;

  const videoMap = videos.reduce((acc, video) => {
    const key = video.dataset.video;
    if (key) {
      acc[key] = video;
    }
    return acc;
  }, {});

  const panelMap = panels.reduce((acc, panel) => {
    const key = panel.dataset.panel;
    if (key) {
      acc[key] = panel;
    }
    return acc;
  }, {});

  const safePlay = (video) => {
    if (!video) {
      return;
    }

    video.play().catch(() => {
      // Autoplay may be delayed until user interaction.
    });
  };

  const switchTo = (nextKey) => {
    if (!videoMap[nextKey] || nextKey === activeKey) {
      return;
    }

    const currentVideo = videoMap[activeKey];
    const nextVideo = videoMap[nextKey];

    if (nextVideo) {
      nextVideo.currentTime = 0;
      safePlay(nextVideo);
      nextVideo.classList.add(activeClass);
    }

    if (currentVideo && currentVideo !== nextVideo) {
      currentVideo.classList.remove(activeClass);
    }

    activeKey = nextKey;
  };

  const queueSwitch = (nextKey) => {
    if (switchTimer) {
      window.clearTimeout(switchTimer);
    }

    switchTimer = window.setTimeout(() => {
      switchTo(nextKey);
    }, SWITCH_DELAY_MS);
  };

  const clearPanelHide = () => {
    if (panelHideTimer) {
      window.clearTimeout(panelHideTimer);
      panelHideTimer = null;
    }
  };

  const closePanels = () => {
    panels.forEach((panel) => {
      panel.classList.remove(openPanelClass);
      panel.style.removeProperty("left");
      panel.style.removeProperty("--parallax-x");
    });
    activePanelKey = null;
  };

  const queueClosePanels = () => {
    clearPanelHide();
    panelHideTimer = window.setTimeout(() => {
      closePanels();
    }, PANEL_HIDE_DELAY_MS);
  };

  const centerPanelToItem = (panel, item) => {
    if (!panel || !item || !navDock) {
      return;
    }

    const itemRect = item.getBoundingClientRect();
    const dockRect = navDock.getBoundingClientRect();
    const centerX = itemRect.left - dockRect.left + itemRect.width / 2;
    panel.style.left = `${centerX}px`;
  };

  const openPanel = (panelKey, item) => {
    clearPanelHide();

    if (!panelKey || !panelMap[panelKey]) {
      closePanels();
      return;
    }

    const targetPanel = panelMap[panelKey];
    centerPanelToItem(targetPanel, item);

    panels.forEach((panel) => {
      if (panel === targetPanel) {
        panel.classList.add(openPanelClass);
      } else {
        panel.classList.remove(openPanelClass);
      }
    });

    activePanelKey = panelKey;
  };

  videos.forEach((video) => {
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    if (!prefersReducedMotion) {
      safePlay(video);
    }
  });

  navItems.forEach((item) => {
    item.addEventListener("mouseenter", () => {
      const target = item.dataset.videoTarget;
      if (target) {
        queueSwitch(target);
      }

      openPanel(item.dataset.panelTarget, item);
    });

    item.addEventListener("focus", () => {
      const target = item.dataset.videoTarget;
      if (target) {
        queueSwitch(target);
      }

      openPanel(item.dataset.panelTarget, item);
    });

    item.addEventListener("click", () => {
      openPanel(item.dataset.panelTarget, item);
    });
  });

  if (navDock) {
    navDock.addEventListener("mouseenter", clearPanelHide);

    navDock.addEventListener("mouseleave", () => {
      queueSwitch("default");
      queueClosePanels();
    });
  }

  panels.forEach((panel) => {
    panel.addEventListener("mousemove", (event) => {
      const rect = panel.getBoundingClientRect();
      const ratio = (event.clientX - rect.left) / rect.width - 0.5;
      panel.style.setProperty("--parallax-x", `${ratio * 6}px`);
    });

    panel.addEventListener("mouseleave", () => {
      panel.style.setProperty("--parallax-x", "0px");
      queueClosePanels();
    });
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
      const elements = showcaseSection.querySelectorAll(".basant-stat, .basant-description, .frame-image");
      window.gsap.set(elements, { clearProps: "all", opacity: 1 });
    });
  }
}
