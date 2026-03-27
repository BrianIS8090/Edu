# EduPlatform — План реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Создать обучающую платформу, которая автоматически строит каталог из Markdown-уроков и HTML-модулей.

**Architecture:** SPA на чистом HTML/CSS/JS. Скрипт `build-catalog.sh` парсит frontmatter из Markdown-файлов и генерирует `catalog.json`. Клиент загружает `catalog.json`, строит sidebar и список материалов, рендерит Markdown через marked.js, HTML-модули встраивает через iframe.

**Tech Stack:** HTML/CSS/JS (vanilla), marked.js (CDN), Lucide icons (CDN), bash (скрипт сборки), GitHub Actions (CI/CD), Nginx (Pi5).

---

### Task 1: Подготовить структуру папок и перенести существующие файлы

**Files:**
- Create: `modules/` (директория)
- Create: `assets/` (директория)
- Create: `build/` (директория)
- Create: `scripts/` (директория)
- Move: `heatsink_calc.html` → `modules/heatsink-calc/index.html`
- Move: `color_science.html` → `modules/color-science/index.html`
- Move: `dimming-visualization.html` → `modules/dimming-visualization/index.html`
- Move: `pwm_dimming.html` → `modules/pwm-dimming/index.html`
- Move: `optics_guide.html` → `modules/optics-guide/index.html`
- Move: `ip_ik_classifier.html` → `modules/ip-ik-classifier/index.html`
- Move: `led_conn2.html` → `modules/led-connection/index.html`
- Move: `lighting_systems_diagrams.html` → `modules/lighting-systems/index.html`

- [ ] **Step 1: Создать директории**

```bash
mkdir -p modules assets build scripts
```

- [ ] **Step 2: Перенести HTML-модули в папки**

```bash
mkdir -p modules/heatsink-calc modules/color-science modules/dimming-visualization modules/pwm-dimming modules/optics-guide modules/ip-ik-classifier modules/led-connection modules/lighting-systems

mv heatsink_calc.html modules/heatsink-calc/index.html
mv color_science.html modules/color-science/index.html
mv dimming-visualization.html modules/dimming-visualization/index.html
mv pwm_dimming.html modules/pwm-dimming/index.html
mv optics_guide.html modules/optics-guide/index.html
mv ip_ik_classifier.html modules/ip-ik-classifier/index.html
mv led_conn2.html modules/led-connection/index.html
mv lighting_systems_diagrams.html modules/lighting-systems/index.html
```

- [ ] **Step 3: Создать meta.md для каждого модуля**

`modules/heatsink-calc/meta.md`:
```markdown
---
title: Калькулятор радиатора
category: Светотехника
tags: [тепло, радиатор, LED]
---

Интерактивный калькулятор для расчёта площади радиатора LED-светильника.
```

`modules/color-science/meta.md`:
```markdown
---
title: Цветовая наука
category: Светотехника
tags: [цвет, CIE, MacAdam, спектр]
---

Интерактивный справочник: CIE диаграмма, цветовая температура, эллипсы Макадама, спектры LED.
```

`modules/dimming-visualization/meta.md`:
```markdown
---
title: Визуализация диммирования
category: Светотехника
tags: [диммирование, цветовые пространства]
---

Интерактивные визуализации диммирования и цветовых пространств.
```

`modules/pwm-dimming/meta.md`:
```markdown
---
title: ШИМ-диммирование
category: Светотехника
tags: [ШИМ, диммирование, анимация]
---

Анимация и кривые ШИМ-сигналов для управления яркостью LED.
```

`modules/optics-guide/meta.md`:
```markdown
---
title: Оптика светильников
category: Светотехника
tags: [оптика, линзы, углы]
---

Справочник по типам и углам оптики для светильников.
```

`modules/ip-ik-classifier/meta.md`:
```markdown
---
title: Классификатор IP/IK
category: Светотехника
tags: [IP, IK, защита]
---

Интерактивный классификатор степеней защиты IP и IK.
```

`modules/led-connection/meta.md`:
```markdown
---
title: Подключение LED-плат
category: Светотехника
tags: [монтаж, LED, схемы]
---

Схемы и инструкции по подключению LED-плат к драйверам.
```

