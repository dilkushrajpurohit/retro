(() => {
  const form = document.querySelector('[data-catalog-pin-form]');
  const messageEl = document.querySelector('[data-catalog-pin-message]');

  if (!form || !messageEl) {
    return;
  }

  const setMessage = (text, tone = 'error') => {
    messageEl.textContent = text;
    messageEl.dataset.tone = tone;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage('Verifying PIN...');

    const formData = new FormData(form);
    const pin = String(formData.get('pin') || '').trim();

    const response = await fetch('/api/catalog/verify-pin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ pin })
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || 'Invalid PIN.');
      return;
    }

    setMessage('PIN verified. Redirecting...', 'success');
    window.location.href = '/cat';
  });
})();