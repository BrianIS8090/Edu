// EduPlatform — клиентская логика
// Загружает catalog.json, строит sidebar и список материалов,
// рендерит Markdown через marked.js, HTML-модули через iframe

(function() {
  'use strict';

  // Состояние приложения
  let catalog = { lessons: [], modules: [] };
  let allItems = [];
  let currentCategory = 'all';
  let currentSubcategory = null;
  let currentItem = null;

  // Состояние поиска
  let searchQuery = '';
  let searchDebounceTimer = null;

  // Цвета для иконок категорий (8 цветов для 8 категорий)
  const categoryColors = [
    { bg: '#e0e7ff', fg: '#4f46e5' },
    { bg: '#d1fae5', fg: '#059669' },
    { bg: '#fef3c7', fg: '#d97706' },
    { bg: '#fce7f3', fg: '#db2777' },
    { bg: '#e0f2fe', fg: '#0284c7' },
    { bg: '#f3e8ff', fg: '#7c3aed' },
    { bg: '#ecfdf5', fg: '#10b981' },
    { bg: '#fff1f2', fg: '#f43f5e' },
  ];

  // Иконки Lucide для 8 категорий
  const categoryIcons = {
    'Светотехника': 'lightbulb',
    'Проектирование освещения': 'drafting-compass',
    'Конструирование светильников': 'wrench',
    'Электроника': 'zap',
    'Продажи': 'handshake',
    'Маркетинг': 'megaphone',
    'ИИ и агенты': 'bot',
    'Онбординг': 'graduation-cap',
    'Без категории': 'folder',
  };

  // Инициализация приложения
  async function init() {
    if (window.innerWidth < 768) {
      document.body.classList.add('sidebar-collapsed');
    }
    initSearch();
    try {
      const response = await fetch('build/catalog.json');
      catalog = await response.json();
      allItems = [
        ...catalog.lessons.map(l => ({ ...l, type: 'lesson' })),
        ...catalog.modules.map(m => ({ ...m, type: 'module' })),
      ];
      renderSidebar();
      renderList();
      updateBanner();
      lucide.createIcons();
    } catch (err) {
      document.getElementById('content-list-inner').innerHTML =
        '<div class="loading">Ошибка загрузки каталога. Запустите scripts/build-catalog.sh</div>';
    }
  }

  // Получить уникальные категории с количеством элементов
  function getCategories() {
    const cats = {};
    allItems.forEach(item => {
      const cat = item.category || 'Без категории';
      cats[cat] = (cats[cat] || 0) + 1;
    });
    return cats;
  }

  // Получить уникальные подкатегории для категории с количеством элементов
  function getSubcategories(category) {
    const subs = {};
    allItems
      .filter(item => item.category === category)
      .forEach(item => {
        const sub = item.subcategory || 'Без подкатегории';
        if (!subs[sub]) {
          subs[sub] = { count: 0, items: [] };
        }
        subs[sub].count++;
        subs[sub].items.push(item);
      });
    return subs;
  }

  // Суммарное время чтения для категории (только уроки)
  function getCategoryReadTime(category) {
    return allItems
      .filter(i => i.category === category && i.type === 'lesson')
      .reduce((sum, i) => sum + (i.readTime || 0), 0);
  }

  // Суммарное время чтения для подкатегории (только уроки)
  function getSubcategoryReadTime(category, subcategory) {
    return allItems
      .filter(i => i.category === category && (i.subcategory || 'Без подкатегории') === subcategory && i.type === 'lesson')
      .reduce((sum, i) => sum + (i.readTime || 0), 0);
  }

  // Иконка элемента: урок = file-text, модуль = blocks
  function getItemIcon(item) {
    return item.type === 'module' ? 'blocks' : 'file-text';
  }

  // Количество прочитанных статей в подкатегории
  function getSubcategoryReadCount(items) {
    return items.filter(i => getProgress(i.id) >= 100).length;
  }

  // Собрать все уникальные теги с количеством
  function getAllTags() {
    const tags = {};
    allItems.forEach(item => {
      (item.tags || []).forEach(tag => {
        tags[tag] = (tags[tag] || 0) + 1;
      });
    });
    return tags;
  }

  // Форматирование времени: минуты → "X мин" или "X ч Y мин"
  function formatTime(minutes) {
    if (!minutes || minutes <= 0) return '';
    if (minutes < 60) return minutes + ' мин';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? h + ' ч ' + m + ' мин' : h + ' ч';
  }

  // Рендер боковой панели (sidebar) с подкатегориями (accordion)
  function renderSidebar() {
    const sidebar = document.getElementById('sidebar');
    const categories = getCategories();
    let html = '';

    // Раздел "Все материалы"
    html += '<div class="sidebar-section">';
    html += '<div class="sidebar-title">Все материалы</div>';
    html += '<div class="sidebar-item ' + (currentCategory === 'all' ? 'active' : '') + '" onclick="app.filterCategory(\'all\', this)">';
    html += '<i data-lucide="layers"></i> Все';
    html += '<span class="sidebar-count">' + allItems.length + '</span>';
    html += '</div>';
    html += '</div>';

    // Категории с подкатегориями (всегда раскрыты)
    Object.keys(categories).sort().forEach((cat, catIndex) => {
      const catIcon = categoryIcons[cat] || 'folder';
      const catColor = categoryColors[catIndex % categoryColors.length];
      const subs = getSubcategories(cat);
      const subKeys = Object.keys(subs).sort();
      const hasSubs = subKeys.length > 0 && !(subKeys.length === 1 && subKeys[0] === 'Без подкатегории');

      html += '<div class="sidebar-section">';

      // Заголовок категории (клик — показать все материалы категории)
      html += '<div class="sidebar-category-header' + (currentCategory === cat && !currentSubcategory ? ' active' : '') + '" onclick="app.filterCategory(\'' + escapeJs(cat) + '\', this)">';
      html += '<span class="sidebar-category-icon" style="color:' + catColor.fg + ';">';
      html += '<i data-lucide="' + catIcon + '"></i></span>';
      html += '<span class="sidebar-category-name">' + escapeHtml(cat) + '</span>';
      html += '<span class="sidebar-count">' + categories[cat] + '</span>';
      html += '</div>';

      // Подкатегории (всегда видны) с прогрессом и временем
      if (hasSubs) {
        html += '<div class="sidebar-subcategories">';
        subKeys.forEach(sub => {
          const isSubActive = currentCategory === cat && currentSubcategory === sub;
          const subItems = subs[sub].items;
          const readCount = getSubcategoryReadCount(subItems);
          const totalCount = subs[sub].count;
          const subTime = getSubcategoryReadTime(cat, sub);
          const timeStr = formatTime(subTime);

          html += '<div class="sidebar-subcategory ' + (isSubActive ? 'active' : '') + '" ';
          html += 'onclick="app.filterSubcategory(\'' + escapeJs(cat) + '\', \'' + escapeJs(sub) + '\', this)">';
          html += '<span class="subcategory-bullet">—</span>';
          html += '<span class="subcategory-name">' + escapeHtml(sub) + '</span>';
          html += '<span class="sidebar-count">';
          if (readCount > 0) {
            html += '<span style="color:#10b981;">' + readCount + '</span>/';
          }
          html += totalCount;
          if (timeStr) html += ' · ' + timeStr;
          html += '</span>';
          html += '</div>';
        });
        html += '</div>';
      }

      html += '</div>';
    });

    sidebar.innerHTML = html;
    lucide.createIcons();
  }

  // Вспомогательная функция для экранирования строк в JS
  function escapeJs(str) {
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
  }


  // Фильтрация по подкатегории
  function filterSubcategory(category, subcategory, el) {
    currentCategory = category;
    currentSubcategory = subcategory;

    // Обновить активные состояния
    document.querySelectorAll('.sidebar-item, .sidebar-subcategory').forEach(i => i.classList.remove('active'));
    if (el) el.classList.add('active');

    // Рендер списка материалов по подкатегории
    renderListBySubcategory(category, subcategory);
    
    // Автосворачивание на мобильных
    if (window.innerWidth < 768) {
      document.body.classList.add('sidebar-collapsed');
    }
  }

  // Получить элементы по категории
  function getItemsByCategory(category) {
    return allItems
      .filter(item => (item.category || 'Без категории') === category)
      .sort((a, b) => a.title.localeCompare(b.title, 'ru'));
  }

  // Получить элементы по подкатегории
  function getItemsBySubcategory(category, subcategory) {
    return allItems
      .filter(item => item.category === category && (item.subcategory || 'Без подкатегории') === subcategory)
      .sort((a, b) => a.title.localeCompare(b.title, 'ru'));
  }

  // Рендер списка материалов по подкатегории
  function renderListBySubcategory(category, subcategory) {
    const listEl = document.getElementById('content-list');
    const innerEl = document.getElementById('content-list-inner');
    const items = getItemsBySubcategory(category, subcategory);
    const icon = categoryIcons[category] || 'folder';

    teardownScrollProgress();
    listEl.classList.remove('content-wide');

    const subTime = getSubcategoryReadTime(category, subcategory);
    const subTimeStr = formatTime(subTime);
    const subReadCount = getSubcategoryReadCount(items);

    let html = '';
    html += '<div class="section-header">';
    html += '<i data-lucide="' + icon + '" style="width:20px;height:20px;color:#4f46e5;"></i>';
    html += escapeHtml(category) + ' / ' + escapeHtml(subcategory);
    if (subTimeStr) html += '<span style="font-size:12px;color:#888;font-weight:400;margin-left:8px;">≈ ' + subTimeStr + '</span>';
    if (subReadCount > 0) html += '<span style="font-size:12px;color:#10b981;font-weight:400;margin-left:8px;">' + subReadCount + '/' + items.length + ' прочитано</span>';
    html += '</div>';

    html += '<div class="lessons-grid">';
    items.forEach((item, i) => {
      const color = categoryColors[i % categoryColors.length];
      const progress = getProgress(item.id);
      const readTime = getReadTime(item.id);
      const typeTag = item.type === 'module'
        ? '<span class="tag tag-type interactive">\u0438\u043d\u0442\u0435\u0440\u0430\u043a\u0442\u0438\u0432</span>'
        : '<span class="tag tag-type">\u0443\u0440\u043e\u043a</span>';
      const timeTag = (item.type === 'lesson' && readTime)
        ? '<span class="tag tag-time">\u2248 ' + readTime + ' \u043c\u0438\u043d</span>' : '';
      const doneBadge = progress >= 100
        ? '<i data-lucide="check-circle" class="card-done-badge"></i>' : '';

      html += '<div class="lesson-card" data-id="' + escapeHtml(item.id) + '">';
      html += doneBadge;
      html += '<div class="lesson-icon" style="background:' + color.bg + ';">';
      html += '<i data-lucide="' + getItemIcon(item) + '" style="width:20px;height:20px;color:' + color.fg + ';"></i>';
      html += '</div>';
      html += '<div class="lesson-info">';
      html += '<div class="lesson-title">' + escapeHtml(item.title) + '</div>';
      if (item.description) {
        html += '<div class="lesson-desc">' + escapeHtml(item.description) + '</div>';
      }
      html += '<div class="lesson-tags-row">' + typeTag + timeTag;
      (item.tags || []).forEach(tag => {
        html += '<span class="tag">' + escapeHtml(tag) + '</span>';
      });
      html += '</div>';
      html += buildCardProgress(item.id, progress);
      html += '</div></div>';
    });
    html += '</div>';

    innerEl.innerHTML = html;
    listEl.style.display = 'block';
    document.getElementById('content-page').style.display = 'none';
    currentItem = null;

    updateBanner();

    // Делегирование событий для lesson-card
    innerEl.querySelectorAll('.lesson-card').forEach(el => {
      el.addEventListener('click', () => app.openItem(el.dataset.id));
    });

    lucide.createIcons();
  }

  // Рендер списка карточек материалов
  function renderList(category) {
    category = category || 'all';
    currentCategory = category;

    const listEl = document.getElementById('content-list');
    const innerEl = document.getElementById('content-list-inner');

    teardownScrollProgress();

    if (category === 'all') {
      // Вкладка "Все" — плитки 4 колонки, группировка по категориям
      listEl.classList.add('content-wide');
      renderTilesView(innerEl);
    } else {
      // Конкретная категория — список карточек
      listEl.classList.remove('content-wide');
      renderCategoryList(innerEl, category);
    }

    listEl.style.display = 'block';
    document.getElementById('content-page').style.display = 'none';
    currentItem = null;

    updateBanner();

    // Сбросить активный элемент в sidebar
    document.querySelectorAll('.sidebar-lesson').forEach(l => l.classList.remove('active'));
    lucide.createIcons();
  }

  // Рендер плиточного вида (вкладка "Все") с группировкой по категориям
  function renderTilesView(container) {
    const categories = getCategories();
    let html = '';

    html += '<div class="section-header">';
    html += '<i data-lucide="layers" style="width:20px;height:20px;color:#4f46e5;"></i>';
    html += 'Все материалы';
    html += '</div>';

    // Облако тегов
    const allTags = getAllTags();
    const tagKeys = Object.keys(allTags).sort((a, b) => allTags[b] - allTags[a]);
    if (tagKeys.length > 0) {
      html += '<div class="tags-cloud" style="margin-bottom:24px;">';
      html += '<div style="font-size:12px;color:#888;margin-bottom:8px;display:flex;align-items:center;gap:6px;">';
      html += '<i data-lucide="tags" style="width:14px;height:14px;"></i> Теги</div>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
      tagKeys.forEach(tag => {
        html += '<span class="tag tag-cloud-item" style="cursor:pointer;padding:4px 10px;font-size:12px;" ';
        html += 'onclick="app.filterByTag(\'' + escapeJs(tag) + '\')">';
        html += escapeHtml(tag) + ' <span style="color:#aaa;font-size:10px;">' + allTags[tag] + '</span>';
        html += '</span>';
      });
      html += '</div></div>';
    }

    Object.keys(categories).sort().forEach((cat, catIndex) => {
      const catIcon = categoryIcons[cat] || 'folder';
      const catColor = categoryColors[catIndex % categoryColors.length];
      const items = getItemsByCategory(cat);

      html += '<div class="category-group">';
      html += '<div class="category-group-header">';
      html += '<i data-lucide="' + catIcon + '" style="width:18px;height:18px;color:' + catColor.fg + ';"></i>';
      html += escapeHtml(cat);
      html += '</div>';

      html += '<div class="tiles-grid">';
      items.forEach((item, i) => {
        const color = categoryColors[(catIndex + i) % categoryColors.length];
        const progress = getProgress(item.id);
        const readTime = getReadTime(item.id);
        const typeTag = item.type === 'module'
          ? '<span class="tag tag-type interactive">интерактив</span>'
          : '<span class="tag tag-type">урок</span>';
        const timeTag = (item.type === 'lesson' && readTime)
          ? '<span class="tag tag-time">\u2248 ' + readTime + ' \u043c\u0438\u043d</span>' : '';
        const doneBadge = progress >= 100
          ? '<i data-lucide="check-circle" class="card-done-badge"></i>' : '';

        html += '<div class="tile-card" data-id="' + escapeHtml(item.id) + '">';
        html += doneBadge;
        html += '<div class="tile-icon" style="background:' + color.bg + ';">';
        html += '<i data-lucide="' + getItemIcon(item) + '" style="width:20px;height:20px;color:' + color.fg + ';"></i>';
        html += '</div>';
        html += '<div class="tile-title">' + escapeHtml(item.title) + '</div>';
        if (item.description) {
          html += '<div class="tile-desc">' + escapeHtml(item.description) + '</div>';
        }
        html += '<div class="tile-tags">' + typeTag + timeTag;
        (item.tags || []).forEach(tag => {
          html += '<span class="tag">' + escapeHtml(tag) + '</span>';
        });
        html += '</div>';
        html += buildCardProgress(item.id, progress);
        html += '</div>';
      });
      html += '</div></div>';
    });

    container.innerHTML = html;

    // Делегирование событий для tile-card
    container.querySelectorAll('.tile-card').forEach(el => {
      el.addEventListener('click', () => app.openItem(el.dataset.id));
    });
  }

  // Рендер списка карточек для конкретной категории, сгруппированных по подкатегориям
  function renderCategoryList(container, category) {
    const icon = categoryIcons[category] || 'folder';
    const subs = getSubcategories(category);
    const subKeys = Object.keys(subs).sort();
    const catIndex = Object.keys(getCategories()).sort().indexOf(category);
    const catColor = categoryColors[catIndex % categoryColors.length];

    const catTime = getCategoryReadTime(category);
    const catTimeStr = formatTime(catTime);

    let html = '';
    html += '<div class="section-header">';
    html += '<i data-lucide="' + icon + '" style="width:20px;height:20px;color:' + catColor.fg + ';"></i>';
    html += escapeHtml(category);
    if (catTimeStr) html += '<span style="font-size:12px;color:#888;font-weight:400;margin-left:8px;">≈ ' + catTimeStr + '</span>';
    html += '</div>';

    subKeys.forEach(sub => {
      const items = subs[sub].items.sort((a, b) => a.title.localeCompare(b.title, 'ru'));

      // Заголовок подкатегории (не выводим если подкатегория одна и называется "Без подкатегории")
      const showSubHeader = !(subKeys.length === 1 && sub === '\u0411\u0435\u0437 \u043f\u043e\u0434\u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0438');
      if (showSubHeader) {
        html += '<div class="subcategory-group-header">' + escapeHtml(sub) + '</div>';
      }

      html += '<div class="lessons-grid">';
      items.forEach((item, i) => {
        const color = categoryColors[i % categoryColors.length];
        const progress = getProgress(item.id);
        const readTime = getReadTime(item.id);
        const typeTag = item.type === 'module'
          ? '<span class="tag tag-type interactive">\u0438\u043d\u0442\u0435\u0440\u0430\u043a\u0442\u0438\u0432</span>'
          : '<span class="tag tag-type">\u0443\u0440\u043e\u043a</span>';
        const timeTag = (item.type === 'lesson' && readTime)
          ? '<span class="tag tag-time">\u2248 ' + readTime + ' \u043c\u0438\u043d</span>' : '';
        const doneBadge = progress >= 100
          ? '<i data-lucide="check-circle" class="card-done-badge"></i>' : '';

        html += '<div class="lesson-card" data-id="' + escapeHtml(item.id) + '">';
        html += doneBadge;
        html += '<div class="lesson-icon" style="background:' + color.bg + ';">';
        html += '<i data-lucide="' + getItemIcon(item) + '" style="width:20px;height:20px;color:' + color.fg + ';"></i>';
        html += '</div>';
        html += '<div class="lesson-info">';
        html += '<div class="lesson-title">' + escapeHtml(item.title) + '</div>';
        if (item.description) {
          html += '<div class="lesson-desc">' + escapeHtml(item.description) + '</div>';
        }
        html += '<div class="lesson-tags-row">' + typeTag + timeTag;
        (item.tags || []).forEach(tag => {
          html += '<span class="tag">' + escapeHtml(tag) + '</span>';
        });
        html += '</div>';
        html += buildCardProgress(item.id, progress);
        html += '</div></div>';
      });
      html += '</div>';
    });

    container.innerHTML = html;

    // Делегирование событий для lesson-card
    container.querySelectorAll('.lesson-card').forEach(el => {
      el.addEventListener('click', () => app.openItem(el.dataset.id));
    });
  }

  // Открыть урок (Markdown) или модуль (iframe)
  async function openItem(id, sidebarEl) {
    const item = allItems.find(i => i.id === id);
    if (!item) return;

    currentItem = item;
    teardownScrollProgress();

    const pageEl = document.getElementById('content-page');
    let html = '';

    // Навигация "назад" — в подкатегорию/категорию откуда пришли
    let backLabel = 'Все материалы';
    let backAction = 'app.goBack()';
    if (currentSubcategory) {
      backLabel = currentSubcategory;
    } else if (currentCategory && currentCategory !== 'all') {
      backLabel = currentCategory;
    }
    html += '<div class="breadcrumb" onclick="' + backAction + '">';
    html += '<i data-lucide="arrow-left" style="width:14px;height:14px;"></i> ' + escapeHtml(backLabel);
    html += '</div>';

    // Заголовок и теги
    html += '<div class="lesson-page-header">';
    html += '<h1>' + escapeHtml(item.title) + '</h1>';
    html += '<div class="lesson-page-tags">';
    const typeTag = item.type === 'module'
      ? '<span class="tag tag-type interactive">\u0438\u043d\u0442\u0435\u0440\u0430\u043a\u0442\u0438\u0432</span>'
      : '<span class="tag tag-type">\u0443\u0440\u043e\u043a</span>';
    html += typeTag;
    const cachedTime = getReadTime(id);
    if (item.type === 'lesson' && cachedTime) {
      html += '<span class="tag tag-time">\u2248 ' + cachedTime + ' \u043c\u0438\u043d</span>';
    }
    (item.tags || []).forEach(tag => {
      html += '<span class="tag">' + escapeHtml(tag) + '</span>';
    });
    html += '</div></div>';

    if (item.type === 'lesson') {
      // Загрузить и отрендерить Markdown через marked.js
      try {
        const response = await fetch(item.file);
        let md = await response.text();
        // Убрать YAML frontmatter, если есть
        md = md.replace(/^---[\s\S]*?---\s*/, '');
        // Вычислить и сохранить время чтения
        const minutes = estimateReadingTime(md);
        saveReadTime(id, minutes);
        html += '<div class="md-body">' + marked.parse(md) + '</div>';
      } catch (err) {
        html += '<div class="loading">\u041e\u0448\u0438\u0431\u043a\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438 \u0444\u0430\u0439\u043b\u0430</div>';
      }
    } else {
      // HTML-модуль отображается через iframe
      html += '<iframe class="module-frame" src="' + item.path + 'index.html"></iframe>';
    }

    pageEl.innerHTML = html;
    pageEl.style.display = 'block';
    document.getElementById('content-list').style.display = 'none';

    // Подсветить активный элемент в sidebar
    document.querySelectorAll('.sidebar-lesson').forEach(l => l.classList.remove('active'));
    const sidebarItem = document.querySelector('.sidebar-lesson[data-id="' + id + '"]');
    if (sidebarItem) sidebarItem.classList.add('active');

    // Привязать лайтбокс к картинкам и перехват ссылок на уроки
    if (item.type === 'lesson') {
      attachLightbox();
      attachLessonLinks();
    }

    lucide.createIcons();

    // Запустить отслеживание прогресса скролла и восстановить позицию
    // Логика: (1) не дочитал → восстановить позицию
    //         (2) дочитал → в начало
    //         (3) не начинал → в начало
    if (item.type === 'lesson') {
      const progress = getProgress(id);
      setupScrollProgress(id);
      if (progress > 0 && progress < 100) {
        // Не дочитал — восстановить позицию
        const savedScrollPos = parseInt(localStorage.getItem('scrollPos_' + id) || '0', 10);
        if (savedScrollPos > 0) {
          requestAnimationFrame(function() {
            requestAnimationFrame(function() {
              window.scrollTo({ top: savedScrollPos, behavior: 'instant' });
            });
          });
        }
      } else {
        // Дочитал или не начинал — в начало
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    }

    // Автосворачивание на мобильных
    if (window.innerWidth < 768) {
      document.body.classList.add('sidebar-collapsed');
    }
  }

  // Фильтрация по категории (клик в sidebar)
  function filterCategory(category, el) {
    currentCategory = category;
    currentSubcategory = null;
    document.querySelectorAll('.sidebar-item, .sidebar-subcategory').forEach(i => i.classList.remove('active'));
    if (el) el.classList.add('active');
    renderList(category);
    
    // Автосворачивание на мобильных
    if (window.innerWidth < 768) {
      document.body.classList.add('sidebar-collapsed');
    }
  }

  // Вернуться к списку материалов
  function showList() {
    renderList(currentCategory);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  // Кнопка «назад» — в подкатегорию/категорию + скролл вверх
  function goBack() {
    if (currentSubcategory) {
      renderListBySubcategory(currentCategory, currentSubcategory);
    } else if (currentCategory && currentCategory !== 'all') {
      renderList(currentCategory);
    } else {
      renderList('all');
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  // Экранирование HTML-символов для защиты от XSS
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Сворачивание/разворачивание sidebar
  function toggleSidebar() {
    document.body.classList.toggle('sidebar-collapsed');
  }

  // Лайтбокс-галерея для картинок в уроках
  let lightboxImages = [];
  let lightboxIndex = 0;

  // Открыть лайтбокс на конкретной картинке
  function openLightbox(index) {
    lightboxIndex = index;
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    const counter = document.getElementById('lightbox-counter');

    img.src = lightboxImages[index].src;
    img.alt = lightboxImages[index].alt || '';

    // Счётчик
    if (lightboxImages.length > 1) {
      counter.textContent = (index + 1) + ' / ' + lightboxImages.length;
      counter.style.display = '';
    } else {
      counter.style.display = 'none';
    }

    // Кнопки навигации
    document.querySelector('.lightbox-nav.prev').disabled = (index === 0);
    document.querySelector('.lightbox-nav.next').disabled = (index === lightboxImages.length - 1);

    // Показать/скрыть навигацию если одна картинка
    const navVisible = lightboxImages.length > 1 ? '' : 'none';
    document.querySelector('.lightbox-nav.prev').style.display = navVisible;
    document.querySelector('.lightbox-nav.next').style.display = navVisible;

    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
    lucide.createIcons();
  }

  function closeLightbox() {
    document.getElementById('lightbox').classList.remove('open');
    document.body.style.overflow = '';
  }

  function lightboxPrev() {
    if (lightboxIndex > 0) openLightbox(lightboxIndex - 1);
  }

  function lightboxNext() {
    if (lightboxIndex < lightboxImages.length - 1) openLightbox(lightboxIndex + 1);
  }

  // Перехват ссылок на другие уроки внутри .md-body
  // Поддерживает: href="lessons/имя.md", href="lesson:id", href="#lesson:id"
  function attachLessonLinks() {
    var links = document.querySelectorAll('.md-body a');
    links.forEach(function(link) {
      var href = link.getAttribute('href') || '';
      var lessonId = null;

      // Формат: lessons/имя-файла.md
      if (href.match(/^lessons\//i)) {
        var filename = href.replace(/^lessons\//i, '').replace(/\.md$/i, '');
        // Нормализация: пробелы/подчёркивания → дефисы, нижний регистр
        lessonId = filename.replace(/[_ ]/g, '-').toLowerCase();
      }
      // Формат: lesson:id или #lesson:id
      else if (href.match(/^#?lesson:/i)) {
        lessonId = href.replace(/^#?lesson:/i, '');
      }

      if (lessonId) {
        // Проверяем, существует ли такой урок
        var target = allItems.find(function(i) { return i.id === lessonId; });
        if (target) {
          link.style.cursor = 'pointer';
          link.addEventListener('click', function(e) {
            e.preventDefault();
            app.openItem(lessonId);
          });
        }
      }
    });
  }

  // Привязать лайтбокс к картинкам внутри .md-body
  function attachLightbox() {
    const imgs = document.querySelectorAll('.md-body img');
    lightboxImages = Array.from(imgs);
    imgs.forEach(function(img, i) {
      img.addEventListener('click', function() {
        openLightbox(i);
      });
    });
  }

  // Закрытие по клику на фон или Escape
  document.getElementById('lightbox').addEventListener('click', function(e) {
    if (e.target === this) closeLightbox();
  });
  document.addEventListener('keydown', function(e) {
    if (!document.getElementById('lightbox').classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') lightboxPrev();
    if (e.key === 'ArrowRight') lightboxNext();
  });

  // ─── УТИЛИТЫ ПРОГРЕССА И ВРЕМЕНИ ЧТЕНИЯ ──────────────────────────────────

  // Получить прогресс чтения из localStorage (0-100)
  function getProgress(id) {
    return parseInt(localStorage.getItem('progress_' + id) || '0', 10);
  }

  // Сохранить прогресс чтения
  function saveProgress(id, percent) {
    localStorage.setItem('progress_' + id, Math.round(percent));
  }

  // Получить время чтения: сначала из localStorage, затем из каталога
  function getReadTime(id) {
    var cached = localStorage.getItem('readTime_' + id);
    if (cached) return cached;
    var item = allItems.find(function(i) { return i.id === id; });
    return (item && item.readTime) ? Math.round(item.readTime) : null;
  }

  // Сохранить время чтения
  function saveReadTime(id, minutes) {
    localStorage.setItem('readTime_' + id, minutes);
  }

  // Оценить время чтения по тексту Markdown (≈200 слов/мин)
  function estimateReadingTime(md) {
    const words = md.replace(/[#*`_\[\]()!>~\-]/g, ' ').split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  }

  // Построить HTML-блок прогресса для карточки
  function buildCardProgress(id, progress) {
    if (!progress || progress <= 0) return '';
    if (progress >= 100) {
      return '<div class="card-progress-label">\u2713 \u041f\u0440\u043e\u0447\u0438\u0442\u0430\u043d\u043e</div>';
    }
    return '<div class="card-progress-bar"><div class="card-progress-fill" style="width:' + progress + '%"></div></div>' +
           '<div class="card-progress-label">' + progress + '% \u043f\u0440\u043e\u0447\u0438\u0442\u0430\u043d\u043e</div>';
  }

  // ─── ОТСЛЕЖИВАНИЕ СКРОЛЛА ─────────────────────────────────────────────────

  // Запустить отслеживание прогресса скролла для статьи
  function setupScrollProgress(id) {
    const fill = document.getElementById('reading-progress-fill');

    // Восстановить предыдущий прогресс
    const savedProgress = getProgress(id);
    if (fill && savedProgress > 0) {
      fill.style.width = savedProgress + '%';
    }

    function onScroll() {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const percent = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;
      if (fill) fill.style.width = percent + '%';
      saveProgress(id, percent);
      // Сохранить позицию скролла в пикселях для восстановления
      localStorage.setItem('scrollPos_' + id, Math.round(scrollTop));
      // Обновить lastRead с новым прогрессом
      const item = allItems.find(function(i) { return i.id === id; });
      if (item) {
        localStorage.setItem('lastRead', JSON.stringify({ id: id, title: item.title, progress: percent }));
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window._scrollProgressHandler = onScroll;
    onScroll();
  }

  // Остановить отслеживание скролла и сбросить полосу
  function teardownScrollProgress() {
    if (window._scrollProgressHandler) {
      window.removeEventListener('scroll', window._scrollProgressHandler);
      window._scrollProgressHandler = null;
    }
    var fill = document.getElementById('reading-progress-fill');
    if (fill) fill.style.width = '0%';
  }

  // ─── БАННЕР ПОСЛЕДНЕЙ СТАТЬИ ──────────────────────────────────────────────

  // Обновить баннер — всегда виден, контент зависит от наличия lastRead
  function updateBanner() {
    var bannerEl = document.getElementById('last-read-banner');
    if (!bannerEl) return;

    // Установить фоновое изображение из banner/bg.jpg (с fallback на CSS-градиент)
    var testImg = new Image();
    testImg.onload = function() {
      bannerEl.style.backgroundImage = "url('banner/bg.jpg')";
    };
    testImg.src = 'banner/bg.jpg';

    var raw = localStorage.getItem('lastRead');
    var lastRead = null;
    if (raw) {
      try { lastRead = JSON.parse(raw); } catch (e) { lastRead = null; }
    }

    var titleEl = document.getElementById('banner-title');
    var progressFill = document.getElementById('banner-progress-fill');
    var progressLabel = document.getElementById('banner-progress-label');
    var progressTrack = progressFill && progressFill.parentElement;
    var btn = document.getElementById('banner-btn');
    var labelEl = bannerEl.querySelector('.banner-label');

    var item = lastRead ? allItems.find(function(i) { return i.id === lastRead.id; }) : null;

    if (item && lastRead.progress > 0 && lastRead.progress < 100) {
      // Есть статья в процессе чтения
      if (labelEl) labelEl.textContent = '\u041f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c \u0447\u0442\u0435\u043d\u0438\u0435';
      titleEl.textContent = lastRead.title;
      if (progressFill) progressFill.style.width = lastRead.progress + '%';
      if (progressTrack) progressTrack.style.display = '';
      var remaining = 100 - lastRead.progress;
      if (progressLabel) progressLabel.textContent = '\u041f\u0440\u043e\u0447\u0438\u0442\u0430\u043d\u043e\u00a0' + lastRead.progress + '%\u00a0\u2022\u00a0\u043e\u0441\u0442\u0430\u043b\u043e\u0441\u044c\u00a0' + remaining + '%';
      if (btn) { btn.textContent = '\u041e\u0442\u043a\u0440\u044b\u0442\u044c'; btn.style.display = ''; btn.onclick = function() { app.openItem(lastRead.id); }; }
    } else if (item && lastRead.progress >= 100) {
      // Последняя статья прочитана полностью
      if (labelEl) labelEl.textContent = '\u041f\u0440\u043e\u0447\u0438\u0442\u0430\u043d\u043e';
      titleEl.textContent = lastRead.title;
      if (progressFill) progressFill.style.width = '100%';
      if (progressTrack) progressTrack.style.display = '';
      if (progressLabel) progressLabel.textContent = '\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b \u043f\u0440\u043e\u0447\u0438\u0442\u0430\u043d \u043f\u043e\u043b\u043d\u043e\u0441\u0442\u044c\u044e \u2713';
      if (btn) { btn.textContent = '\u0427\u0438\u0442\u0430\u0442\u044c \u0441\u043d\u043e\u0432\u0430'; btn.style.display = ''; btn.onclick = function() { app.openItem(lastRead.id); }; }
    } else {
      // Нет истории чтения — welcome-состояние
      if (labelEl) labelEl.textContent = '\u0411\u0430\u0437\u0430 \u0437\u043d\u0430\u043d\u0438\u0439';
      titleEl.textContent = '\u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u043b\u044e\u0431\u043e\u0439 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b \u0434\u043b\u044f \u043d\u0430\u0447\u0430\u043b\u0430 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f';
      if (progressFill) progressFill.style.width = '0%';
      if (progressTrack) progressTrack.style.display = 'none';
      if (progressLabel) progressLabel.textContent = '';
      if (btn) btn.style.display = 'none';
    }

    bannerEl.classList.add('visible');
    lucide.createIcons();
  }

  // ─── ПОИСК ────────────────────────────────────────────────────────────────

  // Инициализировать поле поиска
  function initSearch() {
    var input = document.getElementById('search-input');
    var wrapper = document.getElementById('header-search');
    if (!input) return;

    input.addEventListener('input', function() {
      searchQuery = this.value.trim();
      wrapper.classList.toggle('has-value', searchQuery.length > 0);
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(function() {
        if (searchQuery) {
          renderSearchResults(searchQuery);
        } else {
          renderList(currentCategory);
        }
      }, 200);
    });

    // Закрытие поиска по Escape
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') app.clearSearch();
    });
  }

  // Фильтрация по тегу (из облака тегов)
  function filterByTag(tag) {
    var results = allItems.filter(function(item) {
      return (item.tags || []).some(function(t) { return t === tag; });
    });

    var listEl = document.getElementById('content-list');
    var innerEl = document.getElementById('content-list-inner');
    listEl.classList.remove('content-wide');
    teardownScrollProgress();

    var html = '';
    html += '<div class="section-header">';
    html += '<i data-lucide="tag" style="width:20px;height:20px;color:#4f46e5;"></i>';
    html += 'Тег: ' + escapeHtml(tag);
    html += '<span style="font-size:12px;color:#888;font-weight:400;margin-left:8px;">' + results.length + ' материалов</span>';
    html += '</div>';

    html += '<div class="lessons-grid">';
    results.forEach(function(item, i) {
      var color = categoryColors[i % categoryColors.length];
      var progress = getProgress(item.id);
      var readTime = getReadTime(item.id);
      var typeTag = item.type === 'module'
        ? '<span class="tag tag-type interactive">интерактив</span>'
        : '<span class="tag tag-type">урок</span>';
      var timeTag = (item.type === 'lesson' && readTime)
        ? '<span class="tag tag-time">≈ ' + readTime + ' мин</span>' : '';
      var doneBadge = progress >= 100
        ? '<i data-lucide="check-circle" class="card-done-badge"></i>' : '';

      html += '<div class="lesson-card" data-id="' + escapeHtml(item.id) + '">';
      html += doneBadge;
      html += '<div class="lesson-icon" style="background:' + color.bg + ';">';
      html += '<i data-lucide="' + getItemIcon(item) + '" style="width:20px;height:20px;color:' + color.fg + ';"></i>';
      html += '</div>';
      html += '<div class="lesson-info">';
      html += '<div class="lesson-title">' + escapeHtml(item.title) + '</div>';
      if (item.description) {
        html += '<div class="lesson-desc">' + escapeHtml(item.description) + '</div>';
      }
      html += '<div class="lesson-tags-row">' + typeTag + timeTag;
      (item.tags || []).forEach(function(t) {
        var cls = t === tag ? 'tag' : 'tag';
        var style = t === tag ? ' style="background:#e0e7ff;color:#4f46e5;font-weight:600;"' : '';
        html += '<span class="' + cls + '"' + style + '>' + escapeHtml(t) + '</span>';
      });
      html += '</div>';
      html += buildCardProgress(item.id, progress);
      html += '</div></div>';
    });
    html += '</div>';

    innerEl.innerHTML = html;
    listEl.style.display = 'block';
    document.getElementById('content-page').style.display = 'none';
    currentItem = null;

    innerEl.querySelectorAll('.lesson-card').forEach(function(el) {
      el.addEventListener('click', function() { app.openItem(el.dataset.id); });
    });

    lucide.createIcons();
  }

  // Очистить поиск
  function clearSearch() {
    searchQuery = '';
    var input = document.getElementById('search-input');
    var wrapper = document.getElementById('header-search');
    if (input) input.value = '';
    if (wrapper) wrapper.classList.remove('has-value');
    renderList(currentCategory);
  }

  // Экранировать строку для использования в RegExp
  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Подсветить совпадение в HTML-безопасном тексте
  function highlightMatch(text, query) {
    if (!text || !query) return escapeHtml(text || '');
    var escaped = escapeHtml(text);
    var escapedQuery = escapeRegex(escapeHtml(query));
    try {
      return escaped.replace(new RegExp('(' + escapedQuery + ')', 'gi'),
        '<mark class="search-highlight">$1</mark>');
    } catch (e) {
      return escaped;
    }
  }

  // Рендер результатов поиска
  function renderSearchResults(query) {
    var q = query.toLowerCase();
    var results = allItems.filter(function(item) {
      return (item.title || '').toLowerCase().indexOf(q) !== -1 ||
             (item.description || '').toLowerCase().indexOf(q) !== -1 ||
             (item.tags || []).some(function(t) { return t.toLowerCase().indexOf(q) !== -1; });
    });

    var listEl = document.getElementById('content-list');
    var innerEl = document.getElementById('content-list-inner');
    listEl.classList.remove('content-wide');

    var html = '';
    html += '<div class="search-results-header">\u041d\u0430\u0439\u0434\u0435\u043d\u043e: <strong>' + results.length + '</strong> \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u043e\u0432 \u043f\u043e \u0437\u0430\u043f\u0440\u043e\u0441\u0443 \u00ab' + escapeHtml(query) + '\u00bb</div>';

    if (results.length === 0) {
      html += '<div class="search-no-results">';
      html += '<i data-lucide="search-x"></i>';
      html += '<p>\u041d\u0438\u0447\u0435\u0433\u043e \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u043e</p>';
      html += '</div>';
    } else {
      html += '<div class="lessons-grid">';
      results.forEach(function(item, i) {
        var color = categoryColors[i % categoryColors.length];
        var progress = getProgress(item.id);
        var readTime = getReadTime(item.id);
        var typeTag = item.type === 'module'
          ? '<span class="tag tag-type interactive">\u0438\u043d\u0442\u0435\u0440\u0430\u043a\u0442\u0438\u0432</span>'
          : '<span class="tag tag-type">\u0443\u0440\u043e\u043a</span>';
        var timeTag = (item.type === 'lesson' && readTime)
          ? '<span class="tag tag-time">\u2248 ' + readTime + ' \u043c\u0438\u043d</span>' : '';
        var doneBadge = progress >= 100
          ? '<i data-lucide="check-circle" class="card-done-badge"></i>' : '';

        html += '<div class="lesson-card" data-id="' + escapeHtml(item.id) + '">';
        html += doneBadge;
        html += '<div class="lesson-icon" style="background:' + color.bg + ';">';
        html += '<i data-lucide="' + getItemIcon(item) + '" style="width:20px;height:20px;color:' + color.fg + ';"></i>';
        html += '</div>';
        html += '<div class="lesson-info">';
        html += '<div class="lesson-title">' + highlightMatch(item.title, query) + '</div>';
        if (item.description) {
          html += '<div class="lesson-desc">' + highlightMatch(item.description, query) + '</div>';
        }
        html += '<div class="lesson-tags-row">' + typeTag + timeTag;
        (item.tags || []).forEach(function(tag) {
          html += '<span class="tag">' + escapeHtml(tag) + '</span>';
        });
        html += '</div>';
        html += buildCardProgress(item.id, progress);
        html += '</div></div>';
      });
      html += '</div>';
    }

    innerEl.innerHTML = html;
    listEl.style.display = 'block';
    document.getElementById('content-page').style.display = 'none';
    currentItem = null;

    innerEl.querySelectorAll('.lesson-card').forEach(function(el) {
      el.addEventListener('click', function() { app.openItem(el.dataset.id); });
    });

    lucide.createIcons();
  }

  // Публичный API для вызова из onclick-обработчиков
  window.app = {
    openItem, filterCategory, filterSubcategory, showList, goBack, toggleSidebar,
    closeLightbox, lightboxPrev, lightboxNext, clearSearch, filterByTag,
  };

  // Запуск приложения
  init();
})();