`modules/lighting-systems/meta.md`:
```markdown
---
title: Схемы систем освещения
category: Светотехника
tags: [системы, DALI, RGBW, RGB]
---

Интерактивный справочник по типам светотехнических систем.
```

- [ ] **Step 4: Добавить frontmatter к существующим урокам**

`lessons/план_обучения_инженер_проектировщик.md` — добавить в начало файла:
```markdown
---
title: Памятка для инженера-проектировщика
category: Обучение
tags: [onboarding, CAD, светотехника, производство]
---
```

`lessons/Designing delightful frontends with GPT-5.4.md` — добавить в начало файла:
```markdown
---
title: Designing delightful frontends with GPT-5.4
category: Фронтенд
tags: [frontend, GPT, дизайн, UI]
---
```

- [ ] **Step 5: Коммит**

```bash
git add modules/ lessons/ assets/ build/ scripts/
git commit -m "feat: подготовить структуру папок для EduPlatform"
```

---

### Task 2: Написать скрипт сборки catalog.json

**Files:**
- Create: `scripts/build-catalog.sh`

- [ ] **Step 1: Создать скрипт build-catalog.sh**

`scripts/build-catalog.sh`:
```bash
#!/bin/bash
# Скрипт сборки catalog.json из frontmatter Markdown-файлов
# Парсит lessons/*.md и modules/*/meta.md
# Не требует внешних зависимостей кроме bash, sed, grep

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="$REPO_ROOT/build"
LESSONS_DIR="$REPO_ROOT/lessons"
MODULES_DIR="$REPO_ROOT/modules"
OUTPUT="$BUILD_DIR/catalog.json"

mkdir -p "$BUILD_DIR"

# Парсинг frontmatter из файла
# Возвращает значение поля по имени
get_field() {
  local file="$1"
  local field="$2"
  # Извлекаем блок между --- и ---
  sed -n '/^---$/,/^---$/p' "$file" | grep "^${field}:" | sed "s/^${field}:[[:space:]]*//"
}

# Парсинг тегов из строки формата [tag1, tag2, tag3]
get_tags_json() {
  local raw="$1"
  # Убираем квадратные скобки и разделяем по запятой
  echo "$raw" | sed 's/^\[//;s/\]$//' | awk -F',' '{
    printf "["
    for(i=1;i<=NF;i++) {
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", $i)
      if (i>1) printf ","
      printf "\"%s\"", $i
    }
    printf "]"
  }'
}

# ID из имени файла/папки
make_id() {
  local name="$1"
  echo "$name" | sed 's/\.md$//' | sed 's/[[:space:]]/-/g' | tr '[:upper:]' '[:lower:]'
}

# Получить описание (первый параграф после frontmatter)
get_description() {
  local file="$1"
  # Пропускаем frontmatter, берём первую непустую строку
  sed '1,/^---$/d' "$file" | sed '1,/^---$/d' | sed '/^$/d' | sed '/^#/d' | head -1 | sed 's/^[[:space:]]*//'
}

echo "{"

# === Уроки ===
echo '  "lessons": ['
first=true
if [ -d "$LESSONS_DIR" ]; then
  for file in "$LESSONS_DIR"/*.md; do
    [ -f "$file" ] || continue

    title=$(get_field "$file" "title")
    category=$(get_field "$file" "category")
    tags_raw=$(get_field "$file" "tags")

    # Если нет frontmatter — используем имя файла
    basename_file=$(basename "$file" .md)
    [ -z "$title" ] && title="$basename_file"
    [ -z "$category" ] && category="Без категории"
    [ -z "$tags_raw" ] && tags_raw="[]"

    id=$(make_id "$basename_file")
    tags_json=$(get_tags_json "$tags_raw")
    description=$(get_description "$file")

    if [ "$first" = true ]; then
      first=false
    else
      echo ","
    fi

    printf '    {"id":"%s","title":"%s","category":"%s","tags":%s,"type":"lesson","file":"lessons/%s","description":"%s"}' \
      "$id" "$title" "$category" "$tags_json" "$(basename "$file")" "$description"
  done
fi
echo ""
echo "  ],"

# === Модули ===
echo '  "modules": ['
first=true
if [ -d "$MODULES_DIR" ]; then
  for dir in "$MODULES_DIR"/*/; do
    [ -d "$dir" ] || continue
    [ -f "$dir/index.html" ] || continue

    meta_file="$dir/meta.md"
    dirname_module=$(basename "$dir")

    if [ -f "$meta_file" ]; then
      title=$(get_field "$meta_file" "title")
      category=$(get_field "$meta_file" "category")
      tags_raw=$(get_field "$meta_file" "tags")
      description=$(get_description "$meta_file")
    else
      title=""
      category=""
      tags_raw="[]"
      description=""
    fi

    [ -z "$title" ] && title="$dirname_module"
    [ -z "$category" ] && category="Без категории"
    [ -z "$tags_raw" ] && tags_raw="[]"

    id=$(make_id "$dirname_module")
    tags_json=$(get_tags_json "$tags_raw")

    if [ "$first" = true ]; then
      first=false
    else
      echo ","
    fi

    printf '    {"id":"%s","title":"%s","category":"%s","tags":%s,"type":"module","path":"modules/%s/","description":"%s"}' \
      "$id" "$title" "$category" "$tags_json" "$dirname_module" "$description"
  done
fi
echo ""
echo "  ]"

echo "}"
```

