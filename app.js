// EduPlatform — клиентская логика
// Загружает catalog.json, строит sidebar и список материалов,
// рендерит Markdown через marked.js, HTML-модули через iframe

(function() {
  'use strict';

  // Состояние приложения
  let catalog = { lessons: [], modules: [] };
  let allItems = [];
  let currentCategory = 'all';
  let currentItem = null;

  // Цвета для иконок категорий
  const categoryColors = [
    { bg: '#e0e7ff', fg: '#4f46e5' },
    { bg: '#d1fae5', fg: '#059669' },
    { bg: '#fef3c7', fg: '#d97706' },
    { bg: '#fce7f3', fg: '#db2777' },
    { bg: '#e0f2fe', fg: '#0284c7' },
    { bg: '#f3e8ff', fg: '#7c3aed' },
  ];

  // Иконки Lucide для категорий
  const categoryIcons = {
    'Светотехника': 'lightbulb',
    'Обучение': 'graduation-cap',
    'Фронтенд': 'layout',
    'CAD': 'pen-tool',
    'Производство': 'factory',
    'Без категории': 'folder',
  };

  // Инициализация приложения
  async function init() {
    try {
      const response = await fetch('build/catalog.json');
      catalog = await response.json();
      allItems = [
        ...catalog.lessons.map(l => ({ ...l, type: 'lesson' })),
        ...catalog.modules.map(m => ({ ...m, type: 'module' })),
      ];
      renderSidebar();
      renderList();
      lucide.createIcons();
    } catch (err) {
      document.getElementById('content-list').innerHTML =
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

  // Получить элементы по категории
  function getItemsByCategory(category) {
    if (category === 'all') return allItems;
    return allItems.filter(item => item.category === category);
  }

  // Рендер боковой панели (sidebar)
  function renderSidebar() {
    const sidebar = document.getElementById('sidebar');
    const categories = getCategories();
    let html = '';

    // Раздел "Все материалы"
    html += '<div class="sidebar-section">';
    html += '<div class="sidebar-title">Все материалы</div>';
    html += '<div class="sidebar-item active" onclick="app.filterCategory(\'all\', this)">';
    html += '<i data-lucide="layers"></i> Все';
    html += '<span class="sidebar-count">' + allItems.length + '</span>';
    html += '</div>';
    html += '</div>';

    // Категории с вложенными элементами (по алфавиту)
    Object.keys(categories).sort().forEach(cat => {
      html += '<div class="sidebar-section">';
      html += '<div class="sidebar-title">' + escapeHtml(cat) + '</div>';

      const items = getItemsByCategory(cat);
      items.forEach(item => {
        const itemIcon = item.type === 'module' ? 'app-window' : 'file-text';
        html += '<div class="sidebar-lesson" data-id="' + item.id + '" onclick="app.openItem(\'' + item.id + '\', this)">';
        html += '<i data-lucide="' + itemIcon + '"></i> ';
        html += escapeHtml(item.title);
        html += '</div>';
      });

      html += '</div>';
    });

    sidebar.innerHTML = html;
  }

  // Рендер списка карточек материалов
  function renderList(category) {
    category = category || 'all';
    currentCategory = category;

    const listEl = document.getElementById('content-list');

    if (category === 'all') {
      // Вкладка "Все" — плитки 4 колонки, группировка по категориям
      listEl.classList.add('content-wide');
      renderTilesView(listEl);
    } else {
      // Конкретная категория — список карточек
      listEl.classList.remove('content-wide');
      renderCategoryList(listEl, category);
    }

    listEl.style.display = 'block';
    document.getElementById('content-page').style.display = 'none';
    currentItem = null;

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
        const typeTag = item.type === 'module'
          ? '<span class="tag tag-type interactive">интерактив</span>'
          : '<span class="tag tag-type">урок</span>';

        html += '<div class="tile-card" onclick="app.openItem(\'' + item.id + '\')">';
        html += '<div class="tile-icon" style="background:' + color.bg + ';">';
        html += '<i data-lucide="' + (categoryIcons[item.category] || 'file') + '" style="width:20px;height:20px;color:' + color.fg + ';"></i>';
        html += '</div>';
        html += '<div class="tile-title">' + escapeHtml(item.title) + '</div>';
        if (item.description) {
          html += '<div class="tile-desc">' + escapeHtml(item.description) + '</div>';
        }
        html += '<div class="tile-tags">' + typeTag;
        (item.tags || []).forEach(tag => {
          html += '<span class="tag">' + escapeHtml(tag) + '</span>';
        });
        html += '</div></div>';
      });
      html += '</div></div>';
    });

    container.innerHTML = html;
  }

  // Рендер списка карточек для конкретной категории
  function renderCategoryList(container, category) {
    const items = getItemsByCategory(category);
    const icon = categoryIcons[category] || 'folder';

    let html = '';
    html += '<div class="section-header">';
    html += '<i data-lucide="' + icon + '" style="width:20px;height:20px;color:#4f46e5;"></i>';
    html += escapeHtml(category);
    html += '</div>';

    html += '<div class="lessons-grid">';
    items.forEach((item, i) => {
      const color = categoryColors[i % categoryColors.length];
      const typeTag = item.type === 'module'
        ? '<span class="tag tag-type interactive">интерактив</span>'
        : '<span class="tag tag-type">урок</span>';

      html += '<div class="lesson-card" onclick="app.openItem(\'' + item.id + '\')">';
      html += '<div class="lesson-icon" style="background:' + color.bg + ';">';
      html += '<i data-lucide="' + (categoryIcons[item.category] || 'file') + '" style="width:20px;height:20px;color:' + color.fg + ';"></i>';
      html += '</div>';
      html += '<div class="lesson-info">';
      html += '<div class="lesson-title">' + escapeHtml(item.title) + '</div>';
      if (item.description) {
        html += '<div class="lesson-desc">' + escapeHtml(item.description) + '</div>';
      }
      html += '<div class="lesson-tags-row">' + typeTag;
      (item.tags || []).forEach(tag => {
        html += '<span class="tag">' + escapeHtml(tag) + '</span>';
      });
      html += '</div></div></div>';
    });
    html += '</div>';

    container.innerHTML = html;
  }

  // Открыть урок (Markdown) или модуль (iframe)
  async function openItem(id, sidebarEl) {
    const item = allItems.find(i => i.id === id);
    if (!item) return;

    currentItem = item;
    const pageEl = document.getElementById('content-page');
    let html = '';

    // Навигация "назад"
    html += '<div class="breadcrumb" onclick="app.showList()">';
    html += '<i data-lucide="arrow-left" style="width:14px;height:14px;"></i> Все материалы';
    html += '</div>';

    // Заголовок и теги
    html += '<div class="lesson-page-header">';
    html += '<h1>' + escapeHtml(item.title) + '</h1>';
    html += '<div class="lesson-page-tags">';
    const typeTag = item.type === 'module'
      ? '<span class="tag tag-type interactive">интерактив</span>'
      : '<span class="tag tag-type">урок</span>';
    html += typeTag;
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
        html += '<div class="md-body">' + marked.parse(md) + '</div>';
      } catch (err) {
        html += '<div class="loading">Ошибка загрузки файла</div>';
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

    lucide.createIcons();
  }

  // Фильтрация по категории (клик в sidebar)
  function filterCategory(category, el) {
    document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
    if (el) el.classList.add('active');
    renderList(category);
  }

  // Вернуться к списку материалов
  function showList() {
    renderList(currentCategory);
  }

  // Экранирование HTML-символов для защиты от XSS
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Публичный API для вызова из onclick-обработчиков
  window.app = { openItem, filterCategory, showList };

  // Запуск приложения
  init();
})();
