(() => {
  const config = window.RetroCatalogConfig;
  const stageEl = document.querySelector('[data-catalog-stage]');
  const contentEl = document.querySelector('[data-catalog-content]');
  const prevButton = document.querySelector('[data-catalog-prev]');
  const nextButton = document.querySelector('[data-catalog-next]');
  const zoomInButton = document.querySelector('[data-catalog-zoom-in]');
  const zoomOutButton = document.querySelector('[data-catalog-zoom-out]');
  const zoomRangeEl = document.querySelector('[data-catalog-zoom]');
  const pageCurrentEl = document.querySelector('[data-catalog-page-current]');
  const pageTotalEl = document.querySelector('[data-catalog-page-total]');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!config || !stageEl || !contentEl || !window.RetroFlipbook) {
    return;
  }

  const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const renderSpecs = (specs = []) => {
    if (!Array.isArray(specs) || specs.length === 0) {
      return '';
    }

    return `
      <dl class="catalog-spec-grid">
        ${specs.map((spec) => `
          <div>
            <dt>${escapeHtml(spec.label)}</dt>
            <dd>${escapeHtml(spec.value)}</dd>
          </div>
        `).join('')}
      </dl>
    `;
  };

  const renderActions = (page) => {
    const primaryLabel = page.ctaLabel || 'Enquire Now';
    const primaryHref = page.ctaHref || 'contact.html';
    const secondaryLabel = page.secondaryLabel || 'Back to Products';
    const secondaryHref = page.secondaryHref || 'products.html';

    return `
      <div class="catalog-book-actions">
        <a class="catalog-book-button" href="${escapeHtml(primaryHref)}">${escapeHtml(primaryLabel)}</a>
        <a class="catalog-book-button catalog-book-button--ghost" href="${escapeHtml(secondaryHref)}">${escapeHtml(secondaryLabel)}</a>
      </div>
    `;
  };

  const renderPage = (page, index) => {
    const pageNumber = String(index + 1).padStart(2, '0');

    return `
      <div class="flipbook-sheet-content">
        <div class="catalog-book-visual">
          <img src="${escapeHtml(page.image)}" alt="${escapeHtml(page.imageAlt || page.title)}">
        </div>
        <div class="catalog-book-copy">
          <p class="catalog-book-kicker">Page ${pageNumber}</p>
          <h2>${escapeHtml(page.title)}</h2>
          <p class="catalog-book-description">${escapeHtml(page.description)}</p>
          ${renderSpecs(page.specs)}
          ${renderActions(page)}
        </div>
      </div>
    `;
  };

  window.RetroFlipbook.create({
    stageEl,
    contentEl,
    pages: config.pages,
    renderPage,
    prevButton,
    nextButton,
    zoomInButton,
    zoomOutButton,
    zoomRangeEl,
    pageCurrentEl,
    pageTotalEl,
    reducedMotion: prefersReducedMotion,
    minZoom: 0.9,
    maxZoom: 1.12,
    initialZoom: 1
  });
})();