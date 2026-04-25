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
  let products = [];

  if (!listEl || !modalEl || !openButton) {
    return;
  }

  const getToken = () => window.localStorage.getItem(tokenKey) || '';
  const setToken = (token) => window.localStorage.setItem(tokenKey, token);
  const clearToken = () => window.localStorage.removeItem(tokenKey);

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

  const fetchProducts = async () => {
    const response = await fetch('/api/products');
    const data = await response.json();
    products = Array.isArray(data.products) ? data.products : [];
    renderProducts();
    setStatus('Products loaded.');
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

    const response = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      setAuthMessage(data.message || 'Verification failed.');
      clearToken();
      return;
    }

    setToken(data.token);
    setAuthMessage('Verified successfully.', 'success');
    authForm.reset();
    openModal('add');
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

    const response = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

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
  });

  fetchProducts().catch(() => {
    setStatus('Unable to load products right now.');
  });
})();