
(() => {
  const $ = (id) => document.getElementById(id);
  const platformSelect = $('platformSelect');
  const patchSelect = $('patchSelect');
  const patchDisplay = $('patchDisplay');

  const patches = [...$('patchSummaries').content.querySelectorAll('.patch-summary')].map(el => ({
    id: el.dataset.id,
    platforms: new Set(el.dataset.platforms.split(',')),
    title: el.dataset.title,
    official: el.dataset.official === 'true',
    mtl: el.dataset.mtl === 'true',
    aiDub: el.dataset.aiDub === 'true',
    external: el.dataset.external === 'true',
    element: el
  }));

  const addWarningTags = (patch) => {
    const tags = [];
    if (patch.official) tags.push('[Oficial]');
    if (patch.mtl) tags.push('[MTL]');
    if (patch.aiDub) tags.push('[Dub IA]');
    if (patch.external) tags.push('[EXT]');
    return tags.length > 0 ? `${tags.join(' ')} ${patch.title}` : patch.title;
  };

  const hasWarnings = (patch) => patch.mtl || patch.aiDub || patch.external;

  const sortPatches = (patchList) => {
    const official = patchList.filter(p => p.official);
    const normal = patchList.filter(p => !p.official && !hasWarnings(p));
    const warned = patchList.filter(p => !p.official && hasWarnings(p));
    return [...official, ...normal, ...warned];
  };

  const urlParams = new URLSearchParams(window.location.search);
  const patchFromUrl = urlParams.get('patch');
  const platformFromUrl = urlParams.get('platform');

  const updateUrl = (patchId, platform) => {
    const params = new URLSearchParams();
    if (patchId) params.set('patch', patchId);
    if (platform && platform !== 'all') params.set('platform', platform);
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.pushState({}, '', newUrl);
  };

  platformSelect.onchange = () => {
    const platform = platformSelect.value;
    window.dispatchEvent(new CustomEvent('platformChanged', { detail: { platform } }));

    const currentPatch = patchSelect.value;
    patchSelect.disabled = true;
    patchSelect.innerHTML = '<option value="">Selecionar patch</option>';
    patchDisplay.innerHTML = '';

    if (!platform) {
      updateUrl(null, null);
      return;
    }

    const availablePatches = platform === 'all'
      ? patches
      : patches.filter(patch => patch.platforms.has(platform));

    const sortedPatches = sortPatches(availablePatches);

    const options = sortedPatches.map(patch => 
      `<option value="${patch.id}">${addWarningTags(patch)}</option>`
    ).join('');
    
    patchSelect.innerHTML = '<option value="" disabled selected hidden>Selecionar patch</option>' + options;
    patchSelect.disabled = false;

    const isPatchAvailable = availablePatches.some(p => p.id === currentPatch);
    if (currentPatch && isPatchAvailable) {
      patchSelect.value = currentPatch;
      patchSelect.dispatchEvent(new Event('change'));
    }
  };

  const updateMetaGrid = (container, platform) => {
    const metaGrid = container.querySelector('.meta-grid[data-all-downloads]');
    if (!metaGrid) return;

    const allDownloads = JSON.parse(metaGrid.dataset.allDownloads);
    const metaItems = {
      version: metaGrid.querySelector('[data-field="version"] dd'),
      gameversion: metaGrid.querySelector('[data-field="gameversion"] dd'),
      region: metaGrid.querySelector('[data-field="region"] dd'),
      format: metaGrid.querySelector('[data-field="format"] dd'),
      release: metaGrid.querySelector('[data-field="release"] dd'),
      completion: metaGrid.querySelector('[data-field="completion"] dd')
    };

    const filtered = platform === 'all'
      ? allDownloads
      : allDownloads.filter(d => d.platform === platform);

    const collect = (field) => [...new Set(filtered.map(d => d[field]).filter(Boolean))];

    Object.keys(metaItems).forEach(field => {
      if (metaItems[field]) {
        metaItems[field].textContent = collect(field).join(', ') || '—';
      }
    });
  };

  patchSelect.onchange = () => {
    const patchId = patchSelect.value;
    const platform = platformSelect.value;

    if (!patchId || !platform) {
      patchDisplay.innerHTML = '';
      updateUrl(null, null);
      return;
    }

    updateUrl(patchId, platform);

    const patch = patches.find(p => p.id === patchId);
    if (!patch) return;

    const clone = patch.element.cloneNode(true);

    if (platform === 'all') {
      clone.querySelectorAll('[data-platform]').forEach(el => {
        const title = el.querySelector('.section-title');
        if (title && title.textContent.includes('Instalação')) {
          el.remove();
        }
      });
    } else {
      clone.querySelectorAll('[data-platform]').forEach(el => {
        if (el.dataset.platform !== platform) {
          el.remove();
        }
      });
    }

    patchDisplay.replaceChildren(clone);
    clone.style.display = 'block';

    updateMetaGrid(clone, platform);

    const giscusContainer = clone.querySelector('.giscus');
    if (giscusContainer) {
      const script = document.createElement('script');
      script.src = "https://giscus.app/client.js";
      script.setAttribute("data-repo", "Heruzinyo/Patcheados");
      script.setAttribute("data-repo-id", "R_kgDOQukMHQ");
      script.setAttribute("data-category", "Patches");
      script.setAttribute("data-category-id", "DIC_kwDOQukMHc4C0ODo");
      script.setAttribute("data-mapping", "specific");
      const baseFileName = $('patchSummaries').dataset.baseFileName;
      script.setAttribute("data-term", `${baseFileName}-${patchId}`);
      script.setAttribute("data-reactions-enabled", "1");
      script.setAttribute("data-emit-metadata", "0");
      script.setAttribute("data-input-position", "top");
      script.setAttribute("data-theme", "preferred_color_scheme");
      script.setAttribute("data-lang", "pt");
      script.setAttribute("data-loading", "lazy");
      script.setAttribute("crossorigin", "anonymous");
      script.async = true;
      giscusContainer.innerHTML = '';
      giscusContainer.appendChild(script);
    }
  };

  if (patchFromUrl) {
    const patch = patches.find(p => p.id === patchFromUrl);
    if (patch) {
      const platform = platformFromUrl || 'all';
      platformSelect.value = platform;
      platformSelect.dispatchEvent(new Event('change'));
      setTimeout(() => {
        patchSelect.value = patchFromUrl;
        patchSelect.dispatchEvent(new Event('change'));
      }, 0);
    }
  }
})();