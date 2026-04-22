const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const heroSection = document.querySelector(".cinema-about-hero");
const quoteSection = document.querySelector(".cinema-quote-break");
const storySection = document.querySelector("#cinema-story");

if (window.gsap && window.ScrollTrigger) {
  window.gsap.registerPlugin(window.ScrollTrigger);

  if (heroSection) {
    const heroBg = heroSection.querySelector(".cinema-hero-bg img");
    const heroCopy = heroSection.querySelectorAll(".cinema-hero-inner > *");

    if (!prefersReducedMotion) {
      window.gsap.fromTo(
        heroBg,
        { scale: 1.08 },
        { scale: 1, duration: 1.8, ease: "power2.out" }
      );

      window.gsap.from(heroCopy, {
        opacity: 0,
        y: 28,
        duration: 0.85,
        ease: "power2.out",
        stagger: 0.12,
        delay: 0.15
      });
    } else {
      window.gsap.set(heroBg, { scale: 1 });
      window.gsap.set(heroCopy, { opacity: 1, y: 0 });
    }
  }

  if (quoteSection && !prefersReducedMotion) {
    window.gsap.from(quoteSection.querySelector(".cinema-quote"), {
      scrollTrigger: {
        trigger: quoteSection,
        start: "top 80%"
      },
      opacity: 0,
      y: 24,
      duration: 0.85,
      ease: "power2.out"
    });
  }

  if (storySection) {
    const bgLayers = Array.from(storySection.querySelectorAll(".cinema-story-bg"));
    const frames = Array.from(storySection.querySelectorAll(".cinema-story-frame"));
    const steps = Array.from(storySection.querySelectorAll(".cinema-timeline-step"));
    const totalFrames = frames.length;
    let activeIndex = 0;
    let scrollBounds = null;

    const setActiveStep = (index) => {
      steps.forEach((step, stepIndex) => {
        const isActive = stepIndex === index;
        step.classList.toggle("is-active", isActive);
        step.setAttribute("aria-current", isActive ? "step" : "false");
      });
    };

    const animateRevealSet = (root, motionType) => {
      const items = root.querySelectorAll("[data-anim]");
      if (!items.length || prefersReducedMotion) {
        return;
      }

      const initial = { opacity: 0, y: 20, scale: 0.98, x: 0 };
      const animations = Array.from(items).map((item) => {
        const type = item.dataset.anim;
        if (type === "left") {
          return { element: item, from: { opacity: 0, x: -90, y: 16, scale: 0.98 } };
        }
        if (type === "right") {
          return { element: item, from: { opacity: 0, x: 90, y: 16, scale: 0.98 } };
        }
        if (type === "scale") {
          return { element: item, from: { opacity: 0, scale: 1.1 } };
        }
        if (type === "fade") {
          return { element: item, from: { opacity: 0, y: 0, scale: 0.98 } };
        }
        return { element: item, from: initial };
      });

      window.gsap.set(items, { willChange: "transform, opacity" });
      animations.forEach(({ element, from }, index) => {
        window.gsap.fromTo(
          element,
          from,
          {
            opacity: 1,
            x: 0,
            y: 0,
            scale: 1,
            duration: 0.8,
            ease: "power2.out",
            delay: index * 0.06,
            overwrite: true
          }
        );
      });
    };

    const switchFrame = (nextIndex) => {
      if (nextIndex === activeIndex || nextIndex < 0 || nextIndex >= totalFrames) {
        return;
      }

      const prevBg = bgLayers[activeIndex];
      const nextBg = bgLayers[nextIndex];
      const prevFrame = frames[activeIndex];
      const nextFrame = frames[nextIndex];

      prevBg.classList.remove("is-active");
      nextBg.classList.add("is-active");
      prevFrame.classList.remove("is-active");
      nextFrame.classList.add("is-active");

      if (!prefersReducedMotion) {
        window.gsap.to(prevBg, { opacity: 0, scale: 1.05, duration: 0.75, ease: "power2.out", overwrite: "auto" });
        window.gsap.fromTo(nextBg, { opacity: 0, scale: 1.05 }, { opacity: 1, scale: 1, duration: 0.9, ease: "power2.out", overwrite: "auto" });
        window.gsap.to(prevFrame, { opacity: 0, y: -18, duration: 0.55, ease: "power2.out", overwrite: "auto" });
        window.gsap.fromTo(nextFrame, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.75, ease: "power2.out", overwrite: "auto" });
        animateRevealSet(nextFrame);
      } else {
        window.gsap.set(prevBg, { opacity: 0 });
        window.gsap.set(nextBg, { opacity: 1, scale: 1 });
        window.gsap.set(prevFrame, { opacity: 0 });
        window.gsap.set(nextFrame, { opacity: 1, y: 0 });
      }

      setActiveStep(nextIndex);
      activeIndex = nextIndex;
    };

    window.gsap.set(bgLayers, { opacity: 0, scale: 1.05, willChange: "transform, opacity" });
    window.gsap.set(frames, { opacity: 0, y: 20, willChange: "transform, opacity" });
    window.gsap.set(bgLayers[0], { opacity: 1, scale: 1 });
    window.gsap.set(frames[0], { opacity: 1, y: 0 });
    setActiveStep(0);
    animateRevealSet(frames[0]);

    if (prefersReducedMotion) {
      bgLayers.forEach((bg, index) => {
        bg.style.opacity = index === 0 ? "1" : "0";
        bg.style.transform = "scale(1)";
      });

      frames.forEach((frame, index) => {
        frame.style.opacity = index === 0 ? "1" : "0";
        frame.style.transform = "none";
      });
    } else {
      const trigger = window.ScrollTrigger.create({
        trigger: storySection,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.9,
        onUpdate: (self) => {
          const nextIndex = Math.round(self.progress * (totalFrames - 1));
          switchFrame(nextIndex);

          bgLayers.forEach((bg, index) => {
            const offset = (index - nextIndex) * 5;
            window.gsap.to(bg, {
              yPercent: offset,
              duration: 0.3,
              ease: "none",
              overwrite: true
            });
          });
        },
        onRefresh: (instance) => {
          scrollBounds = { start: instance.start, end: instance.end };
        }
      });

      scrollBounds = { start: trigger.start, end: trigger.end };

      steps.forEach((step) => {
        step.addEventListener("click", () => {
          if (!scrollBounds) {
            return;
          }

          const targetIndex = Number(step.dataset.step || 0);
          const targetProgress = targetIndex / (totalFrames - 1);
          const targetScroll = scrollBounds.start + (scrollBounds.end - scrollBounds.start) * targetProgress;
          window.scrollTo({ top: targetScroll, behavior: "smooth" });
        });
      });
    }
  }

  if (quoteSection) {
    window.ScrollTrigger.create({
      trigger: quoteSection,
      start: "top 84%",
      onEnter: () => {
        window.gsap.fromTo(
          quoteSection.querySelector(".cinema-quote"),
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.9, ease: "power2.out" }
        );
      }
    });
  }
}