- [ ] **Step 2: Сделать скрипт исполняемым и протестировать**

```bash
chmod +x scripts/build-catalog.sh
bash scripts/build-catalog.sh > build/catalog.json
cat build/catalog.json
```

Ожидаемый результат: валидный JSON с 2 записями в `lessons` и 8 записями в `modules`.

- [ ] **Step 3: Проверить JSON на валидность**

```bash
python3 -c "import json; json.load(open('build/catalog.json')); print('JSON валиден')"
```

Ожидаемый результат: `JSON валиден`

- [ ] **Step 4: Коммит**

```bash
git add scripts/build-catalog.sh build/catalog.json
git commit -m "feat: добавить скрипт сборки catalog.json"
```

---

### Task 3: Создать index.html — каркас и стили

**Files:**
- Create: `index.html` (новый, заменяет текущий)

- [ ] **Step 1: Сохранить текущий index.html**

```bash
mv index.html index-old.html
```

- [ ] **Step 2: Создать новый index.html — HTML-структура и CSS**

`index.html`:
```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EduPlatform</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%234f46e5' stroke-width='2'><path d='M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z'/><path d='M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z'/></svg>">
  <script src="https://unpkg.com/lucide@latest"></script>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, 'Segoe UI', sans-serif;
      background: #f5f5f5; color: #111;
    }

    /* Хедер */
    .header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 24px; background: #fff; border-bottom: 1px solid #e5e7eb;
      position: fixed; top: 0; left: 0; right: 0; z-index: 10; height: 52px;
    }
    .header-logo {
      font-weight: 700; font-size: 16px;
      display: flex; align-items: center; gap: 8px; color: #111;
    }

    /* Основной layout */
    .main { display: flex; margin-top: 52px; min-height: calc(100vh - 52px); }

    /* Sidebar */
    .sidebar {
      width: 260px; background: #fff; border-right: 1px solid #e5e7eb;
      padding: 20px 0; position: fixed; top: 52px; bottom: 0; overflow-y: auto;
    }
    .sidebar-section { margin-bottom: 20px; }
    .sidebar-title {
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.5px; color: #999; padding: 0 20px; margin-bottom: 8px;
    }
    .sidebar-item {
      display: flex; align-items: center; gap: 8px; padding: 7px 20px;
      font-size: 13px; color: #555; cursor: pointer; transition: all 0.15s;
    }
    .sidebar-item:hover { background: #f9fafb; color: #111; }
    .sidebar-item.active { background: #f0f0ff; color: #4f46e5; font-weight: 500; }
    .sidebar-item i { width: 16px; height: 16px; flex-shrink: 0; }
    .sidebar-count { margin-left: auto; font-size: 11px; color: #bbb; }

    .sidebar-lesson {
      display: flex; align-items: center; gap: 8px; padding: 6px 20px 6px 32px;
      font-size: 12px; color: #666; cursor: pointer; transition: all 0.15s;
      border-left: 2px solid transparent;
    }
    .sidebar-lesson:hover { background: #f9fafb; color: #111; }
    .sidebar-lesson.active {
      color: #4f46e5; font-weight: 500;
      border-left-color: #4f46e5; background: #f8f7ff;
    }
    .sidebar-lesson i { width: 14px; height: 14px; flex-shrink: 0; }

    /* Контент */
    .content-wrapper {
      flex: 1; margin-left: 260px;
      display: flex; justify-content: center;
    }
    .content { width: 100%; max-width: 760px; padding: 32px 48px; }

    /* Карточки уроков */
    .lessons-grid { display: flex; flex-direction: column; gap: 12px; }
    .lesson-card {
      display: flex; align-items: center; gap: 16px; padding: 16px 20px;
      background: #fff; border: 1px solid #e5e7eb; border-radius: 8px;
      cursor: pointer; transition: all 0.15s;
    }
    .lesson-card:hover {
      border-color: #c7d2fe;
      box-shadow: 0 2px 8px rgba(79,70,229,0.06);
    }
    .lesson-icon {
      width: 40px; height: 40px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .lesson-info { flex: 1; min-width: 0; }
    .lesson-title { font-size: 14px; font-weight: 600; color: #111; margin-bottom: 4px; }
    .lesson-desc { font-size: 12px; color: #888; margin-bottom: 6px; }
    .lesson-tags-row { display: flex; gap: 4px; flex-wrap: wrap; }
    .tag { font-size: 11px; padding: 2px 8px; border-radius: 12px; background: #f3f4f6; color: #666; }
    .tag-type { background: #e0e7ff; color: #4f46e5; font-weight: 500; }
    .tag-type.interactive { background: #ecfdf5; color: #059669; }

    /* Страница урока */
    .lesson-page { display: none; }
    .breadcrumb {
      font-size: 13px; color: #888; margin-bottom: 16px;
      display: flex; align-items: center; gap: 6px; cursor: pointer;
    }
    .breadcrumb:hover { color: #4f46e5; }
    .lesson-page-header { margin-bottom: 24px; }
    .lesson-page-header h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; line-height: 1.3; }
    .lesson-page-tags { display: flex; gap: 6px; flex-wrap: wrap; }

    /* Markdown рендер */
    .md-body { font-size: 15px; line-height: 1.75; color: #333; }
    .md-body h1 { font-size: 22px; font-weight: 700; margin: 28px 0 12px; color: #111; }
    .md-body h2 {
      font-size: 18px; font-weight: 600; margin: 28px 0 12px; color: #111;
      padding-bottom: 6px; border-bottom: 1px solid #e5e7eb;
    }
    .md-body h3 { font-size: 15px; font-weight: 600; margin: 20px 0 8px; color: #222; }
    .md-body p { margin-bottom: 14px; }
    .md-body ul, .md-body ol { padding-left: 24px; margin-bottom: 14px; }
    .md-body li { margin-bottom: 6px; }
    .md-body a { color: #4f46e5; text-decoration: none; }
    .md-body a:hover { text-decoration: underline; }
    .md-body img { max-width: 100%; border-radius: 8px; margin: 16px 0; border: 1px solid #e5e7eb; }
    .md-body code {
      background: #f3f4f6; padding: 2px 6px; border-radius: 4px;
      font-size: 13px; font-family: 'JetBrains Mono', monospace;
    }
    .md-body pre {
      background: #1e1e2e; color: #cdd6f4; padding: 16px;
      border-radius: 8px; margin: 16px 0; overflow-x: auto;
    }
    .md-body pre code { background: none; padding: 0; color: inherit; }
    .md-body hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
    .md-body strong { font-weight: 600; color: #111; }
    .md-body blockquote {
      border-left: 3px solid #4f46e5; padding-left: 16px;
      margin: 16px 0; color: #666;
    }

    /* iframe для модулей */
    .module-frame {
      width: 100%; height: 80vh;
      border: 1px solid #e5e7eb; border-radius: 8px; margin-top: 8px;
    }

    .section-header {
      font-size: 18px; font-weight: 600; color: #111; margin-bottom: 16px;
      display: flex; align-items: center; gap: 8px;
    }

    /* Состояние загрузки */
    .loading {
      display: flex; align-items: center; justify-content: center;
      min-height: 200px; color: #999; font-size: 14px;
    }
  </style>
</head>
<body>

  <!-- Хедер -->
  <div class="header">
    <div class="header-logo">
      <i data-lucide="book-open" style="width:20px;height:20px;color:#4f46e5;"></i>
      EduPlatform
    </div>
  </div>

  <div class="main">
    <!-- Sidebar -->
    <div class="sidebar" id="sidebar">
      <div class="loading">Загрузка...</div>
    </div>

    <div class="content-wrapper">
      <!-- Список материалов -->
      <div class="content" id="content-list">
        <div class="loading">Загрузка каталога...</div>
      </div>

      <!-- Страница урока/модуля (динамическая) -->
      <div class="content lesson-page" id="content-page"></div>
    </div>
  </div>

  <script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 3: Коммит**

```bash
git add index.html index-old.html
git commit -m "feat: создать каркас index.html для EduPlatform"
```

---

### Task 4: Создать app.js — логика платформы

**Files:**
- Create: `app.js`

- [ ] **Step 1: Создать app.js**

`app.js`:
```javascript
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

  // Иконки для категорий (можно расширять)
  const categoryIcons = {
    'Светотехника': 'lightbulb',
    'Обучение': 'graduation-cap',
    'Фронтенд': 'layout',
    'CAD': 'pen-tool',
    'Производство': 'factory',
    'Без категории': 'folder',
  };

  // Инициализация
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

  // Получить уникальные категории с количеством
  function getCategories() {
    const cats = {};
    allItems.forEach(item => {
      const cat = item.category || 'Без категории';
      cats[cat] = (cats[cat] || 0) + 1;
    });
    return cats;
  }

  // Получить элементы категории
  function getItemsByCategory(category) {
    if (category === 'all') return allItems;
    return allItems.filter(item => item.category === category);
  }

  // Рендер sidebar
  function renderSidebar() {
    const sidebar = document.getElementById('sidebar');
    const categories = getCategories();
    let html = '';

    // Все материалы
    html += '<div class="sidebar-section">';
    html += '<div class="sidebar-title">Все материалы</div>';
    html += '<div class="sidebar-item active" onclick="app.filterCategory(\'all\', this)">';
    html += '<i data-lucide="layers"></i> Все';
    html += '<span class="sidebar-count">' + allItems.length + '</span>';
    html += '</div>';
    html += '</div>';

    // Категории с элементами
    Object.keys(categories).forEach(cat => {
      const icon = categoryIcons[cat] || 'folder';
      html += '<div class="sidebar-section">';
      html += '<div class="sidebar-title">' + cat + '</div>';

      // Элементы этой категории
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

  // Рендер списка карточек
  function renderList(category) {
    category = category || 'all';
    currentCategory = category;
    const items = getItemsByCategory(category);
    const title = category === 'all' ? 'Все материалы' : category;
    const icon = category === 'all' ? 'layers' : (categoryIcons[category] || 'folder');

    let html = '';
    html += '<div class="section-header">';
    html += '<i data-lucide="' + icon + '" style="width:20px;height:20px;color:#4f46e5;"></i>';
    html += escapeHtml(title);
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

    const listEl = document.getElementById('content-list');
    listEl.innerHTML = html;
    listEl.style.display = 'block';
    document.getElementById('content-page').style.display = 'none';
    currentItem = null;

    // Сбросить активный элемент в sidebar
    document.querySelectorAll('.sidebar-lesson').forEach(l => l.classList.remove('active'));
    lucide.createIcons();
  }

  // Открыть урок или модуль
  async function openItem(id, sidebarEl) {
    const item = allItems.find(i => i.id === id);
    if (!item) return;

    currentItem = item;
    const pageEl = document.getElementById('content-page');
    let html = '';

    html += '<div class="breadcrumb" onclick="app.showList()">';
    html += '<i data-lucide="arrow-left" style="width:14px;height:14px;"></i> Все материалы';
    html += '</div>';

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
      // Загрузить и отрендерить Markdown
      try {
        const response = await fetch(item.file);
        let md = await response.text();
        // Убрать frontmatter
        md = md.replace(/^---[\s\S]*?---\s*/, '');
        html += '<div class="md-body">' + marked.parse(md) + '</div>';
      } catch (err) {
        html += '<div class="loading">Ошибка загрузки файла</div>';
      }
    } else {
      // HTML-модуль в iframe
      html += '<iframe class="module-frame" src="' + item.path + 'index.html"></iframe>';
    }

    pageEl.innerHTML = html;
    pageEl.style.display = 'block';
    document.getElementById('content-list').style.display = 'none';

    // Подсветить в sidebar
    document.querySelectorAll('.sidebar-lesson').forEach(l => l.classList.remove('active'));
    const sidebarItem = document.querySelector('.sidebar-lesson[data-id="' + id + '"]');
    if (sidebarItem) sidebarItem.classList.add('active');

    lucide.createIcons();
  }

  // Фильтр по категории
  function filterCategory(category, el) {
    document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
    if (el) el.classList.add('active');
    renderList(category);
  }

  // Показать список
  function showList() {
    renderList(currentCategory);
  }

  // Экранирование HTML
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Публичный API
  window.app = { openItem, filterCategory, showList };

  // Запуск
  init();
})();
```

- [ ] **Step 2: Проверить что страница загружается и рендерит каталог**

Открыть `index.html` через локальный сервер (или `python3 -m http.server 8080`) и проверить:
- sidebar показывает категории и список материалов
- клик на карточку открывает урок (Markdown рендерится)
- клик на модуль открывает iframe
- кнопка "Все материалы" возвращает к списку

```bash
python3 -m http.server 8080
```

- [ ] **Step 3: Коммит**

```bash
git add app.js
git commit -m "feat: добавить клиентскую логику EduPlatform"
```

---

### Task 5: Обновить CI/CD — добавить шаг сборки catalog.json

**Files:**
- Modify: `.github/workflows/deploy-pi.yml`

- [ ] **Step 1: Обновить deploy-pi.yml**

`.github/workflows/deploy-pi.yml`:
```yaml
name: Deploy to Pi5

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: [self-hosted, pi5]
    steps:
      - name: Обновить код
        run: |
          cd /home/brian/apps/edu
          git pull origin main

      - name: Собрать catalog.json
        run: |
          cd /home/brian/apps/edu
          bash scripts/build-catalog.sh > build/catalog.json

      - name: Деплой в Nginx
        run: |
          sudo rsync -a /home/brian/apps/edu/ /var/www/edu/ --exclude .git
          echo "Деплой завершён: $(date)"
