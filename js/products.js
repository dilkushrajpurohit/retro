(() => {
  const listEl = document.querySelector('[data-products-list]');
  const statusEl = document.querySelector('[data-products-status]');
  const modalEl = document.querySelector('[data-admin-modal]');
  const openButton = document.querySelector('[data-open-product-modal]');
  const authStep = document.querySelector('[data-modal-step="verify"]');
  const addStep = document.querySelector('[data-modal-step="add"]');
  const authForm = document.querySelector('[data-auth-form]');
  const productForm = document.querySelector('[data-product-form]');
  const authMessage = document.querySelector('[data-auth-message]');
  const productMessage = document.querySelector('[data-product-message]');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const tokenKey = 'retro-products-token';
  const verifiedPhoneKey = 'retro-products-phone';
  const storageProductsKey = 'retro-products-storage';
  const fallbackAdmins = [{ phone: '8094679551', password: '123456789' }];

  let products = [];
  let fallbackMode = false;

  if (!listEl || !modalEl || !openButton) {
    return;
  }

  const getToken = () => window.localStorage.getItem(tokenKey) || '';
  const getVerifiedPhone = () => window.localStorage.getItem(verifiedPhoneKey) || 'Verified user';
  const setToken = (token) => window.localStorage.setItem(tokenKey, token);
  const setVerifiedPhone = (phone) => window.localStorage.setItem(verifiedPhoneKey, phone);
  const clearToken = () => {
    window.localStorage.removeItem(tokenKey);
    window.localStorage.removeItem(verifiedPhoneKey);
  };

  const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const setStatus = (message) => {
    if (statusEl) {
      statusEl.textContent = message;
    }
  };

  const setAuthMessage = (message, tone = 'error') => {
    if (!authMessage) {
      return;
    }

    authMessage.textContent = message;
    authMessage.dataset.tone = tone;
  };

  const setProductMessage = (message, tone = 'error') => {
    if (!productMessage) {
      return;
    }

    productMessage.textContent = message;
    productMessage.dataset.tone = tone;
  };

  const openModal = (mode = 'verify') => {
    modalEl.hidden = false;
    modalEl.classList.add('is-open');
    authStep?.classList.toggle('is-active', mode === 'verify');
    addStep?.classList.toggle('is-active', mode === 'add');
  };

  const closeModal = () => {
    modalEl.classList.remove('is-open');
    modalEl.hidden = true;
  };

  const renderCard = (product) => `
    <article class="product-card">
      <div class="product-card-media">
        <img src="${escapeHtml(product.photo)}" alt="${escapeHtml(product.name)}">
      </div>
      <div class="product-card-copy">
        <p class="product-card-label">${escapeHtml(product.createdBy ? `Added by ${product.createdBy}` : 'Product')}</p>
        <h2>${escapeHtml(product.name)}</h2>
        <p>${escapeHtml(product.description)}</p>
        <a class="product-card-catalog-button" href="catalog-access.html">View Catalog</a>
      </div>
    </article>
  `;

  const renderProducts = () => {
    if (products.length === 0) {
      listEl.innerHTML = '<p class="products-empty">No products available yet.</p>';
      return;
    }

    listEl.innerHTML = products.map(renderCard).join('');

    if (window.gsap && !prefersReducedMotion) {
      window.gsap.fromTo(
        '.product-card',
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.55, stagger: 0.07, ease: 'power2.out' }
      );
    }
  };

  const safeParseJson = async (response) => {
    try {
      return await response.json();
    } catch (_) {
      return {};
    }
  };

  const getStoredProducts = () => {
    try {
      const raw = window.localStorage.getItem(storageProductsKey);
      const parsed = JSON.parse(raw || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  };

  const setStoredProducts = (items) => {
    window.localStorage.setItem(storageProductsKey, JSON.stringify(items));
  };

  const verifyFallbackAdmin = ({ phone, password }) => {
    return fallbackAdmins.some((admin) => admin.phone === phone && admin.password === password);
  };

  const createLocalProduct = (payload, createdBy) => ({
    id: `local-${Date.now()}`,
    name: payload.name,
    description: payload.description,
    photo: payload.photo,
    createdAt: new Date().toISOString(),
    createdBy
  });

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products', { headers: { Accept: 'application/json' } });
      if (!response.ok) {
        throw new Error('API unavailable');
      }

      const data = await safeParseJson(response);
      products = Array.isArray(data.products) ? data.products : [];
      fallbackMode = false;
      renderProducts();
      setStatus('Products loaded.');
    } catch (_) {
      fallbackMode = true;
      products = getStoredProducts();
      renderProducts();
      setStatus('Products loaded (local mode).');
    }
  };

  const convertFileToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read image file.'));
    reader.readAsDataURL(file);
  });

  const showProductForm = () => {
    if (!getToken()) {
      openModal('verify');
      return;
    }

    setAuthMessage('');
    setProductMessage('');
    openModal('add');
  };

  openButton.addEventListener('click', showProductForm);

  modalEl.addEventListener('click', (event) => {
    if (event.target?.matches('[data-close-modal]')) {
      closeModal();
    }
  });

  authForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setAuthMessage('Verifying...');

    const formData = new FormData(authForm);
    const payload = {
      phone: String(formData.get('phone') || '').trim(),
      password: String(formData.get('password') || '')
    };

    if (fallbackMode) {
      if (!verifyFallbackAdmin(payload)) {
        setAuthMessage('Invalid number or password.');
        clearToken();
        return;
      }

      setToken(`local-${Date.now()}`);
      setVerifiedPhone(payload.phone || 'Verified user');
      setAuthMessage('Verified successfully.', 'success');
      authForm.reset();
      openModal('add');
      return;
    }

    try {
      const response = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await safeParseJson(response);

      if (!response.ok) {
        setAuthMessage(data.message || 'Verification failed.');
        clearToken();
        return;
      }

      setVerifiedPhone(String(data.phone || payload.phone || '').trim() || 'Verified user');
      setToken(data.token);
      setAuthMessage('Verified successfully.', 'success');
      authForm.reset();
      openModal('add');
    } catch (_) {
      fallbackMode = true;
      if (!verifyFallbackAdmin(payload)) {
        setAuthMessage('Invalid number or password.');
        clearToken();
        return;
      }

      setToken(`local-${Date.now()}`);
      setVerifiedPhone(payload.phone || 'Verified user');
      setAuthMessage('Verified successfully.', 'success');
      authForm.reset();
      openModal('add');
    }
  });

  productForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setProductMessage('Saving product...');

    const formData = new FormData(productForm);
    const photoFile = formData.get('photo');

    if (!(photoFile instanceof File) || photoFile.size === 0) {
      setProductMessage('Please choose a product photo.');
      return;
    }

    const photoData = await convertFileToDataUrl(photoFile);
    const payload = {
      name: String(formData.get('name') || '').trim(),
      description: String(formData.get('description') || '').trim(),
      photo: photoData
    };

    if (fallbackMode) {
      const localProduct = createLocalProduct(payload, getVerifiedPhone());
      products.unshift(localProduct);
      setStoredProducts(products);
      renderProducts();
      setProductMessage('Product added successfully.', 'success');
      productForm.reset();
      closeModal();
      return;
    }

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(payload)
      });

      const data = await safeParseJson(response);

      if (response.status === 401) {
        clearToken();
        setProductMessage('Verification expired. Please verify again.');
        openModal('verify');
        return;
      }

      if (!response.ok) {
        setProductMessage(data.message || 'Unable to save product.');
        return;
      }

      products.unshift(data.product);
      renderProducts();
      setProductMessage('Product added successfully.', 'success');
      productForm.reset();
      closeModal();
    } catch (_) {
      fallbackMode = true;
      const localProduct = createLocalProduct(payload, getVerifiedPhone());
      products.unshift(localProduct);
      setStoredProducts(products);
      renderProducts();
      setProductMessage('Product added successfully (local mode).', 'success');
      productForm.reset();
      closeModal();
    }
  });

  fetchProducts().catch(() => {
    fallbackMode = true;
    products = getStoredProducts();
    renderProducts();
    setStatus('Products loaded (local mode).');
  });
})();
