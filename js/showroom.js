(() => {
  const header = document.querySelector("[data-premium-nav]");
  const panoramaElement = document.querySelector("#panorama");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const setHeaderState = () => {
    if (!header) {
      return;
    }

    header.classList.toggle("is-solid", window.scrollY > 18);
  };

  if (window.gsap && !prefersReducedMotion) {
    window.gsap.from(".showroom-hero .showroom-shell > *", {
      opacity: 0,
      y: 20,
      duration: 0.8,
      stagger: 0.08,
      ease: "power2.out"
    });

    window.gsap.from(".showroom-tour-layout > *", {
      scrollTrigger: {
        trigger: ".showroom-tour-layout",
        start: "top 78%"
      },
      opacity: 0,
      y: 32,
      duration: 0.9,
      stagger: 0.1,
      ease: "power2.out"
    });
  }

  const buildProductHotspot = ({ pitch, yaw, text, url }) => ({
    pitch,
    yaw,
    cssClass: "showroom-product-hotspot",
    createTooltipFunc: (hotSpotDiv) => {
      hotSpotDiv.classList.add("showroom-hotspot-chip");
      hotSpotDiv.innerHTML = `<button type=\"button\" class=\"showroom-tag-button\">${text}</button>`;
      hotSpotDiv.querySelector("button")?.addEventListener("click", () => {
        window.location.href = url;
      });
    },
    createTooltipArgs: text,
    clickHandlerFunc: () => {
      window.location.href = url;
    }
  });

  const initShowroom = () => {
    if (!panoramaElement || !window.pannellum) {
      return;
    }

    const sharedPanorama = "https://pannellum.org/images/alma.jpg";

    const viewer = window.pannellum.viewer("panorama", {
      default: {
        firstScene: "lounge",
        sceneFadeDuration: 900,
        autoLoad: true,
        showControls: true,
        compass: true,
        hfov: 110
      },
      scenes: {
        lounge: {
          title: "Main Lounge",
          type: "equirectangular",
          panorama: sharedPanorama,
          pitch: -2,
          yaw: 12,
          hotSpots: [
            {
              pitch: -5,
              yaw: 54,
              type: "scene",
              text: "Move to Dining Room",
              sceneId: "dining",
              cssClass: "showroom-nav-hotspot"
            },
            {
              pitch: -7,
              yaw: -64,
              type: "scene",
              text: "Move to Accessories Gallery",
              sceneId: "accessories",
              cssClass: "showroom-nav-hotspot"
            },
            buildProductHotspot({
              pitch: -10,
              yaw: -12,
              text: "Featured Chair",
              url: "chairs.html"
            })
          ]
        },
        dining: {
          title: "Dining Room",
          type: "equirectangular",
          panorama: sharedPanorama,
          pitch: -2,
          yaw: 120,
          hotSpots: [
            {
              pitch: -3,
              yaw: -168,
              type: "scene",
              text: "Back to Lounge",
              sceneId: "lounge",
              cssClass: "showroom-nav-hotspot"
            },
            {
              pitch: -5,
              yaw: 84,
              type: "scene",
              text: "Move to Accessories Gallery",
              sceneId: "accessories",
              cssClass: "showroom-nav-hotspot"
            },
            buildProductHotspot({
              pitch: -9,
              yaw: 28,
              text: "Signature Table",
              url: "tables.html"
            })
          ]
        },
        accessories: {
          title: "Accessories Gallery",
          type: "equirectangular",
          panorama: sharedPanorama,
          pitch: -3,
          yaw: -96,
          hotSpots: [
            {
              pitch: -4,
              yaw: 158,
              type: "scene",
              text: "Back to Lounge",
              sceneId: "lounge",
              cssClass: "showroom-nav-hotspot"
            },
            {
              pitch: -5,
              yaw: 24,
              type: "scene",
              text: "Move to Dining Room",
              sceneId: "dining",
              cssClass: "showroom-nav-hotspot"
            },
            buildProductHotspot({
              pitch: -8,
              yaw: -30,
              text: "Decor Collection",
              url: "decor.html"
            })
          ]
        }
      }
    });

    viewer.on("scenechange", () => {
      panoramaElement.classList.add("is-changing-scene");
      window.setTimeout(() => {
        panoramaElement.classList.remove("is-changing-scene");
      }, 240);
    });
  };

  setHeaderState();
  window.addEventListener("scroll", setHeaderState, { passive: true });
  initShowroom();
})();
