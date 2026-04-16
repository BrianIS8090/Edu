const { test, expect } = require('@playwright/test');

test('preview-редизайн открывает каталог и переключает режимы', async ({ page }) => {
  await page.goto('/index.html');

  await expect(page.getByRole('heading', { name: 'Все материалы' })).toBeVisible();
  await expect(page.getByPlaceholder('Поиск по материалам')).toBeVisible();

  await page.getByRole('button', { name: 'Доска' }).click();
  await expect(page.locator('[data-testid="board-grid"]')).toBeVisible();

  await page.getByRole('button', { name: 'Список' }).click();
  await expect(page.locator('[data-testid="catalog-list"]')).toBeVisible();
});

test('preview-редизайн держит поиск по центру верхнего хедера', async ({ page }) => {
  await page.goto('/index.html');

  const topbarBox = await page.locator('.topbar').boundingBox();
  const searchBox = await page.locator('.topbar-search').boundingBox();

  expect(topbarBox).not.toBeNull();
  expect(searchBox).not.toBeNull();

  const topbarCenter = topbarBox.x + topbarBox.width / 2;
  const searchCenter = searchBox.x + searchBox.width / 2;

  expect(Math.abs(topbarCenter - searchCenter)).toBeLessThan(8);
});

test('preview-редизайн фильтрует материалы поиском', async ({ page }) => {
  await page.goto('/index.html');

  await page.getByPlaceholder('Поиск по материалам').fill('OpenClaw');

  await expect(page.getByText('Установка и настройка OpenClaw')).toBeVisible();
  await expect(page.locator('[data-testid="results-counter"]')).toContainText('Найдено');
});

test('preview-редизайн показывает в карточках только заголовки без описания', async ({ page }) => {
  await page.goto('/index.html');

  await expect(page.locator('.item-subtitle')).toHaveCount(0);
});

test('preview-редизайн убирает маркер у начатого, но не дочитанного урока', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('progress_ии-и-агенты-инструменты-ии-оpenclaw', '50');
  });

  await page.goto('/index.html');

  const row = page.locator('.list-row:has-text("Установка и настройка OpenClaw")');

  await expect(row.locator('.status-dot')).toHaveCSS('opacity', '0');
  await expect(row.locator('.item-title')).toHaveCSS('color', 'rgb(25, 25, 25)');
});

test('preview-редизайн делает заголовок прочитанного урока серым', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('progress_ии-и-агенты-инструменты-ии-оpenclaw', '100');
  });

  await page.goto('/index.html');

  await expect(page.locator('.list-row:has-text("Установка и настройка OpenClaw") .item-title')).toHaveCSS('color', 'rgb(143, 142, 138)');
});

test('preview-редизайн не накладывает кнопку сворачивания на логотип в collapsed-sidebar', async ({ page }) => {
  await page.goto('/index.html');

  await page.getByRole('button', { name: 'Свернуть панель' }).click();

  const brandBox = await page.locator('.brand-mark').boundingBox();
  const toggleBox = await page.locator('#sidebarToggle').boundingBox();

  expect(brandBox).not.toBeNull();
  expect(toggleBox).not.toBeNull();

  const overlaps =
    brandBox.x < toggleBox.x + toggleBox.width &&
    brandBox.x + brandBox.width > toggleBox.x &&
    brandBox.y < toggleBox.y + toggleBox.height &&
    brandBox.y + brandBox.height > toggleBox.y;

  expect(overlaps).toBeFalsy();
});

test('preview-редизайн выравнивает карточки прогресса в collapsed-sidebar', async ({ page }) => {
  await page.goto('/index.html');

  await page.getByRole('button', { name: 'Свернуть панель' }).click();

  const sidebarBox = await page.locator('.sidebar').boundingBox();
  const firstTrackBox = await page.locator('.track-card').first().boundingBox();

  expect(sidebarBox).not.toBeNull();
  expect(firstTrackBox).not.toBeNull();

  const sidebarCenter = sidebarBox.x + sidebarBox.width / 2;
  const trackCenter = firstTrackBox.x + firstTrackBox.width / 2;

  expect(Math.abs(sidebarCenter - trackCenter)).toBeLessThan(6);
});

