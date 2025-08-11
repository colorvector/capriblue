'use strict';

/**
 * Landing page bootstrapper. Renders content exclusively from i18n resources
 * so no user-visible strings are hard-coded.
 */
(function bootstrap() {
  const appRoot = document.getElementById('app');

  /**
   * Parses the user's preferred language from the URL's `lang` query param,
   * with a configured default fallback. This value is not user-visible.
   */
  function getLanguage() {
    try {
      const params = new URLSearchParams(window.location.search);
      const candidate = (params.get('lang') || '').trim();
      if (candidate) return candidate;
    } catch (_) {
      // Ignore parsing errors; rely on default language.
    }
    return (window.__APP_CONFIG__ && window.__APP_CONFIG__.defaultLanguage) || 'en';
  }

  /**
   * Fetches and parses the i18n JSON file for the given language.
   * Throws if the file is missing or malformed.
   */
  async function loadI18n(language) {
    const basePath = (window.__APP_CONFIG__ && window.__APP_CONFIG__.i18nPath) || 'i18n';
    const url = `${basePath}/${encodeURIComponent(language)}.json`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to load i18n resource: ${url} (${response.status})`);
    }
    try {
      return await response.json();
    } catch (err) {
      throw new Error(`Malformed i18n JSON for language: ${language}`);
    }
  }

  /**
   * Ensures all required keys exist in the loaded i18n payload.
   * Intentionally throws if anything is missing to avoid falling back to literals.
   */
  function validateI18n(i18n) {
    const requiredPaths = [
      'site.title',
      'site.tagline',
      'sections.projects',
      'labels.visit',
      'footer.copyright',
      'projects'
    ];

    for (const path of requiredPaths) {
      if (getPath(i18n, path) == null) {
        throw new Error(`Missing i18n key: ${path}`);
      }
    }

    if (!Array.isArray(i18n.projects)) {
      throw new Error('i18n.projects must be an array');
    }

    for (const [index, project] of i18n.projects.entries()) {
      for (const key of ['codename', 'description']) {
        if (project[key] == null || String(project[key]).trim() === '') {
          throw new Error(`Project at index ${index} is missing key: ${key}`);
        }
      }
    }
  }

  /**
   * Retrieves a nested value using dot-path notation.
   */
  function getPath(object, dotPath) {
    return dotPath.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), object);
  }

  /**
   * Utility to create an element with className and text content.
   */
  function el(tag, options = {}) {
    const node = document.createElement(tag);
    if (options.className) node.className = options.className;
    if (options.text != null) node.textContent = options.text;
    if (options.attrs) {
      for (const [name, value] of Object.entries(options.attrs)) {
        if (value != null) node.setAttribute(name, String(value));
      }
    }
    return node;
  }

  /**
   * Renders the page using i18n content only.
   */
  function render(i18n) {
    document.title = getPath(i18n, 'site.title');

    const container = el('div', { className: 'container' });

    // Header
    const header = el('header', { className: 'site-header' });
    const title = el('h1', { className: 'title', text: getPath(i18n, 'site.title') });
    const tagline = el('p', { className: 'tagline', text: getPath(i18n, 'site.tagline') });
    header.append(title, tagline);

    // Projects section
    const projectsSection = el('section', { className: 'projects' });
    const sectionTitle = el('h2', { className: 'section-title', text: getPath(i18n, 'sections.projects') });
    const grid = el('div', { className: 'projects-grid' });

    for (const project of i18n.projects) {
      const card = el('article', { className: 'project-card' });
      const name = el('h3', { className: 'project-name', text: project.codename });
      const desc = el('p', { className: 'project-desc', text: project.description });
      card.append(name, desc);

      if (project.url) {
        const actions = el('div', { className: 'project-actions' });
        const visitLabel = getPath(i18n, 'labels.visit');
        const link = el('a', {
          className: 'button-link',
          text: visitLabel,
          attrs: {
            href: project.url,
            target: '_blank',
            rel: 'noopener noreferrer',
            'aria-label': `${visitLabel}: ${project.codename}`
          }
        });
        actions.append(link);
        card.append(actions);
      }

      grid.append(card);
    }

    projectsSection.append(sectionTitle, grid);

    // Footer
    const footer = el('footer', { className: 'site-footer' });
    const year = new Date().getFullYear();
    const copyrightTmpl = getPath(i18n, 'footer.copyright');
    const copyright = copyrightTmpl.replace('{year}', String(year));
    footer.append(el('div', { text: copyright }));

    container.append(header, projectsSection, footer);

    appRoot.replaceChildren(container);
    appRoot.setAttribute('aria-busy', 'false');
  }

  // Bootstrap sequence
  (async () => {
    const language = getLanguage();
    const i18n = await loadI18n(language);
    validateI18n(i18n);
    render(i18n);
  })().catch((error) => {
    // Intentionally halt rendering on any failure, per project rules.
    console.error(error);
  });
})();


