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

      // Подкатегории (всегда видны)
      if (hasSubs) {
        html += '<div class="sidebar-subcategories">';
        subKeys.forEach(sub => {
          const isSubActive = currentCategory === cat && currentSubcategory === sub;
          html += '<div class="sidebar-subcategory ' + (isSubActive ? 'active' : '') + '" ';
          html += 'onclick="app.filterSubcategory(\'' + escapeJs(cat) + '\', \'' + escapeJs(sub) + '\', this)">';
          html += '<span class="subcategory-bullet">—</span>';
          html += '<span class="subcategory-name">' + escapeHtml(sub) + '</span>';
          html += '<span class="sidebar-count">' + subs[sub].count + '</span>';
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
    const items = getItemsBySubcategory(category, subcategory);
    const icon = categoryIcons[category] || 'folder';

    let html = '';
    html += '<div class="section-header">';
    html += '<i data-lucide="' + icon + '" style="width:20px;height:20px;color:#4f46e5;"></i>';
    html += escapeHtml(category) + ' / ' + escapeHtml(subcategory);
    html += '</div>';

    html += '<div class="lessons-grid">';
    items.forEach((item, i) => {
      const color = categoryColors[i % categoryColors.length];
      const typeTag = item.type === 'module'
        ? '<span class="tag tag-type interactive">интерактив</span>'
        : '<span class="tag tag-type">урок</span>';

      html += '<div class="lesson-card" data-id="' + escapeHtml(item.id) + '">';
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

    listEl.innerHTML = html;
    listEl.style.display = 'block';
    document.getElementById('content-page').style.display = 'none';
    currentItem = null;

    // Делегирование событий для lesson-card
    listEl.querySelectorAll('.lesson-card').forEach(el => {
      el.addEventListener('click', () => app.openItem(el.dataset.id));
    });

    lucide.createIcons();
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

        html += '<div class="tile-card" data-id="' + escapeHtml(item.id) + '">';
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

    let html = '';
    html += '<div class="section-header">';
    html += '<i data-lucide="' + icon + '" style="width:20px;height:20px;color:' + catColor.fg + ';"></i>';
    html += escapeHtml(category);
    html += '</div>';

    subKeys.forEach(sub => {
      const items = subs[sub].items.sort((a, b) => a.title.localeCompare(b.title, 'ru'));

      // Заголовок подкатегории (не выводим если подкатегория одна и называется "Без подкатегории")
      const showSubHeader = !(subKeys.length === 1 && sub === 'Без подкатегории');
      if (showSubHeader) {
        html += '<div class="subcategory-group-header">' + escapeHtml(sub) + '</div>';
      }

      html += '<div class="lessons-grid">';
      items.forEach((item, i) => {
        const color = categoryColors[i % categoryColors.length];
        const typeTag = item.type === 'module'
          ? '<span class="tag tag-type interactive">интерактив</span>'
          : '<span class="tag tag-type">урок</span>';

        html += '<div class="lesson-card" data-id="' + escapeHtml(item.id) + '">';
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

    // Привязать лайтбокс к картинкам урока
    if (item.type === 'lesson') attachLightbox();

    lucide.createIcons();
    
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

  // Публичный API для вызова из onclick-обработчиков
  window.app = {
    openItem, filterCategory, filterSubcategory, showList, toggleSidebar,
    closeLightbox, lightboxPrev, lightboxNext,
  };

  // Запуск приложения
  init();
})();