test('preview-редизайн открывает урок и возвращает в каталог', async ({ page }) => {
  await page.goto('/index.html');

  await page.getByText('Установка и настройка OpenClaw').click();

  await expect(page.getByRole('button', { name: 'Назад' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Установка и настройка OpenClaw' })).toBeVisible();

  await page.getByRole('button', { name: 'Назад' }).click();
  await expect(page.getByRole('heading', { name: 'Все материалы' })).toBeVisible();
});

test('preview-редизайн считает урок начатым сразу после открытия', async ({ page }) => {
  await page.goto('/index.html');

  await page.getByText('Установка и настройка OpenClaw').click();
  await expect(page.getByRole('heading', { name: 'Установка и настройка OpenClaw' })).toBeVisible();

  await page.getByRole('button', { name: 'Назад' }).click();

  const row = page.locator('.list-row:has-text("Установка и настройка OpenClaw")');

  await expect(row.locator('.status-dot')).toHaveCSS('opacity', '0');
  await expect(row.locator('.item-title')).toHaveCSS('color', 'rgb(25, 25, 25)');
});

test('preview-редизайн делает кнопку назад плавающей в уроке', async ({ page }) => {
  await page.goto('/index.html');

  await page.getByText('Установка и настройка OpenClaw').click();

  await expect(page.getByRole('button', { name: 'Назад' })).toHaveCSS('position', 'sticky');
  await expect(page.getByRole('button', { name: 'Назад' })).toHaveCSS('top', '16px');
  await expect(page.getByRole('button', { name: 'Назад' })).toHaveCSS('justify-self', 'start');

  const backButtonBox = await page.getByRole('button', { name: 'Назад' }).boundingBox();

  expect(backButtonBox).not.toBeNull();
  expect(backButtonBox.width).toBeLessThan(140);
});

test('preview-редизайн убирает рамку и тень у картинок в статье', async ({ page }) => {
  await page.goto('/index.html');

  await page.getByText('Работа с архитектором на этапе проектирования').click();

  const lessonImage = page.locator('.md-body img').first();

  await expect(lessonImage).toBeVisible();
  await expect(lessonImage).toHaveCSS('border-top-style', 'none');
  await expect(lessonImage).toHaveCSS('box-shadow', 'none');
});

test('preview-редизайн показывает компактное продолжение чтения', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lastRead', JSON.stringify({
      id: 'ии-и-агенты-инструменты-ии-оpenclaw',
      title: 'Установка и настройка OpenClaw',
      progress: 42
    }));
  });

  await page.goto('/index.html');

  await expect(page.locator('[data-testid="continue-strip"]')).toContainText('Продолжить чтение');
  await expect(page.locator('[data-testid="continue-strip"]')).toContainText('42%');
});

test('preview-редизайн открывает интерактивный модуль', async ({ page }) => {
  await page.goto('/index.html');

  await page.getByText('Калькулятор радиатора').click();

  await expect(page.getByRole('heading', { name: 'Калькулятор радиатора' })).toBeVisible();
  await expect(page.locator('iframe.module-frame')).toBeVisible();
});

test('index-v2 показывает экран авторизации Firebase', async ({ page }) => {
  // Мокаем Firebase SDK чтобы не зависеть от реального сервиса
  await page.addInitScript(() => {
    window.firebase = {
      initializeApp: function() {},
      auth: function() {
        return {
          onAuthStateChanged: function(cb) { cb(null); },
          signInWithPopup: function() { return Promise.resolve(); },
          signOut: function() { return Promise.resolve(); }
        };
      },
      firestore: function() { return {}; }
    };
    window.firebase.auth.GoogleAuthProvider = function() {};
    window.firebase.firestore = Object.assign(window.firebase.firestore, {
      FieldValue: { serverTimestamp: function() { return new Date(); } },
      Timestamp: { now: function() { return new Date(); } }
    });
  });

  await page.goto('/index-v2.html');

  // Экран авторизации должен быть виден
  await expect(page.locator('#authOverlay')).toBeVisible();
  await expect(page.getByText('Войти через Google')).toBeVisible();
  await expect(page.getByText('Обучающая платформа Group 7Lamp')).toBeVisible();

  // Приложение должно быть скрыто
  await expect(page.locator('.app-shell')).toBeHidden();
});
