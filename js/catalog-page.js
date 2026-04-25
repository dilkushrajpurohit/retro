(() => {
  const bookEl = document.querySelector('#catalog-book');
  const prevButton = document.querySelector('[data-prev-page]');
  const nextButton = document.querySelector('[data-next-page]');
  const statusEl = document.querySelector('[data-catalog-status]');
  const pageIndicatorEl = document.querySelector('[data-page-indicator]');
  const openAddButton = document.querySelector('[data-open-add-item]');
  const modalEl = document.querySelector('[data-catalog-modal]');
  const verifyStep = document.querySelector('[data-catalog-step="verify"]');
  const addStep = document.querySelector('[data-catalog-step="add"]');
  const authForm = document.querySelector('[data-catalog-auth-form]');
  const itemForm = document.querySelector('[data-catalog-item-form]');
  const authMessageEl = document.querySelector('[data-catalog-auth-message]');
  const itemMessageEl = document.querySelector('[data-catalog-item-message]');
  const closeTargets = document.querySelectorAll('[data-close-catalog-modal]');
  const tokenKey = 'retro-products-token';

  if (!bookEl || !prevButton || !nextButton || !openAddButton || !modalEl) {
    return;
  }

  let items = [];
  let current = 0;

  const getToken = () => window.localStorage.getItem(tokenKey) || '';
  const setToken = (token) => window.localStorage.setItem(tokenKey, token);
  const clearToken = () => window.localStorage.removeItem(tokenKey);

  const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const formatPrice = (value) => {
    const digits = String(value || '').replace(/[^0-9.]/g, '');
    if (!digits) {
      return 'Price on request';
    }

    const [integerPart] = digits.split('.');
    const number = Number(integerPart);
    if (!Number.isFinite(number)) {
      return `INR ${digits}`;
    }

    return `INR ${number.toLocaleString('en-IN')}`;
  };

  const setStatus = (text) => {
    if (statusEl) {
      statusEl.textContent = text;
    }
  };

  const setAuthMessage = (text, tone = 'error') => {
    if (!authMessageEl) {
      return;
    }

    authMessageEl.textContent = text;
    authMessageEl.dataset.tone = tone;
  };

  const setItemMessage = (text, tone = 'error') => {
    if (!itemMessageEl) {
      return;
    }

    itemMessageEl.textContent = text;
    itemMessageEl.dataset.tone = tone;
  };

  const updatePageIndicator = () => {
    const total = items.length;
    const visible = Math.min(current + 1, Math.max(total, 1));
    pageIndicatorEl.textContent = `Page ${String(visible).padStart(2, '0')} / ${String(Math.max(total, 1)).padStart(2, '0')}`;
  };

  const renderBook = () => {
    bookEl.innerHTML = '';

    if (!Array.isArray(items) || items.length === 0) {
      current = 0;
      updatePageIndicator();
      setStatus('No catalog items yet.');
      return;
    }

    items.forEach((item, index) => {
      const spread = document.createElement('div');
      spread.className = 'spread';
      spread.style.zIndex = String(items.length - index);
      if (index < current) {
        spread.classList.add('flipped');
      }

      spread.innerHTML = `
        <div class="side front">
          <div class="page-half left">
            <img src="${escapeHtml(item.photo)}" alt="${escapeHtml(item.name)}">
          </div>
          <div class="page-half right">
            <p class="item-tag">Catalog Item</p>
            <h2>${escapeHtml(item.name)}</h2>
            <p>${escapeHtml(item.description)}</p>
            <div class="item-price">${escapeHtml(formatPrice(item.price))}</div>
          </div>
        </div>
        <div class="side back"></div>
      `;

      spread.addEventListener('click', () => {
        if (index === current) {
          next();
          return;
        }

        if (index === current - 1) {
          prev();
        }
      });

      bookEl.appendChild(spread);
    });

    updatePageIndicator();
    setStatus('Catalog ready.');
  };

  const next = () => {
    const spreads = bookEl.querySelectorAll('.spread');
    if (current >= spreads.length) {
      return;
    }

    spreads[current].classList.add('flipped');
    current += 1;
    updatePageIndicator();
  };

  const prev = () => {
    const spreads = bookEl.querySelectorAll('.spread');
    if (current <= 0) {
      return;
    }

    current -= 1;
    spreads[current].classList.remove('flipped');
    updatePageIndicator();
  };

  const openModal = (step) => {
    modalEl.classList.add('is-open');
    verifyStep?.classList.toggle('is-active', step === 'verify');
    addStep?.classList.toggle('is-active', step === 'add');
  };

  const closeModal = () => {
    modalEl.classList.remove('is-open');
  };

  const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

  const loadItems = async () => {
    setStatus('Loading catalog...');
    const response = await fetch('/api/catalog-items');
    const data = await response.json();
    items = Array.isArray(data.items) ? data.items : [];
    current = 0;
    renderBook();
  };

  openAddButton.addEventListener('click', () => {
    clearToken();
    setAuthMessage('');
    setItemMessage('');
    openModal('verify');
  });

  closeTargets.forEach((target) => {
    target.addEventListener('click', closeModal);
  });

  prevButton.addEventListener('click', prev);
  nextButton.addEventListener('click', next);

  authForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setAuthMessage('Verifying access...');

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
      clearToken();
      setAuthMessage(data.message || 'Access denied.');
      return;
    }

    setToken(data.token);
    authForm.reset();
    openModal('add');
  });

  itemForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setItemMessage('Submitting item...');

    const formData = new FormData(itemForm);
    const photoFile = formData.get('photo');

    if (!(photoFile instanceof File) || photoFile.size === 0) {
      setItemMessage('Please upload a product photo.');
      return;
    }

    const payload = {
      name: String(formData.get('name') || '').trim(),
      description: String(formData.get('description') || '').trim(),
      price: String(formData.get('price') || '').trim(),
      photo: await fileToDataUrl(photoFile)
    };

    const response = await fetch('/api/catalog-items', {
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
      setItemMessage('Session expired. Verify again.');
      openModal('verify');
      return;
    }

    if (!response.ok) {
      setItemMessage(data.message || 'Unable to add item.');
      return;
    }

    itemForm.reset();
    setItemMessage('Item added to catalog.', 'success');
    items.unshift(data.item);
    current = 0;
    renderBook();
    closeModal();
  });

  loadItems().catch(() => {
    setStatus('Unable to load catalog items right now.');
  });
})();
