# Firebase-интеграция EduPlatform

## Что было сделано

### Авторизация (Firebase Auth)
- Вход только через Google-аккаунт — без авторизации платформа недоступна
- Экран входа: логотип, название, кнопка "Войти через Google"
- Профиль пользователя в topbar: аватар + кнопка "Выйти"
- Firebase-проект: **edu7lamp**

### Хранение прогресса (Firestore)
- Прогресс чтения каждого урока сохраняется в Firestore (не в localStorage)
- Один документ на пользователя: `users/{uid}` с полем `progress` (map)
- Синхронизация между устройствами — войди с любого браузера и увидишь свой прогресс
- Debounced-запись (500мс) — не грузит Firestore при каждом пикселе скролла
- Security rules: пользователь видит/пишет только свои данные

### Бейдж "Новое"
- На карточках материалов появляется бейдж "Новое" если:
  1. Материал добавлен или обновлён **после** последнего визита пользователя
  2. Пользователь его ещё **не прочитал**
- После прочтения бейдж исчезает
- Дата обновления (`lastUpdated`) берётся из git-истории автоматически

### Технические изменения
- `firebase-auth.js` — модуль авторизации (Google Sign-In, auth guard)
- `firebase-progress.js` — модуль Firestore (CRUD прогресса, провайдер)
- `app-v2.js` — рефакторинг: pluggable `progressProvider` (Firestore или localStorage fallback)
- `index.html` / `index-v2.html` — Firebase SDK (CDN), auth overlay, профиль в topbar
- `styles-v2.css` — стили auth overlay, бейджа, аватара
- `build-catalog.sh` / `.ps1` — поле `lastUpdated` из `git log`
- `firestore.rules` — правила безопасности
- `firebase.json` — конфигурация Firebase-проекта

---

## Архитектура деплоя

EduPlatform деплоится на **три** платформы параллельно:

```
git push (main) → GitHub Actions запускает 3 workflow:
│
├── deploy-pi.yml      → Pi5 (Nginx, self-hosted runner)
├── deploy-pages.yml   → GitHub Pages
└── deploy-firebase.yml → Firebase Hosting (edu7lamp.web.app)
```

### 1. Raspberry Pi 5 (основной production)
- **URL:** внутренний IP / домен Pi5
- **Workflow:** `.github/workflows/deploy-pi.yml`
- **Как работает:** self-hosted runner на Pi5 делает `git pull` → собирает catalog.json → rsync в `/var/www/edu/`
- **Секреты:** не нужны (runner уже на Pi5)

### 2. GitHub Pages
- **URL:** `https://<username>.github.io/Edu/`
- **Workflow:** `.github/workflows/deploy-pages.yml`
- **Как работает:** checkout → собирает catalog.json → upload-pages-artifact → deploy-pages
- **Секреты:** не нужны (используется GITHUB_TOKEN)

### 3. Firebase Hosting
- **URL:** https://edu7lamp.web.app
- **Workflow:** `.github/workflows/deploy-firebase.yml`
- **Как работает:** checkout → собирает catalog.json → деплоит Firestore Rules + Hosting
- **Секреты:** нужен `FIREBASE_SERVICE_ACCOUNT_EDU7LAMP` (см. настройку ниже)

---

## Настройка секрета для Firebase CI/CD

Для автоматического деплоя на Firebase нужно создать сервисный аккаунт и добавить его ключ в GitHub Secrets.

### Шаг 1: Создать сервисный аккаунт

