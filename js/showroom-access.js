(() => {
  const form = document.querySelector('[data-showroom-pin-form]');
  const messageEl = document.querySelector('[data-showroom-pin-message]');
  const localPin = '12345';
  const localAccessKey = 'retro-showroom-pin-ok';

  if (!form || !messageEl) {
    return;
  }

  const setMessage = (text, tone = 'error') => {
    messageEl.textContent = text;
    messageEl.dataset.tone = tone;
  };

  const safeParseJson = async (response) => {
    try {
      return await response.json();
    } catch (_) {
      return {};
    }
  };

  const grantLocalAccess = () => {
    window.localStorage.setItem(localAccessKey, '1');
    window.location.href = 'showroom-tour.html';
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage('Verifying PIN...');

    const formData = new FormData(form);
    const pin = String(formData.get('pin') || '').trim();

    try {
      const response = await fetch('/api/showroom/verify-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pin })
      });

      const data = await safeParseJson(response);

      if (response.ok) {
        setMessage('PIN verified. Redirecting...', 'success');
        window.location.href = 'showroom-tour.html';
        return;
      }

      // Static hosting fallback: API route does not exist.
      if (response.status === 404 || response.status === 405) {
        if (pin === localPin) {
          setMessage('PIN verified. Redirecting...', 'success');
          grantLocalAccess();
          return;
        }

        setMessage('Invalid PIN.');
        return;
      }

      setMessage(data.message || 'Invalid PIN.');
    } catch (_) {
      if (pin === localPin) {
        setMessage('PIN verified. Redirecting...', 'success');
        grantLocalAccess();
        return;
      }

      setMessage('Invalid PIN.');
    }
  });
})();
