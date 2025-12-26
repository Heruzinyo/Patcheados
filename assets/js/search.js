class SearchSystem {
  constructor(config) {
    this.config = config;
    this.pagefind = null;
    this.currentPage = 1;
    this.itemsPerPage = 20;
    this.searchInput = document.querySelector('.search-input');
    this.resultsContainer = document.querySelector(config.resultsSelector);
    this.noResultsMsg = null;
    this.paginationContainer = null;
    this.allResults = [];
    this.currentResults = [];
    this.allResultsData = [];
    this.pageType = this.detectPageType();
    this.init();
  }

  detectPageType() {
    const containerId = this.resultsContainer && this.resultsContainer.id;
    if (containerId === 'gamesGrid') return 'games';
    if (containerId === 'authorsGrid') return 'authors';
    if (containerId === 'circlesGrid') return 'circles';
    return 'unknown';
  }

  async init() {
    this.pagefind = await import("/pagefind/pagefind.js");
    await this.pagefind.init();
    this.createNoResultsMessage();
    this.createPaginationContainer();
    this.setupEventListeners();
    this.loadQueryFromURL();
  }

  createNoResultsMessage() {
    this.noResultsMsg = document.createElement('div');
    this.noResultsMsg.className = 'no-results';
    this.noResultsMsg.style.display = 'none';
    this.noResultsMsg.innerHTML = '<p>Nenhum resultado encontrado.</p>';
    this.resultsContainer.parentElement.appendChild(this.noResultsMsg);
  }

  createPaginationContainer() {
    this.paginationContainer = document.createElement('div');
    this.paginationContainer.className = 'pagination';
    this.paginationContainer.style.display = 'none';
    this.resultsContainer.parentElement.appendChild(this.paginationContainer);
  }

  setupEventListeners() {
    let debounceTimer;
    this.searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.handleSearch(e.target.value);
      }, 300);
    });
  }

  loadQueryFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    if (query) {
      this.searchInput.value = decodeURIComponent(query);
      this.executeSearch(query);
    } else {
      this.executeSearch('');
    }
  }

  updateURL(query) {
    const url = new URL(window.location);
    if (query) {
      url.searchParams.set('q', query);
    } else {
      url.searchParams.delete('q');
    }
    window.history.pushState({}, '', url);
  }

  handleSearch(query) {
    this.updateURL(query);
    this.executeSearch(query);
  }

  parseQuery(query) {
    const parsed = {
      text: [],
      filters: {},
      order: null
    };
    const filterRegex = /(-?)([\wÀ-ÿ]+):([\wÀ-ÿ\-<>'.]+)/g;
    let match;
    let lastIndex = 0;

    while ((match = filterRegex.exec(query)) !== null) {
      const textBefore = query.substring(lastIndex, match.index).trim();
      if (textBefore) {
        parsed.text.push(textBefore);
      }
      const isNegated = match[1] === '-';
      let key = match[2].toLowerCase();
      let value = match[3];
      if (key === 'order' || key === 'ordem') {
        parsed.order = value.toLowerCase();
        lastIndex = match.index + match[0].length;
        continue;
      }
      const keyMap = {
        'plataforma': 'platform', 'patchplataforma': 'patchplatform', 'criador': 'creator',
        'personagem': 'character', 'papel': 'role', 'idioma': 'language', 'lingua': 'language',
        'língua': 'language', 'região': 'region', 'regiao': 'region', 'patchregião': 'patchregion',
        'patchregiao': 'patchregion', 'status': 'status', 'origem': 'origin', 'dev': 'developer',
        'desenvolvedora': 'developer', 'pub': 'publisher', 'distribuidora': 'publisher',
        'patchpub': 'patchpublisher', 'patchdistribuidora': 'patchpublisher', 'lancamento': 'release',
        'lançamento': 'release', 'patchlancamento': 'patchrelease', 'patchlançamento': 'patchrelease',
        'jogadores': 'players', 'legendas': 'subs', 'graficos': 'graphics', 'gráficos': 'graphics',
        'dublagem': 'dub', 'oficial': 'official', 'reupload': 'archive', 'machine_translation': 'mtl',
        'dub_ia': 'ai_dub', 'externo': 'external'
      };
      if (keyMap[key]) key = keyMap[key];

      const filterKey = isNegated ? `-${key}` : key;
      if (!parsed.filters[filterKey]) {
        parsed.filters[filterKey] = [];
      }
      parsed.filters[filterKey].push(value.toLowerCase());

      lastIndex = match.index + match[0].length;
    }
    const remainingText = query.substring(lastIndex).trim();
    if (remainingText) {
      parsed.text.push(remainingText);
    }

    return parsed;
  }

  async executeSearch(query) {
    const parsedQuery = this.parseQuery(query);
    const pagefindFilters = {};

    if (this.pageType === 'games') pagefindFilters.type = 'game';
    else if (this.pageType === 'authors') pagefindFilters.type = 'author';
    else if (this.pageType === 'circles') pagefindFilters.type = 'circle';

    const complexFilterKeys = [
      'release', 'patchrelease', 'players', 
      'developer', 'publisher', 'patchpublisher'
    ];

    const clientSideFilters = {};
    const resolvedContextFilters = {};

    for (const [key, values] of Object.entries(parsedQuery.filters)) {
      resolvedContextFilters[key] = values;
      if (key.startsWith('-')) {
        clientSideFilters[key] = values.map(v => v.toLowerCase().replace(/\s+/g, '_'));
        continue;
      }
      if (!complexFilterKeys.includes(key)) {
        const resolvedValues = values.map(v => v.toLowerCase().replace(/\s+/g, '_')).filter(v => v !== null);
        resolvedContextFilters[key] = resolvedValues;
        pagefindFilters[key] = resolvedValues;
      } else {
        clientSideFilters[key] = values;
      }
    }

    const options = { filters: pagefindFilters };
    let searchTerm = null;
    if (parsedQuery.text.length > 0) {
      searchTerm = parsedQuery.text.join(' ');
    }
    const hasOnlyFilters = parsedQuery.text.length === 0 && 
                          Object.keys(parsedQuery.filters).length > 0;
    const hasNoSearch = parsedQuery.text.length === 0 && 
                       Object.keys(parsedQuery.filters).length === 0;

    if (parsedQuery.order) {
      const order = parsedQuery.order.toLowerCase();
      if (order === 'newest' || order === 'recente') {
        options.sort = { date: "desc" };
      } else if (order === 'oldest' || order === 'antigo') {
        options.sort = { date: "asc" };
      } else if (order === 'patchnewest' || order === 'patchrecente') {
        options.sort = { patch_date: "desc" };
      } else if (order === 'patcholdest' || order === 'patchantigo') {
        options.sort = { patch_date: "asc" };
      } else if (order === 'z-a') {
        options.sort = { title: "desc" };
      } else {
        options.sort = { title: "asc" };
      }
    } else {
      options.sort = { title: "asc" };
    }

    const search = await this.pagefind.search(
      hasOnlyFilters || hasNoSearch ? null : searchTerm, 
      options
    );
    this.allResults = search.results || [];

    if (Object.keys(clientSideFilters).length > 0) {
      const dataPromises = this.allResults.map(r => r.data());
      this.allResultsData = await Promise.all(dataPromises);
      this.allResultsData = this.allResultsData.map(result => {
        if (result.meta && result.meta.filters) {
          try {
            const filters = typeof result.meta.filters === 'string' 
              ? JSON.parse(result.meta.filters) 
              : result.meta.filters;
            result.meta.filters = filters;
          } catch (e) {
            console.error('Failed to parse filters for result:', result.url, e);
            result.meta.filters = {};
          }
        }
        return result;
      });
      this.currentResults = this.applyClientFilters(this.allResultsData, clientSideFilters, resolvedContextFilters);
    } else {
      this.currentResults = this.allResults;
      this.allResultsData = null;
    }

    this.currentPage = 1;
    this.renderResults();
  }

  applyClientFilters(results, filtersToApply, contextFilters) {
    if (Object.keys(filtersToApply).length === 0) {
      return results;
    }
    const patchPlatformFilters = contextFilters['patchplatform'] || [];

    return results.filter(result => {
      const filters = result.filters || result.meta.filters || {};
      for (const [key, values] of Object.entries(filtersToApply)) {
        const isNegated = key.startsWith('-');
        const actualKey = isNegated ? key.slice(1) : key;
        const matchAny = values.some(value => {
          const matches = this.matchFilter(actualKey, value, filters, patchPlatformFilters);
          return matches;
        });
        const finalMatch = isNegated ? !matchAny : matchAny;
        if (!finalMatch) return false;
      }
      return true;
    });
  }

  matchFilter(key, value, filters, patchPlatformFilters = []) {
    const filterValue = filters[key];
    if (filterValue === undefined || filterValue === null) {
      return false;
    }
    if (Array.isArray(filterValue) && filterValue.length === 0) {
      return false;
    }
    if (typeof filterValue === 'string' && filterValue === '') {
      return false;
    }

    switch (key) {
      case 'developer':
      case 'publisher':
      case 'patchpublisher':
        return this.matchPartial(value, filterValue);
      
      case 'release':
        return this.matchYear(value, filterValue);
      
      case 'patchrelease':
        return this.matchPatchYear(value, filterValue, patchPlatformFilters);
      
      case 'players':
        return this.matchNumber(value, filterValue);
      
      case 'platform':
      case 'patchplatform':
      case 'tag':
      case 'region':
      case 'patchregion':
      case 'status':
      case 'origin':
      case 'role':
      case 'character':
      case 'creator':
      case 'language':
      case 'archive':
      case 'mtl':
      case 'ai_dub':
      case 'external':
      case 'lost_source':
      case 'lost_media':
      case 'official':
      case 'nsfw': 
      case 'subs':
      case 'graphics':
      case 'dub':
        return this.matchState(value, filterValue);
      
      default:
        return false;
    }
  }

  matchPartial(searchTerm, dataValue) {
    if (!dataValue) return false;
    const dataArray = Array.isArray(dataValue) ? dataValue : [dataValue];
    const normalizedSearch = searchTerm.toLowerCase().replace(/\s+/g, '_');
    
    return dataArray.some(item => 
      String(item).toLowerCase().replace(/\s+/g, '_').includes(normalizedSearch)
    );
  }

  matchYear(value, yearArray) {
    if (!yearArray || yearArray.length === 0) return false;
    
    const years = yearArray.map(y => {
      const match = String(y).match(/\d{4}/);
      return match ? parseInt(match[0]) : null;
    }).filter(y => y !== null);
    if (value.includes('-') && !value.startsWith('<') && !value.startsWith('>')) {
      const [start, end] = value.split('-').map(y => parseInt(y));
      if (isNaN(start) || isNaN(end)) return false;
      return years.some(y => y >= start && y <= end);
    }
    if (value.startsWith('<')) {
      const compareYear = parseInt(value.substring(1));
      if (isNaN(compareYear)) return false;
      return years.some(y => y < compareYear);
    }
    if (value.startsWith('>')) {
      const compareYear = parseInt(value.substring(1));
      if (isNaN(compareYear)) return false;
      return years.some(y => y > compareYear);
    }
    const normalizedValue = value.trim();
    return years.some(y => String(y) === normalizedValue);
  }

  matchPatchYear(value, patchReleaseArray, patchPlatformFilters) {
    if (!patchReleaseArray || patchReleaseArray.length === 0) return false;
    const patches = patchReleaseArray.map(entry => {
      const parts = entry.split(':');
      if (parts.length < 2) return null;
      const platform = parts[0].trim().toLowerCase().replace(/\s+/g, '_');
      const date = parts.slice(1).join(':').trim();
      const yearMatch = date.match(/\d{4}/);
      return {
        platform,
        date,
        year: yearMatch ? parseInt(yearMatch[0]) : null
      };
    }).filter(p => p && p.year);
    let relevantPatches = patches;
    if (patchPlatformFilters.length > 0) {
      relevantPatches = patches.filter(patch =>
        patchPlatformFilters.some(filterPlatform =>
          patch.platform.includes(filterPlatform.toLowerCase().replace(/\s+/g, '_'))
        )
      );
    }
    if (relevantPatches.length === 0) return false;
    const years = relevantPatches.map(p => p.year);
    return this.matchYear(value, years);
  }

  matchNumber(value, dataValue) {
    if (!dataValue || dataValue === 0) return false;
    let val = dataValue;
    if (Array.isArray(dataValue)) {
      val = dataValue[0];
    }
    const numValue = typeof val === 'string' ? parseInt(val) : val;
    if (value.includes('-')) {
      const [start, end] = value.split('-').map(n => parseInt(n));
      if (isNaN(start) || isNaN(end)) return false;
      return numValue >= start && numValue <= end;
    }
    if (value.startsWith('<')) {
      const compareNum = parseInt(value.substring(1));
      if (isNaN(compareNum)) return false;
      return numValue < compareNum;
    }
    if (value.startsWith('>')) {
      const compareNum = parseInt(value.substring(1));
      if (isNaN(compareNum)) return false;
      return numValue > compareNum;
    }
    const searchNum = parseInt(value);
    return !isNaN(searchNum) && numValue === searchNum;
  }

  matchState(value, dataValue) {
    const normalizedValue = value.toLowerCase();
    if (Array.isArray(dataValue)) {
      return dataValue.some(v => String(v).toLowerCase() === normalizedValue);
    }
    return String(dataValue).toLowerCase() === normalizedValue;
  }

  applySorting(orderType, parsedQuery) {
    const normalizedOrder = orderType.toLowerCase();
    const orderTranslations = { 
      'recente': 'newest',
      'antigo': 'oldest',
      'patchrecente': 'patchnewest',
      'patchantigo': 'patcholdest'
    };
    const order = orderTranslations[normalizedOrder] || normalizedOrder;
    const parseDate = (dateStr) => {
      if (!dateStr) return null;
      const parts = dateStr.trim().split('/');
      if (parts.length !== 3) return null;
      const date = new Date(parts[2], parts[1] - 1, parts[0]);
      return isNaN(date.getTime()) ? null : date;
    };
    
    switch (order) {
      case 'z-a':
        this.currentResults.sort((a, b) => {
          const titleA = a.meta.title || '';
          const titleB = b.meta.title || '';
          return titleB.localeCompare(titleA, 'pt-BR');
        });
        break;
      case 'newest':
      case 'oldest':
        if (this.pageType === 'games') {
          const mapped = this.currentResults.map((item, i) => {
            const dates = (item.meta.filters && item.meta.filters.release) || [];
            const parsedDates = dates.map(parseDate).filter(Boolean);
            const maxDate = parsedDates.length > 0 ? new Date(Math.max(...parsedDates.map(d => d.getTime()))) : new Date(0);
            return { index: i, value: maxDate };
          });
          mapped.sort((a, b) => {
            return order === 'newest' ? b.value - a.value : a.value - b.value;
          });
          this.currentResults = mapped.map(m => this.currentResults[m.index]);
        }
        break;
      case 'patchnewest':
      case 'patcholdest':
        if (this.pageType === 'games') {
          const patchPlatformFilters = (parsedQuery && parsedQuery.filters && parsedQuery.filters['patchplatform']) || [];
          const extractMaxDate = (patches) => {
            const dates = patches.map(entry => {
              const parts = entry.split(':');
              if (parts.length < 2) return parseDate(entry);
              const platform = parts[0].trim().toLowerCase().replace(/\s+/g, '_');
              const date = parts.slice(1).join(':').trim();
              if (patchPlatformFilters.length > 0) {
                const matches = patchPlatformFilters.some(pf => 
                  platform.includes(pf.toLowerCase().replace(/\s+/g, '_'))
                );
                if (!matches) return null;
              }
              return parseDate(date);
            }).filter(Boolean);
            return dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date(0);
          };
          const mapped = this.currentResults.map((item, i) => {
            const patches = (item.meta.filters && item.meta.filters.patchrelease) || [];
            return { index: i, value: extractMaxDate(patches) };
          });
          mapped.sort((a, b) => {
            return order === 'patchnewest' ? b.value - a.value : a.value - b.value;
          });
          this.currentResults = mapped.map(m => this.currentResults[m.index]);
        }
        break;
    }
  }

  async renderResults() {
    this.resultsContainer.innerHTML = '';
    const results = this.allResultsData ? this.currentResults : this.currentResults;

    if (results.length === 0) {
      this.noResultsMsg.style.display = 'block';
      this.paginationContainer.style.display = 'none';
      return;
    }
    this.noResultsMsg.style.display = 'none';
    const totalPages = Math.ceil(results.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = Math.min(startIndex + this.itemsPerPage, results.length);
    const pageItems = results.slice(startIndex, endIndex);
    
    if (!this.allResultsData) {
      const dataPromises = pageItems.map(r => r.data());
      const pageData = await Promise.all(dataPromises);
      
      for (let i = 0; i < pageData.length; i++) {
        const data = pageData[i];
        const card = this.createCard(data);
        this.resultsContainer.appendChild(card);
      }
    } else {
      for (let i = startIndex; i < endIndex; i++) {
        const data = results[i];
        const card = this.createCard(data);
        this.resultsContainer.appendChild(card);
      }
    }
    this.renderPagination(totalPages);
  }

  createCard(data) {
    const meta = data.meta || {};
    if (!meta.title) meta.title = "Sem título";
    if (!meta.image) meta.image = "";
    const excerpt = meta.summary || data.excerpt || "";
    const url = data.url;
    
    const a = document.createElement('a');
    a.href = url;
    
    if (this.pageType === 'games') {
      a.className = 'game-item';
      a.innerHTML = `
        <img src="${meta.image}" alt="Capa de ${meta.title}" class="game-image">
        <h3 class="game-title">${meta.title}</h3>
        <p class="game-description">${excerpt}</p>
      `;
    } else if (this.pageType === 'authors') {
      const isDefault = meta.image.includes('def-author.png');
      const altText = isDefault ? 'Foto de Perfil Padrão' : `Foto de Perfil de ${meta.title}`;
      
      a.className = 'user-card user-card-lg';
      a.innerHTML = `
        <img src="${meta.image}" alt="${altText}">
        <div class="user-card-info">
            <span class="user-card-name">${meta.title}</span>
        </div>
      `;
    } else if (this.pageType === 'circles') {
      a.className = 'circle-item';
      a.innerHTML = `
        <div class="circle-logo-box">
          <img src="${meta.image}" alt="Logo de ${meta.title}" class="circle-logo">
        </div>
        <h3 class="circle-title">${meta.title}</h3>
        <p class="circle-description">${excerpt}</p>
      `;
    }
    
    return a;
  }

  renderPagination(totalPages) {
    if (totalPages <= 1) {
      this.paginationContainer.style.display = 'none';
      return;
    }

    this.paginationContainer.style.display = 'flex';
    this.paginationContainer.innerHTML = '';

    let startPage = Math.max(1, this.currentPage - 5);
    let endPage = Math.min(totalPages, startPage + 9);
    
    if (endPage - startPage < 9) {
      startPage = Math.max(1, endPage - 9);
    }

    if (this.currentPage > 1) {
      this.paginationContainer.appendChild(
        this.createPageButton('«', this.currentPage - 1)
      );
    }

    if (startPage > 1) {
      this.paginationContainer.appendChild(this.createPageButton(1, 1));
      if (startPage > 2) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'page-ellipsis';
        ellipsis.textContent = '...';
        this.paginationContainer.appendChild(ellipsis);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      this.paginationContainer.appendChild(this.createPageButton(i, i));
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'page-ellipsis';
        ellipsis.textContent = '...';
        this.paginationContainer.appendChild(ellipsis);
      }
      this.paginationContainer.appendChild(this.createPageButton(totalPages, totalPages));
    }

    if (this.currentPage < totalPages) {
      this.paginationContainer.appendChild(
        this.createPageButton('»', this.currentPage + 1)
      );
    }
  }

  createPageButton(label, page) {
    const button = document.createElement('button');
    button.className = 'page-button';
    button.textContent = label;
    
    if (page === this.currentPage) {
      button.classList.add('active');
    }
    
    button.addEventListener('click', () => {
      this.currentPage = page;
      this.renderResults();

      const containerRect = this.resultsContainer.getBoundingClientRect();
      const absoluteContainerTop = containerRect.top + window.scrollY;
      const scrollBuffer = 100;

      if (window.scrollY > absoluteContainerTop - scrollBuffer) {
        window.scrollTo({ top: absoluteContainerTop - scrollBuffer, behavior: 'smooth' });
      }
    });
    
    return button;
  }
}

window.SearchSystem = SearchSystem;