1. Открой [Google Cloud Console → IAM](https://console.cloud.google.com/iam-admin/serviceaccounts?project=edu7lamp)
2. Нажми **"Create Service Account"**
3. Имя: `github-actions-deploy`
4. Нажми **"Create and Continue"**
5. Добавь роли:
   - `Firebase Hosting Admin`
   - `Cloud Datastore User` (для Firestore Rules)
   - `Service Account User`
6. Нажми **"Done"**

### Шаг 2: Создать JSON-ключ

1. Кликни на созданный аккаунт `github-actions-deploy`
2. Вкладка **"Keys"** → **"Add Key"** → **"Create new key"**
3. Формат: **JSON**
4. Скачается файл `edu7lamp-xxxx.json`

### Шаг 3: Добавить секрет в GitHub

1. Открой репозиторий на GitHub → **Settings** → **Secrets and variables** → **Actions**
2. Нажми **"New repository secret"**
3. Имя: `FIREBASE_SERVICE_ACCOUNT_EDU7LAMP`
4. Значение: вставь **всё содержимое** скачанного JSON-файла
5. Нажми **"Add secret"**
6. **Удали** скачанный JSON-файл с диска (он больше не нужен)

После этого каждый push в `main` автоматически задеплоит на Firebase.

---

## Авторизованные домены

Firebase Auth требует, чтобы домены, с которых идёт авторизация, были в whitelist.

Текущие авторизованные домены:
- `localhost` (локальная разработка)
- `edu7lamp.firebaseapp.com`
- `edu7lamp.web.app`
- `brianis8090.github.io` (GitHub Pages)

**Если добавляешь новый домен** (например, домен Pi5):
1. Открой [Firebase Console → Authentication → Settings](https://console.firebase.google.com/project/edu7lamp/authentication/settings)
2. Раздел **"Authorized domains"**
3. Нажми **"Add domain"**
4. Введи домен (например `edu.7lamp.ru` или IP-адрес)

---

## Raspberry Pi 5 (HTTP)

Google Sign-In **требует HTTPS** на всех доменах кроме `localhost`. Pi5 обслуживает Edu по HTTP (`http://192.168.0.119/edu/`), поэтому Firebase Auth на Pi5 **автоматически пропускается**.

Поведение на Pi5:
- Auth overlay не показывается
- Приложение работает через **localStorage** (как было до Firebase)
- Прогресс **не синхронизируется** между устройствами
- В консоли сообщение: `Firebase Auth пропущен: Google Sign-In требует HTTPS`

Для полноценной авторизации на Pi5 нужно настроить HTTPS (например через Tailscale HTTPS или Let's Encrypt). После этого добавить домен Pi5 в Firebase authorized domains.

---

## Локальная разработка

```bash
# 1. Пересобрать каталог
.\scripts\build-catalog.ps1

# 2. Запустить локальный сервер
npx serve . -l 8080

# 3. Открыть в браузере
# http://localhost:8080          — с Firebase-авторизацией
# http://localhost:8080/index.html — с Firebase-авторизацией
```

---

## Структура данных Firestore

Каждый пользователь — один документ:

```
users/{uid}
├── displayName: "Илмир"
├── email: "ilmir8090@gmail.com"
├── photoURL: "https://..."
├── lastVisit: Timestamp         // предыдущая сессия
├── currentVisit: Timestamp      // текущая сессия
├── progress: {                  // Map — ключи = ID материала
│   ├── "проекты-1-этап-...": {
│   │   ├── percent: 85
│   │   └── readAt: null
│   ├── "светотехника-нормы-...": {
│   │   ├── percent: 100
│   │   └── readAt: Timestamp
│   }
├── lastRead: {
│   ├── id: "проекты-1-этап-..."
│   ├── title: "Анализ ТЗ"
│   └── progress: 85
│   }
```

**Security rules** (`firestore.rules`):
- Пользователь может читать/писать **только свой** документ
- Всё остальное запрещено

---

## Файлы Firebase

| Файл | Назначение |
|------|-----------|
| `firebase.json` | Конфигурация Firebase-проекта (Firestore, Auth, Hosting) |
| `firestore.rules` | Правила безопасности Firestore |
| `firestore.indexes.json` | Индексы Firestore (пустые) |
| `.firebaserc` | Привязка к проекту edu7lamp |
| `firebase-auth.js` | Клиентский модуль авторизации |
| `firebase-progress.js` | Клиентский модуль прогресса (Firestore) |

---

## FAQ

**Q: Можно ли откатить на localStorage без Firebase?**
A: Да. Удали скрипты `firebase-auth.js` и `firebase-progress.js` из `index.html`. Приложение автоматически переключится на localStorage-fallback.

**Q: Что если Firestore недоступен?**
A: Ошибки записи логируются в консоль. Неудачные обновления ставятся в очередь и повторяются. Прогресс в памяти не теряется до закрытия вкладки.

**Q: Как добавить нового провайдера авторизации (email/password, GitHub)?**
A: Включи провайдер в Firebase Console → Authentication → Sign-in method. Добавь кнопку и обработчик в `firebase-auth.js`.

**Q: Где посмотреть данные пользователей?**
A: Firebase Console → Firestore Database → коллекция `users`.
