(() => {
  const header = document.querySelector("[data-premium-nav]");
  const form = document.querySelector("[data-contact-form]");
  const successEl = document.querySelector("[data-contact-success]");
  const whatsappNumber = "918094679551";
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const setHeaderState = () => {
    if (!header) {
      return;
    }

    header.classList.toggle("is-solid", window.scrollY > 18);
  };

  const setFieldError = (fieldName, message) => {
    const errorElement = document.querySelector(`[data-error-for="${fieldName}"]`);
    const field = form?.elements?.[fieldName];

    if (errorElement) {
      errorElement.textContent = message;
    }

    if (field) {
      field.classList.toggle("is-invalid", Boolean(message));
      if (message) {
        field.setAttribute("aria-invalid", "true");
      } else {
        field.removeAttribute("aria-invalid");
      }
    }
  };

  const validateForm = (formData) => {
    const errors = {};
    const name = (formData.get("name") || "").trim();
    const email = (formData.get("email") || "").trim();
    const phone = (formData.get("phone") || "").trim();
    const message = (formData.get("message") || "").trim();
    const compactPhone = phone.replace(/\D/g, "");

    if (name.length < 2) {
      errors.name = "Please enter your full name.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      errors.email = "Please enter a valid email address.";
    }

    if (compactPhone.length < 7 || compactPhone.length > 15) {
      errors.phone = "Please enter a valid phone number.";
    }

    if (message.length < 12) {
      errors.message = "Please share at least a short requirement.";
    }

    return errors;
  };

  const clearErrors = () => {
    ["name", "email", "phone", "message"].forEach((fieldName) => {
      setFieldError(fieldName, "");
    });
  };

  const showSuccess = (text) => {
    if (!successEl) {
      return;
    }

    successEl.textContent = text;
    successEl.classList.add("is-visible");
  };

  const hideSuccess = () => {
    if (!successEl) {
      return;
    }

    successEl.textContent = "";
    successEl.classList.remove("is-visible");
  };

  const buildWhatsAppMessage = (formData) => {
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const message = String(formData.get("message") || "").trim();

    return [
      "New contact request from Retro INC website",
      `Name: ${name}`,
      `Email: ${email}`,
      `Phone: ${phone}`,
      `Message: ${message}`
    ].join("\n");
  };

  const openWhatsApp = (message) => {
    const waUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    const popup = window.open(waUrl, "_blank", "noopener,noreferrer");

    if (!popup) {
      window.location.href = waUrl;
    }
  };

  const bindForm = () => {
    if (!form) {
      return;
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      hideSuccess();
      clearErrors();

      const formData = new FormData(form);
      const errors = validateForm(formData);

      if (Object.keys(errors).length > 0) {
        Object.entries(errors).forEach(([fieldName, message]) => {
          setFieldError(fieldName, message);
        });
        return;
      }

      openWhatsApp(buildWhatsAppMessage(formData));
      showSuccess("Opening WhatsApp with your message.");
      form.reset();
    });

    form.addEventListener("input", () => {
      hideSuccess();
    });
  };

  const setupMotion = () => {
    if (!window.gsap || prefersReducedMotion) {
      return;
    }

    window.gsap.from(".contact-hero .contact-shell > *", {
      opacity: 0,
      y: 20,
      duration: 0.75,
      stagger: 0.08,
      ease: "power2.out"
    });

    window.gsap.from(".contact-form-card", {
      scrollTrigger: {
        trigger: ".contact-form-card",
        start: "top 78%"
      },
      opacity: 0,
      y: 30,
      duration: 0.8,
      ease: "power2.out"
    });
  };

  setHeaderState();
  window.addEventListener("scroll", setHeaderState, { passive: true });
  bindForm();
  setupMotion();
})();