```

- [ ] **Step 2: Коммит**

```bash
git add .github/workflows/deploy-pi.yml
git commit -m "feat: добавить сборку catalog.json в CI/CD"
```

---

### Task 6: Финальная проверка и очистка

**Files:**
- Delete: `index-old.html` (после проверки)

- [ ] **Step 1: Собрать catalog.json локально и проверить**

```bash
bash scripts/build-catalog.sh > build/catalog.json
cat build/catalog.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'Уроков: {len(d[\"lessons\"])}, Модулей: {len(d[\"modules\"])}')"
```

Ожидаемый результат: `Уроков: 2, Модулей: 8`

- [ ] **Step 2: Запустить локальный сервер и протестировать**

```bash
python3 -m http.server 8080
```

Проверить в браузере http://localhost:8080:
- [ ] Sidebar отображает категории с правильным количеством
- [ ] Клик на категорию фильтрует список
- [ ] Клик на Markdown-урок — рендерит контент, ссылки кликабельны
- [ ] Клик на интерактивный модуль — открывает iframe
- [ ] Кнопка "Все материалы" возвращает к списку
- [ ] Sidebar подсвечивает текущий элемент

- [ ] **Step 3: Удалить старый index.html**

```bash
rm index-old.html
```

- [ ] **Step 4: Добавить build/ в .gitignore (catalog.json генерируется, не хранится)**

Создать `.gitignore`:
```
build/catalog.json
.superpowers/
```

- [ ] **Step 5: Финальный коммит**

```bash
git add .gitignore
git add -A
git commit -m "feat: EduPlatform — обучающая платформа готова к работе"
```
