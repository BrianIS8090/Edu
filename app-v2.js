(function() {
  'use strict';

  const state = {
    activeCategory: 'all',
    activeSubcategory: null,
    searchQuery: '',
    layout: 'list',
    currentView: 'catalog',
    currentItemId: null,
    sidebarCollapsed: false,
    mobileSidebarOpen: false
  };

  const categoryIcons = {
    'Светотехника': 'lightbulb',
    'Проекты': 'wrench',
    'Продажи': 'handshake',
    'Маркетинг': 'megaphone',
    'ИИ и агенты': 'bot',
    'Онбординг': 'graduation-cap',
    'Без категории': 'folder'
  };

  const gamificationTracks = [
    {
      id: 'projects',
      category: 'Проекты',
      icon: 'wrench',
      accent: '#2563eb'
    },
    {
      id: 'sales',
      category: 'Продажи',
      icon: 'handshake',
      accent: '#0f9d6c'
    }
  ];

  const els = {
    sidebar: document.getElementById('sidebar'),
    sidebarNav: document.getElementById('sidebarNav'),
    sidebarProgress: document.getElementById('sidebarProgress'),
    sidebarSearch: document.getElementById('sidebarSearch'),
    clearSearch: document.getElementById('clearSearch'),
    sidebarToggle: document.getElementById('sidebarToggle'),
    sidebarOverlay: document.getElementById('sidebarOverlay'),
    mobileMenuToggle: document.getElementById('mobileMenuToggle'),
    mobileSearchToggle: document.getElementById('mobileSearchToggle'),
    mobileSearchClose: document.getElementById('mobileSearchClose'),
    breadcrumb: document.getElementById('breadcrumb'),
    listViewBtn: document.getElementById('listViewBtn'),
    boardViewBtn: document.getElementById('boardViewBtn'),
    viewSwitch: document.getElementById('viewSwitch'),
    viewRoot: document.getElementById('viewRoot'),
    readingProgress: document.getElementById('readingProgress'),
    readingProgressFill: document.getElementById('readingProgressFill'),
    lightbox: document.getElementById('lightbox'),
    lightboxImage: document.getElementById('lightboxImage'),
    lightboxClose: document.getElementById('lightboxClose'),
    lightboxPrev: document.getElementById('lightboxPrev'),
    lightboxNext: document.getElementById('lightboxNext'),
    lightboxCounter: document.getElementById('lightboxCounter')
  };

  let allItems = [];
  let renderVersion = 0;
  let lightboxImages = [];
  let lightboxIndex = 0;
  let scrollProgressHandler = null;
  let userLastVisit = null;
  let appVersion = null;

  // Провайдер прогресса — по умолчанию localStorage, заменяется Firebase-модулем
  let progressProvider = {
    getProgress: function(id) {
      return parseInt(localStorage.getItem('progress_' + id) || '0', 10);
    },
    saveProgress: function(id, percent) {
      var current = this.getProgress(id);
      var nextValue = Math.max(current, Math.round(percent));
      localStorage.setItem('progress_' + id, String(nextValue));
    },
    getReadTime: function(id) {
      var cached = localStorage.getItem('readTime_' + id);
      if (cached) return parseInt(cached, 10);
      var item = allItems.find(function(entry) { return entry.id === id; });
      return item && item.readTime ? Math.round(item.readTime) : null;
    },
    saveReadTime: function(id, minutes) {
      localStorage.setItem('readTime_' + id, String(minutes));
    },
    getLastRead: function() {
      var raw = localStorage.getItem('lastRead');
      if (!raw) return null;
      try { return JSON.parse(raw); } catch (e) { return null; }
    },
    saveLastRead: function(data) {
      localStorage.setItem('lastRead', JSON.stringify(data));
    },
    getUserLastVisit: function() {
      return null;
    }
  };

  // Публичный интерфейс для Firebase-модулей
  window.EduApp = {
    // Вызывается firebase-auth.js после успешной авторизации
    onAuthReady: function(user) {
      init();
    },
    // Вызывается firebase-progress.js для замены localStorage-провайдера
    setProgressProvider: function(provider) {
      progressProvider = provider;
      render();
    },
    // Устанавливает дату последнего визита (для бейджа "Новое")
    setUserLastVisit: function(timestamp) {
      userLastVisit = timestamp;
    },
    // Доступ к текущим элементам каталога
    getAllItems: function() {
      return allItems;
    }
  };

  bindStaticEvents();
  init();

  async function init() {
    try {
      const response = await fetch('build/catalog.json');
      if (!response.ok) {
        throw new Error('Не удалось загрузить catalog.json');
      }

      const catalog = await response.json();
      allItems = [
        ...(catalog.lessons || []).map(function(item) {
          return Object.assign({ type: 'lesson' }, item);
        }),
        ...(catalog.modules || []).map(function(item) {
          return Object.assign({ type: 'module' }, item);
        })
      ].sort(compareItems);

      // Загружаем версию
      try {
        var vRes = await fetch('build/version.json');
        if (vRes.ok) appVersion = await vRes.json();
      } catch (e) {}

      await render();
    } catch (error) {
      els.viewRoot.innerHTML = '<div class="error-state">Не удалось загрузить preview-каталог. Сначала соберите <code>build/catalog.json</code>.</div>';
      lucide.createIcons();
    }
  }

  function bindStaticEvents() {
    els.sidebarSearch.addEventListener('input', function(event) {
      state.searchQuery = event.target.value.trim();
      document.body.classList.toggle('has-query', Boolean(state.searchQuery));
      state.currentView = 'catalog';
      render();
    });

    els.clearSearch.addEventListener('click', function() {
      state.searchQuery = '';
      els.sidebarSearch.value = '';
      document.body.classList.remove('has-query');
      render();
    });

    els.sidebarToggle.addEventListener('click', function() {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      document.body.classList.toggle('sidebar-collapsed', state.sidebarCollapsed);
    });

    els.mobileMenuToggle.addEventListener('click', function() {
      setMobileSidebar(true);
    });

    els.sidebarOverlay.addEventListener('click', function() {
      setMobileSidebar(false);
    });

    els.mobileSearchToggle.addEventListener('click', function() {
      setSearchOpen(true);
    });

    els.mobileSearchClose.addEventListener('click', function() {
      setSearchOpen(false);
    });

    els.sidebarSearch.addEventListener('keydown', function(event) {
      if (event.key === 'Escape') {
        setSearchOpen(false);
        els.sidebarSearch.blur();
      }
    });

    els.listViewBtn.addEventListener('click', function() {
      if (state.layout !== 'list') {
        state.layout = 'list';
        render();
      }
    });

    els.boardViewBtn.addEventListener('click', function() {
      if (state.layout !== 'board') {
        state.layout = 'board';
        render();
      }
    });

    els.sidebarNav.addEventListener('click', function(event) {
      const categoryButton = event.target.closest('[data-category]');
      const subcategoryButton = event.target.closest('[data-subcategory]');

      if (subcategoryButton) {
        state.activeCategory = subcategoryButton.getAttribute('data-category');
        state.activeSubcategory = subcategoryButton.getAttribute('data-subcategory');
        state.currentView = 'catalog';
        setMobileSidebar(false);
        render();
        return;
      }

      if (categoryButton) {
        state.activeCategory = categoryButton.getAttribute('data-category');
        state.activeSubcategory = null;
        state.currentView = 'catalog';
        setMobileSidebar(false);
        render();
      }
    });

    els.viewRoot.addEventListener('click', function(event) {
      const openTrigger = event.target.closest('[data-open-id]');
      const backTrigger = event.target.closest('[data-action="back"]');
      const continueTrigger = event.target.closest('[data-continue-id]');

      if (backTrigger) {
        state.currentView = 'catalog';
        state.currentItemId = null;
        render();
        return;
      }

      if (continueTrigger) {
        openItem(continueTrigger.getAttribute('data-continue-id'));
        return;
      }

      if (openTrigger) {
        openItem(openTrigger.getAttribute('data-open-id'));
      }
    });

    els.breadcrumb.addEventListener('click', function(event) {
      var link = event.target.closest('[data-bc-action]');
      if (!link) return;
      var action = link.getAttribute('data-bc-action');
      if (action === 'all') {
        state.activeCategory = 'all';
        state.activeSubcategory = null;
      } else if (action === 'category') {
        state.activeCategory = link.getAttribute('data-bc-category');
        state.activeSubcategory = null;
      } else if (action === 'subcategory') {
        state.activeCategory = link.getAttribute('data-bc-category');
        state.activeSubcategory = link.getAttribute('data-bc-subcategory');
      }
      state.currentView = 'catalog';
      state.currentItemId = null;
      render();
    });

    els.lightbox.addEventListener('click', function(event) {
      if (event.target === els.lightbox) {
        closeLightbox();
      }
    });

    els.lightboxClose.addEventListener('click', closeLightbox);
    els.lightboxPrev.addEventListener('click', function() {
      moveLightbox(-1);
    });
    els.lightboxNext.addEventListener('click', function() {
      moveLightbox(1);
    });

    document.addEventListener('keydown', function(event) {
      if (!els.lightbox.classList.contains('is-open')) {
        return;
      }

      if (event.key === 'Escape') {
        closeLightbox();
      }

      if (event.key === 'ArrowLeft') {
        moveLightbox(-1);
      }

      if (event.key === 'ArrowRight') {
        moveLightbox(1);
      }
    });
  }

  async function render() {
    renderVersion += 1;
    const currentVersion = renderVersion;

    teardownScrollProgress();
    renderSidebar();
    renderSidebarProgress();
    renderTopbar();

    if (state.currentView === 'detail' && state.currentItemId) {
      await renderDetail(currentVersion);
    } else {
      renderCatalog(currentVersion);
    }

    if (currentVersion === renderVersion) {
      lucide.createIcons();
    }
  }

  function renderSidebar() {
    const categories = getCategories();
    let html = '';

    html += '<section class="nav-section">';
    html += '<div class="nav-section-title">Материалы</div>';
    html += buildCategoryButton('all', 'library', 'Все материалы', allItems.length, state.activeCategory === 'all');
    html += '</section>';

    html += '<section class="nav-section">';
    html += '<div class="nav-section-title">Категории</div>';

    categories.forEach(function(category) {
      const isActive = state.activeCategory === category.name;
      html += buildCategoryButton(category.name, category.icon, category.name, category.count, isActive);

      if (isActive) {
        const subcategories = getSubcategories(category.name);
        if (subcategories.length > 0) {
          html += '<div class="subnav-list">';
          subcategories.forEach(function(subcategory) {
            const isSubActive = state.activeSubcategory === subcategory.name;
            html += '' +
              '<button class="subnav-item' + (isSubActive ? ' is-active' : '') + '" type="button" data-category="' + escapeHtml(category.name) + '" data-subcategory="' + escapeHtml(subcategory.name) + '">' +
              '<span class="subnav-item-label">' + escapeHtml(subcategory.name) + '</span>' +
              '</button>';
          });
          html += '</div>';
        }
      }
    });

    html += '</section>';

    els.sidebarNav.innerHTML = html;
  }

  function renderSidebarProgress() {
    let html = gamificationTracks.map(function(track) {
      const progress = calculateTrackProgress(track.category);
      return '' +
        '<div class="track-card">' +
        '<div class="track-icon" style="color:' + track.accent + ';">' +
        '<i data-lucide="' + track.icon + '"></i>' +
        '</div>' +
        '<div class="track-copy">' +
        '<span class="track-name">' + escapeHtml(track.category) + '</span>' +
        '<span class="track-meta">' + progress.read + ' из ' + progress.total + ' завершено · ' + progress.percent + '%</span>' +
        '<div class="track-meter"><div class="track-meter-fill" style="width:' + progress.percent + '%; background:' + track.accent + ';"></div></div>' +
        '</div>' +
        '</div>';
    }).join('');

    if (appVersion) {
      html += '<div class="version-badge" title="Коммит: ' + escapeAttribute(appVersion.commit || '') + '\nВетка: ' + escapeAttribute(appVersion.branch || '') + '\nСборка: ' + escapeAttribute(appVersion.buildDate || '') + '">v' + escapeHtml(appVersion.version || '?') + ' · ' + escapeHtml(appVersion.commit || '?') + '</div>';
    }

    els.sidebarProgress.innerHTML = html;
  }

  function renderTopbar() {
    els.listViewBtn.classList.toggle('is-active', state.layout === 'list');
    els.boardViewBtn.classList.toggle('is-active', state.layout === 'board');

    if (state.currentView === 'detail' && state.currentItemId) {
      const item = getCurrentItem();
      var crumbs = '<a class="breadcrumb-link" data-bc-action="all">Все материалы</a>';
      if (item) {
        if (item.category) {
          crumbs += '<span>/</span><a class="breadcrumb-link" data-bc-action="category" data-bc-category="' + escapeAttribute(item.category) + '">' + escapeHtml(item.category) + '</a>';
        }
        if (item.subcategory) {
          crumbs += '<span>/</span><a class="breadcrumb-link" data-bc-action="subcategory" data-bc-category="' + escapeAttribute(item.category) + '" data-bc-subcategory="' + escapeAttribute(item.subcategory) + '">' + escapeHtml(item.subcategory) + '</a>';
        }
        crumbs += '<span>/</span><strong>' + escapeHtml(item.title) + '</strong>';
      }
      els.breadcrumb.innerHTML = crumbs;
      els.viewSwitch.style.display = 'none';
      els.readingProgress.classList.remove('is-hidden');
      return;
    }

    els.breadcrumb.innerHTML = '' +
      '<span>Академия 7ЛАМП</span>' +
      '<span>/</span>' +
      '<strong>' + escapeHtml(getScopeTitle()) + '</strong>';
    els.viewSwitch.style.display = '';
    els.readingProgress.classList.add('is-hidden');
    els.readingProgressFill.style.width = '0%';
  }

  function renderCatalog(currentVersion) {
    const visibleItems = getVisibleItems();
    const title = getScopeTitle();
    const summary = state.searchQuery
      ? 'Найдено ' + visibleItems.length + ' материалов по запросу «' + escapeHtml(state.searchQuery) + '»'
      : getScopeSummary(visibleItems.length);

    let html = '' +
      '<div class="page-frame">' +
      renderContinueStrip() +
      '<header class="page-header">' +
      '<h1 class="page-title">' + escapeHtml(title) + '</h1>' +
      '<div class="page-subtitle" data-testid="results-counter">' + summary + '</div>' +
      '</header>';

    if (!visibleItems.length) {
      html += '<div class="empty-state">Ничего не найдено. Попробуйте другой запрос или другую категорию.</div>';
      html += '</div>';
      if (currentVersion === renderVersion) {
        els.viewRoot.innerHTML = html;
        els.viewRoot.scrollTop = 0;
      }
      return;
    }

    if (state.layout === 'board') {
      html += renderBoard(visibleItems);
    } else {
      html += renderList(visibleItems);
    }

    html += '</div>';

    if (currentVersion === renderVersion) {
      els.viewRoot.innerHTML = html;
      els.viewRoot.scrollTop = 0;
    }
  }

  async function renderDetail(currentVersion) {
    const item = getCurrentItem();
    if (!item) {
      state.currentView = 'catalog';
      state.currentItemId = null;
      renderCatalog(currentVersion);
      return;
    }

    const chips = buildDetailMeta(item);
    let html = '' +
      '<div class="detail-shell">' +
      '<button class="back-btn" type="button" data-action="back" aria-label="Назад">' +
      '<i data-lucide="arrow-left"></i>' +
      '<span>Назад</span>' +
      '</button>' +
      '<header class="detail-header">' +
      '<div class="detail-kicker">' + escapeHtml(item.subcategory || item.category || 'Материал') + '</div>' +
      '<h1 class="detail-title">' + escapeHtml(item.title) + '</h1>' +
      '<div class="detail-meta">' + chips + '</div>' +
      '<div class="chip-row">' + buildChips(item) + '</div>' +
      '</header>';

    if (item.type === 'lesson') {
      html += '<article class="article-frame"><div class="md-body">Загрузка урока...</div></article>';
      html += '</div>';

      if (currentVersion !== renderVersion) {
        return;
      }

      els.viewRoot.innerHTML = html;
      lucide.createIcons();

      try {
        const response = await fetch(item.file);
        if (!response.ok) {
          throw new Error('Не удалось загрузить урок');
        }

        let markdown = await response.text();
        markdown = markdown.replace(/^---[\s\S]*?---\s*/, '');
        saveReadTime(item.id, estimateReadingTime(markdown));

        const articleHtml = '' +
          '<div class="detail-shell">' +
          '<button class="back-btn" type="button" data-action="back" aria-label="Назад">' +
          '<i data-lucide="arrow-left"></i>' +
          '<span>Назад</span>' +
          '</button>' +
          '<header class="detail-header">' +
          '<div class="detail-kicker">' + escapeHtml(item.subcategory || item.category || 'Материал') + '</div>' +
          '<h1 class="detail-title">' + escapeHtml(item.title) + '</h1>' +
          '<div class="detail-meta">' + chips + '</div>' +
          '<div class="chip-row">' + buildChips(item) + '</div>' +
          '</header>' +
          '<article class="article-frame"><div class="md-body">' + marked.parse(markdown) + '</div></article>' +
          '</div>';

        if (currentVersion !== renderVersion) {
          return;
        }

        els.viewRoot.innerHTML = articleHtml;
        attachLessonLinks();
        attachLightbox();
        setupScrollProgress(item.id);
        restoreReadingPosition(item.id);
      } catch (error) {
        els.viewRoot.innerHTML = '' +
          '<div class="detail-shell">' +
          '<button class="back-btn" type="button" data-action="back" aria-label="Назад">' +
          '<i data-lucide="arrow-left"></i>' +
          '<span>Назад</span>' +
          '</button>' +
          '<div class="error-state">Не удалось загрузить выбранный урок.</div>' +
          '</div>';
      }
    } else {
      html += '' +
        '<div class="module-shell">' +
        '<iframe class="module-frame" src="' + escapeAttribute(item.path + 'index.html') + '" title="' + escapeAttribute(item.title) + '"></iframe>' +
        '</div>' +
        '</div>';

      if (currentVersion === renderVersion) {
        els.viewRoot.innerHTML = html;
        els.viewRoot.scrollTop = 0;
      }
    }
  }

  // Проверяет, является ли материал "новым" для текущего пользователя
  function isNewItem(item) {
    if (!item.lastUpdated || !userLastVisit) return false;
    var itemDate = new Date(item.lastUpdated);
    var visitDate = userLastVisit instanceof Date ? userLastVisit : new Date(userLastVisit);
    return itemDate > visitDate && getProgress(item.id) === 0;
  }

  function renderList(items) {
    const groups = groupItemsForList(items);
    let html = '<div data-testid="catalog-list">';

    groups.forEach(function(group) {
      html += '<section class="group-block">';
      html += '<h2 class="group-title">' + escapeHtml(group.title) + '</h2>';

      group.subgroups.forEach(function(subgroup) {
        if (subgroup.title) {
          html += '<div class="subgroup-title">' + escapeHtml(subgroup.title) + '</div>';
        }

        html += '<div class="list-stack">';
        subgroup.items.forEach(function(item) {
          const progress = getProgress(item.id);
          const isRead = progress >= 100;
          const isStarted = progress > 0 && progress < 100;

          var itemIsNew = isNewItem(item);

          html += '' +
            '<button class="list-row" type="button" data-open-id="' + escapeAttribute(item.id) + '" aria-label="' + escapeAttribute('Открыть материал ' + item.title) + '">' +
            '<span class="status-dot' + (isRead || isStarted ? ' is-cleared' : '') + '"></span>' +
            '<div class="item-main">' +
            '<div class="item-title' + (isRead ? ' is-read' : '') + '">' + highlightMatch(item.title, state.searchQuery) + (itemIsNew ? ' <span class="badge-new">Новое</span>' : '') + '</div>' +
            '</div>' +
            '<div class="item-meta">' +
            '<span class="item-type">' + escapeHtml(item.type === 'module' ? 'Интерактив' : 'Урок') + '</span>' +
            buildTimeLabel(item) +
            '</div>' +
            '<div class="item-progress">' + buildCompactProgress(item) + '</div>' +
            '</button>';
        });
        html += '</div>';
      });

      html += '</section>';
    });

    html += '</div>';
    return html;
  }

  function renderBoard(items) {
    let html = '<div class="board-grid" data-testid="board-grid">';

    items.forEach(function(item) {
      const progress = getProgress(item.id);
      const isRead = progress >= 100;
      const isStarted = progress > 0 && progress < 100;
      var itemIsNew = isNewItem(item);

      html += '' +
        '<button class="board-card" type="button" data-open-id="' + escapeAttribute(item.id) + '" aria-label="' + escapeAttribute('Открыть материал ' + item.title) + '">' +
        '<div class="board-card-top">' +
        '<span class="status-dot' + (isRead || isStarted ? ' is-cleared' : '') + '"></span>' +
        (itemIsNew ? '<span class="badge-new">Новое</span>' : '') +
        buildCompactProgress(item) +
        '</div>' +
        '<div class="item-title' + (isRead ? ' is-read' : '') + '">' + highlightMatch(item.title, state.searchQuery) + '</div>' +
        '<div class="chip-row">' + buildChips(item) + '</div>' +
        '</button>';
    });

    html += '</div>';
    return html;
  }

  function renderContinueStrip() {
    const lastRead = getLastRead();
    if (!lastRead || state.searchQuery) {
      return '';
    }

    const item = allItems.find(function(entry) {
      return entry.id === lastRead.id;
    });

    if (!item) {
      return '';
    }

    return '' +
      '<div class="continue-strip" data-testid="continue-strip">' +
      '<div class="continue-copy">' +
      '<div class="continue-icon"><i data-lucide="history"></i></div>' +
      '<div>' +
      '<span class="continue-label">Продолжить чтение</span>' +
      '<span class="continue-title">' + escapeHtml(item.title) + '</span>' +
      '<span class="continue-meta">Прогресс: ' + escapeHtml(String(lastRead.progress)) + '%</span>' +
      '</div>' +
      '</div>' +
      '<button class="continue-action" type="button" data-continue-id="' + escapeAttribute(item.id) + '">Открыть</button>' +
      '</div>';
  }

  function openItem(id) {
    markLessonStarted(id);
    state.currentItemId = id;
    state.currentView = 'detail';
    setMobileSidebar(false);
    render();
  }

  function compareItems(left, right) {
    return left.title.localeCompare(right.title, 'ru');
  }

  function getCategories() {
    const map = {};

    allItems.forEach(function(item) {
      const name = item.category || 'Без категории';
      if (!map[name]) {
        map[name] = {
          name: name,
          count: 0,
          icon: categoryIcons[name] || 'folder'
        };
      }
      map[name].count += 1;
    });

    return Object.keys(map).sort(function(left, right) {
      return left.localeCompare(right, 'ru');
    }).map(function(key) {
      return map[key];
    });
  }

  function getSubcategories(category) {
    const map = {};

    allItems.forEach(function(item) {
      if ((item.category || 'Без категории') !== category) {
        return;
      }

      const name = item.subcategory || '';
      if (!name) {
        return;
      }

      if (!map[name]) {
        map[name] = {
          name: name,
          count: 0
        };
      }

      map[name].count += 1;
    });

    return Object.keys(map).sort(function(left, right) {
      return left.localeCompare(right, 'ru');
    }).map(function(key) {
      return map[key];
    });
  }

  function getVisibleItems() {
    return allItems.filter(function(item) {
      return matchesScope(item) && matchesSearch(item, state.searchQuery);
    });
  }

  function matchesScope(item) {
    const category = item.category || 'Без категории';
    const subcategory = item.subcategory || '';

    if (state.activeCategory !== 'all' && category !== state.activeCategory) {
      return false;
    }

    if (state.activeSubcategory && subcategory !== state.activeSubcategory) {
      return false;
    }

    return true;
  }

  function matchesSearch(item, query) {
    const trimmed = (query || '').trim().toLowerCase();
    if (!trimmed) {
      return true;
    }

    const haystack = [
      item.title,
      item.description,
      item.category,
      item.subcategory,
      (item.tags || []).join(' ')
    ].join(' ').toLowerCase();

    return haystack.includes(trimmed);
  }

  function groupItemsForList(items) {
    if (state.searchQuery) {
      return [
        {
          title: 'Результаты поиска',
          subgroups: [{ title: '', items: items }]
        }
      ];
    }

    if (state.activeCategory === 'all') {
      const categoryMap = {};

      items.forEach(function(item) {
        const category = item.category || 'Без категории';
        const subcategory = item.subcategory || '';

        if (!categoryMap[category]) {
          categoryMap[category] = {};
        }

        if (!categoryMap[category][subcategory]) {
          categoryMap[category][subcategory] = [];
        }

        categoryMap[category][subcategory].push(item);
      });

      return Object.keys(categoryMap).sort(function(left, right) {
        return left.localeCompare(right, 'ru');
      }).map(function(category) {
        return {
          title: category,
          subgroups: Object.keys(categoryMap[category]).sort(function(left, right) {
            return left.localeCompare(right, 'ru');
          }).map(function(subcategory) {
            return {
              title: subcategory,
              items: categoryMap[category][subcategory]
            };
          })
        };
      });
    }

    if (state.activeSubcategory) {
      return [
        {
          title: state.activeCategory,
          subgroups: [{ title: state.activeSubcategory, items: items }]
        }
      ];
    }

    const subcategoryMap = {};
    items.forEach(function(item) {
      const subcategory = item.subcategory || '';
      if (!subcategoryMap[subcategory]) {
        subcategoryMap[subcategory] = [];
      }
      subcategoryMap[subcategory].push(item);
    });

    return [
      {
        title: state.activeCategory,
        subgroups: Object.keys(subcategoryMap).sort(function(left, right) {
          return left.localeCompare(right, 'ru');
        }).map(function(subcategory) {
          return {
            title: subcategory,
            items: subcategoryMap[subcategory]
          };
        })
      }
    ];
  }

  function buildCategoryButton(value, icon, label, count, isActive) {
    return '' +
      '<button class="nav-item' + (isActive ? ' is-active' : '') + '" type="button" data-category="' + escapeHtml(value) + '">' +
      '<i data-lucide="' + icon + '"></i>' +
      '<span class="nav-item-label">' + escapeHtml(label) + '</span>' +
      '<span class="nav-item-count">' + count + '</span>' +
      '</button>';
  }

  function buildDetailMeta(item) {
    const meta = [];
    const progress = getProgress(item.id);
    const readTime = getReadTime(item.id);

    meta.push('<span class="detail-meta-item"><i data-lucide="folder"></i>' + escapeHtml(item.category || 'Без категории') + '</span>');

    if (item.type === 'lesson' && readTime) {
      meta.push('<span class="detail-meta-item"><i data-lucide="clock"></i>' + escapeHtml(String(readTime)) + ' мин</span>');
    }

    if (item.type === 'module') {
      meta.push('<span class="detail-meta-item"><i data-lucide="blocks"></i>Интерактив</span>');
    } else {
      meta.push('<span class="detail-meta-item"><i data-lucide="' + (progress >= 100 ? 'check-circle' : 'circle') + '"></i>' + (progress >= 100 ? 'Прочитано' : 'В процессе') + '</span>');
    }

    return meta.join('');
  }

  function buildChips(item) {
    let chips = '<span class="chip is-type">' + escapeHtml(item.type === 'module' ? 'Интерактив' : 'Урок') + '</span>';

    if (item.type === 'lesson' && getReadTime(item.id)) {
      chips += '<span class="chip is-time">' + escapeHtml(String(getReadTime(item.id))) + ' мин</span>';
    }

    (item.tags || []).slice(0, 4).forEach(function(tag) {
      chips += '<span class="chip">' + highlightMatch(tag, state.searchQuery) + '</span>';
    });

    return chips;
  }

  function buildCompactProgress(item) {
    // Для интерактивов (модулей) прогресс не показываем
    if (item.type === 'module') {
      return '';
    }

    var id = typeof item === 'string' ? item : item.id;
    const progress = getProgress(id);

    if (!progress) {
      return '<span class="progress-pill">0%</span>';
    }

    if (progress >= 100) {
      return '<span class="progress-pill is-done">100%</span>';
    }

    return '<span class="progress-pill">' + progress + '%</span>';
  }

  function buildTimeLabel(item) {
    if (item.type !== 'lesson') {
      return '';
    }

    const readTime = getReadTime(item.id);
    if (!readTime) {
      return '';
    }

    return '<span class="item-time">' + escapeHtml(String(readTime)) + ' мин</span>';
  }

  function getScopeTitle() {
    if (state.activeSubcategory) {
      return state.activeSubcategory;
    }

    if (state.activeCategory === 'all') {
      return 'Все материалы';
    }

    return state.activeCategory;
  }

  function getScopeSummary(totalItems) {
    if (state.activeCategory === 'all') {
      return totalItems + ' материалов в общей библиотеке';
    }

    if (state.activeSubcategory) {
      return totalItems + ' материалов в подборке';
    }

    return totalItems + ' материалов в категории';
  }

  function getCurrentItem() {
    return allItems.find(function(item) {
      return item.id === state.currentItemId;
    }) || null;
  }

  function calculateTrackProgress(category) {
    const lessons = allItems.filter(function(item) {
      return item.type === 'lesson' && item.category === category;
    });

    const total = lessons.length;
    const read = lessons.filter(function(item) {
      return getProgress(item.id) >= 100;
    }).length;

    return {
      total: total,
      read: read,
      percent: total ? Math.round((read / total) * 100) : 0
    };
  }

  function getProgress(id) {
    return progressProvider.getProgress(id);
  }

  function saveProgress(id, percent) {
    progressProvider.saveProgress(id, percent);
  }

  function markLessonStarted(id) {
    const item = allItems.find(function(entry) {
      return entry.id === id;
    });

    if (!item) {
      return;
    }

    if (getProgress(id) === 0) {
      saveProgress(id, 1);
    }

    progressProvider.saveLastRead({
      id: item.id,
      title: item.title,
      progress: Math.max(1, getProgress(id))
    });
  }

  function getReadTime(id) {
    return progressProvider.getReadTime(id);
  }

  function saveReadTime(id, minutes) {
    progressProvider.saveReadTime(id, minutes);
  }

  function estimateReadingTime(markdown) {
    const words = markdown
      .replace(/[#*_`>\-\[\]()!]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .length;

    return Math.max(1, Math.round(words / 200));
  }

  function getLastRead() {
    return progressProvider.getLastRead();
  }

  function setupScrollProgress(id) {
    teardownScrollProgress();
    els.readingProgress.classList.remove('is-hidden');

    scrollProgressHandler = function() {
      const scrollTop = els.viewRoot.scrollTop;
      const scrollHeight = els.viewRoot.scrollHeight - els.viewRoot.clientHeight;
      const percent = scrollHeight > 0 ? Math.min(100, Math.round((scrollTop / scrollHeight) * 100)) : 0;

      els.readingProgressFill.style.width = percent + '%';
      saveProgress(id, percent);
      sessionStorage.setItem('scrollPos_' + id, String(Math.round(scrollTop)));

      const item = allItems.find(function(entry) {
        return entry.id === id;
      });

      if (item) {
        progressProvider.saveLastRead({
          id: item.id,
          title: item.title,
          progress: percent
        });
      }
    };

    els.viewRoot.addEventListener('scroll', scrollProgressHandler, { passive: true });
    scrollProgressHandler();
  }

  function teardownScrollProgress() {
    if (scrollProgressHandler) {
      els.viewRoot.removeEventListener('scroll', scrollProgressHandler);
      scrollProgressHandler = null;
    }

    els.readingProgressFill.style.width = '0%';
  }

  function restoreReadingPosition(id) {
    const progress = getProgress(id);
    const storedPosition = parseInt(sessionStorage.getItem('scrollPos_' + id) || '0', 10);

    if (progress > 0 && progress < 100 && storedPosition > 0) {
      requestAnimationFrame(function() {
        els.viewRoot.scrollTop = storedPosition;
      });
      return;
    }

    els.viewRoot.scrollTop = 0;
  }

  function attachLessonLinks() {
    const links = els.viewRoot.querySelectorAll('.md-body a');
    links.forEach(function(link) {
      let href = link.getAttribute('href') || '';
      try {
        href = decodeURIComponent(href);
      } catch (error) {
        href = link.getAttribute('href') || '';
      }

      let target = null;

      if (/^lessons\//i.test(href)) {
        target = allItems.find(function(item) {
          return item.file === href;
        });
      } else if (/^#?lesson:/i.test(href)) {
        const lessonId = href.replace(/^#?lesson:/i, '');
        target = allItems.find(function(item) {
          return item.id === lessonId;
        });
      }

      if (target) {
        link.addEventListener('click', function(event) {
          event.preventDefault();
          openItem(target.id);
        });
      }
    });
  }

  function attachLightbox() {
    lightboxImages = Array.from(els.viewRoot.querySelectorAll('.md-body img'));
    lightboxImages.forEach(function(image, index) {
      image.addEventListener('click', function() {
        openLightbox(index);
      });
    });
  }

  function openLightbox(index) {
    if (!lightboxImages.length) {
      return;
    }

    lightboxIndex = index;
    const image = lightboxImages[index];

    els.lightboxImage.src = image.src;
    els.lightboxImage.alt = image.alt || '';
    els.lightboxCounter.textContent = (index + 1) + ' / ' + lightboxImages.length;
    els.lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    els.lightbox.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function moveLightbox(direction) {
    const nextIndex = lightboxIndex + direction;
    if (nextIndex < 0 || nextIndex >= lightboxImages.length) {
      return;
    }

    openLightbox(nextIndex);
  }

  function setMobileSidebar(isOpen) {
    state.mobileSidebarOpen = isOpen;
    document.body.classList.toggle('mobile-sidebar-open', isOpen);
  }

  function setSearchOpen(isOpen) {
    document.body.classList.toggle('search-open', isOpen);
    if (isOpen) {
      // Ждём один кадр, чтобы display:flex применился до focus
      requestAnimationFrame(function() { els.sidebarSearch.focus(); });
    }
  }

  function highlightMatch(text, query) {
    const safeText = escapeHtml(text || '');
    const trimmedQuery = (query || '').trim();

    if (!trimmedQuery) {
      return safeText;
    }

    const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return safeText.replace(new RegExp('(' + escapedQuery + ')', 'gi'), '<mark>$1</mark>');
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }
})();
