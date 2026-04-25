(() => {
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const setZoom = (stageEl, zoom, minZoom, maxZoom, zoomRangeEl) => {
    const clamped = clamp(zoom, minZoom, maxZoom);
    stageEl.style.setProperty("--book-scale", clamped.toFixed(3));

    if (zoomRangeEl) {
      zoomRangeEl.value = String(clamped);
    }

    return clamped;
  };

  window.RetroFlipbook = {
    create({
      stageEl,
      contentEl,
      pages,
      renderPage,
      prevButton,
      nextButton,
      zoomInButton,
      zoomOutButton,
      zoomRangeEl,
      pageCurrentEl,
      pageTotalEl,
      onChange,
      reducedMotion = false,
      minZoom = 0.9,
      maxZoom = 1.12,
      initialZoom = 1
    }) {
      if (!stageEl || !contentEl || !Array.isArray(pages) || pages.length === 0) {
        return { destroy() {} };
      }

      contentEl.classList.add("flipbook-sheet");
      contentEl.style.visibility = "visible";

      if (!stageEl.hasAttribute("tabindex")) {
        stageEl.setAttribute("tabindex", "0");
      }

      let index = 0;
      let zoom = clamp(initialZoom, minZoom, maxZoom);
      let busy = false;
      let pointerStartX = null;

      const syncControls = () => {
        const current = String(index + 1).padStart(2, "0");
        const total = String(pages.length).padStart(2, "0");

        if (pageCurrentEl) {
          pageCurrentEl.textContent = current;
        }

        if (pageTotalEl) {
          pageTotalEl.textContent = total;
        }

        if (prevButton) {
          prevButton.disabled = index === 0 || busy;
        }

        if (nextButton) {
          nextButton.disabled = index === pages.length - 1 || busy;
        }

        if (typeof onChange === "function") {
          onChange(index, pages[index]);
        }
      };

      const paint = (pageIndex) => {
        contentEl.innerHTML = renderPage(pages[pageIndex], pageIndex);
        syncControls();
      };

      const goTo = (nextIndex) => {
        if (busy || nextIndex < 0 || nextIndex >= pages.length || nextIndex === index) {
          return;
        }

        const direction = nextIndex > index ? 1 : -1;
        const clone = contentEl.cloneNode(true);
        clone.classList.add("flipbook-sheet", "flipbook-sheet--clone");
        clone.style.transformOrigin = direction > 0 ? "right center" : "left center";
        stageEl.appendChild(clone);

        contentEl.innerHTML = renderPage(pages[nextIndex], nextIndex);
        contentEl.style.opacity = "1";

        if (reducedMotion || !window.gsap) {
          clone.remove();
          index = nextIndex;
          busy = false;
          syncControls();
          return;
        }

        busy = true;
        syncControls();

        window.gsap.fromTo(
          clone,
          { rotateY: 0, opacity: 1 },
          {
            rotateY: direction > 0 ? -180 : 180,
            opacity: 1,
            duration: 1.05,
            ease: "power2.inOut",
            onComplete: () => {
              clone.remove();
              index = nextIndex;
              busy = false;
              syncControls();
            }
          }
        );
      };

      const step = (direction) => {
        goTo(index + direction);
      };

      const applyZoom = (nextZoom) => {
        zoom = setZoom(stageEl, nextZoom, minZoom, maxZoom, zoomRangeEl);
      };

      const prevHandler = () => step(-1);
      const nextHandler = () => step(1);
      const zoomInHandler = () => applyZoom(zoom + 0.06);
      const zoomOutHandler = () => applyZoom(zoom - 0.06);
      const zoomRangeHandler = (event) => applyZoom(Number(event.target.value));
      const keyHandler = (event) => {
        const targetTag = event.target?.tagName;

        if (["INPUT", "TEXTAREA", "SELECT"].includes(targetTag)) {
          return;
        }

        if (event.key === "ArrowLeft") {
          event.preventDefault();
          step(-1);
        }

        if (event.key === "ArrowRight") {
          event.preventDefault();
          step(1);
        }
      };
      const pointerDownHandler = (event) => {
        if (event.pointerType === "mouse" && event.button !== 0) {
          return;
        }

        pointerStartX = event.clientX;
      };
      const pointerUpHandler = (event) => {
        if (pointerStartX === null) {
          return;
        }

        const delta = event.clientX - pointerStartX;
        pointerStartX = null;

        if (Math.abs(delta) < 40) {
          return;
        }

        step(delta < 0 ? 1 : -1);
      };

      if (prevButton) {
        prevButton.addEventListener("click", prevHandler);
      }

      if (nextButton) {
        nextButton.addEventListener("click", nextHandler);
      }

      if (zoomInButton) {
        zoomInButton.addEventListener("click", zoomInHandler);
      }

      if (zoomOutButton) {
        zoomOutButton.addEventListener("click", zoomOutHandler);
      }

      if (zoomRangeEl) {
        zoomRangeEl.addEventListener("input", zoomRangeHandler);
      }

      stageEl.addEventListener("pointerdown", pointerDownHandler);
      stageEl.addEventListener("pointerup", pointerUpHandler);
      window.addEventListener("keydown", keyHandler);

      zoom = setZoom(stageEl, zoom, minZoom, maxZoom, zoomRangeEl);
      paint(index);

      return {
        goTo(nextIndex) {
          const targetIndex = Number(nextIndex);
          if (Number.isNaN(targetIndex)) {
            return;
          }

          goTo(clamp(Math.round(targetIndex), 0, pages.length - 1));
        },
        getCurrentPageIndex() {
          return index;
        },
        getTotalPages() {
          return pages.length;
        },
        destroy() {
          if (prevButton) {
            prevButton.removeEventListener("click", prevHandler);
          }

          if (nextButton) {
            nextButton.removeEventListener("click", nextHandler);
          }

          if (zoomInButton) {
            zoomInButton.removeEventListener("click", zoomInHandler);
          }

          if (zoomOutButton) {
            zoomOutButton.removeEventListener("click", zoomOutHandler);
          }

          if (zoomRangeEl) {
            zoomRangeEl.removeEventListener("input", zoomRangeHandler);
          }

          stageEl.removeEventListener("pointerdown", pointerDownHandler);
          stageEl.removeEventListener("pointerup", pointerUpHandler);
          window.removeEventListener("keydown", keyHandler);
        }
      };
    }
  };
})();
