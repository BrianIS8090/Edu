---
title: Установка и настройка OpenClaw
category: Обучение
tags: [OpenClaw, AI, Telegram, автоматизация, установка]
---

# Установка и настройка OpenClaw

Пошаговое руководство по установке, настройке и первому запуску OpenClaw — платформы для создания AI-агентов с интеграцией в Telegram, Signal, Discord и другие мессенджеры.

***

## 1. Что такое OpenClaw

OpenClaw — это open-source платформа для создания персональных AI-агентов. Основные возможности:

* **Мультиканальность** — работа через Telegram, Signal, Discord, WhatsApp
* **Гибкая настройка** —_skills_, память, персонализация
* **Локальное выполнение** — код выполняется на вашем сервере
* **Интеграции** — GitHub, календарь, почта, MCP-серверы
* **Расширяемость** — создание собственных навыков

> OpenClaw работает на Node.js и требует минимальных технических знаний для установки.

***

## 2. Системные требования

### Оборудование

| Параметр      | Минимум        | Рекомендуется  |
|---------------|----------------|----------------|
| CPU           | 1 ядро         | 2+ ядер        |
| RAM           | 512 МБ         | 1+ ГБ          |
| Диск          | 500 МБ         | 2+ ГБ          |
| ОС            | Linux, macOS, Windows | Linux (Ubuntu/Debian) |

### Программное обеспечение

* **Node.js** v18.0.0 или выше
* **npm** v9.0.0 или выше
* **Git** (для установки и обновлений)

### Проверка версий

```bash
node --version   # Должно быть v18.0.0 или выше
npm --version    # Должно быть v9.0.0 или выше
git --version    # Любая актуальная версия
```

***

## 3. Установка

### Вариант 1: Глобальная установка через npm

Рекомендуемый способ для большинства пользователей.

```bash
npm install -g openclaw
```

После установки проверьте:

```bash
openclaw --version
```

### Вариант 2: Установка из исходников

Для разработчиков и тех, кто хочет иметь последнюю версию.

```bash
# Клонирование репозитория
git clone https://github.com/openclaw/openclaw.git
cd openclaw

# Установка зависимостей
npm install

# Сборка
npm run build

# Глобальная ссылка (опционально)
npm link
```

***

## 4. Первичная настройка

### 4.1. Инициализация рабочего пространства

Создайте директорию для хранения данных агента:

```bash
mkdir -p ~/.openclaw/workspace
cd ~/.openclaw/workspace
```

Инициализируйте конфигурацию:

```bash
openclaw init
```

Эта команда создаст базовую структуру файлов:

```
~/.openclaw/
├── config/
│   └── config.yaml        # Основной конфиг
├── workspace/
│   ├── AGENTS.md          # Правила для агента
│   ├── SOUL.md            # Личность и характер
│   ├── USER.md            # Информация о пользователе
│   ├── MEMORY.md          # Долгосрочная память
│   └── memory/            # Ежедневные записи
└── logs/
    └── openclaw.log
```

### 4.2. Создание конфигурации

Откройте файл конфигурации:

```bash
nano ~/.openclaw/config/config.yaml
```

Минимальная конфигурация:

```yaml
# API ключ для LLM-провайдера
providers:
  openrouter:
    apiKey: your-api-key-here

# Модель по умолчанию
model: openrouter/auto

# Настройки агента
agent:
  name: "Cloud"
  timezone: "Europe/Moscow"
```

***

## 5. Gateway — подключение мессенджеров

Gateway — это сервис, обеспечивающий связь между AI-агентом и мессенджерами.

### 5.1. Запуск Gateway

```bash
openclaw gateway start
```

Проверка статуса:

```bash
openclaw gateway status
```

### 5.2. Подключение Telegram

1. **Создайте бота** через [@BotFather](https://t.me/BotFather):
   * Отправьте `/newbot`
   * Укажите имя и username бота
   * Скопируйте полученный токен

2. **Добавьте токен в конфигурацию**:

```yaml
# ~/.openclaw/config/config.yaml
plugins:
  entries:
    telegram:
      enabled: true
      token: "YOUR_BOT_TOKEN_HERE"
```

3. **Перезапустите gateway**:

```bash
openclaw gateway restart
```

4. **Найдите бота** в Telegram и отправьте `/start`

### 5.3. Управление Gateway

| Команда                    | Описание                    |
|----------------------------|----------------------------|
| `openclaw gateway start`   | Запустить сервис           |
| `openclaw gateway stop`    | Остановить сервис          |
| `openclaw gateway restart` | Перезапустить сервис       |
| `openclaw gateway status`  | Проверить статус           |
| `openclaw gateway logs`    | Просмотреть логи           |

***

## 6. Основные команды

### Работа в терминале

```bash
# Запуск интерактивной сессии
openclaw chat

# Отправка одиночного сообщения
openclaw ask "Какие у меня задачи на сегодня?"

# Проверка статуса системы
openclaw status
```

### Работа с памятью

```bash
# Поиск по памяти
openclaw memory search "проект"

# Просмотр записей
openclaw memory list
```

### Управление скиллами

```bash
# Установка скилла из ClawHub
openclaw skill install <skill-name>

# Список установленных скиллов
openclaw skill list
```

***

## 7. Структура рабочего пространства

### AGENTS.md

Определяет поведение агента в каждой сессии:

```markdown
# AGENTS.md — Рабочее пространство

## Каждая сессия

1. Прочитать SOUL.md — кто я
2. Прочитать USER.md — кому помогаю
3. Прочитать memory/YYYY-MM-DD.md — контекст

## Правила

- Не раскрывать личные данные
- Спросить перед внешними действиями
- Записывать важное в файлы
```

### SOUL.md

Определяет личность агента:

```markdown
# SOUL.md — Кто я

## Суть

Помогать по-настоящему, а не для галочки.
Иметь своё мнение. Быть партнёром, не исполнителем.

## Характер

- Человечный — без "гптшности"
- Технарь — люблю код и системы
- Партнёр — могу предложить идею
```

### USER.md

Информация о пользователе:

```markdown
# USER.md

- **Имя:** Иван
- **Часовой пояс:** Europe/Moscow
- **Интересы:** разработка, AI, автоматизация
- **Проекты:** MyApp, AnotherProject
```

***

## 8. Полезные советы

### Автозапуск Gateway

Для автоматического запуска при старте системы создайте systemd-сервис:

```bash
# /etc/systemd/system/openclaw-gateway.service
[Unit]
Description=OpenClaw Gateway
After=network.target

[Service]
Type=simple
User=your-username
ExecStart=/usr/bin/openclaw gateway start
Restart=always

[Install]
WantedBy=multi-user.target
```

Активация:

```bash
sudo systemctl enable openclaw-gateway
sudo systemctl start openclaw-gateway
```

### Логирование

Логи хранятся в `~/.openclaw/logs/`. Для просмотра в реальном времени:

```bash
tail -f ~/.openclaw/logs/openclaw.log
```

### Обновление

```bash
npm update -g openclaw
```

### Резервное копирование

Регулярно сохраняйте папку `~/.openclaw/workspace/` — там находится вся память агента.

***

## 9. Решение проблем

### Gateway не запускается

1. Проверьте, занят ли порт:
   ```bash
   lsof -i :3000
   ```

2. Проверьте логи:
   ```bash
   openclaw gateway logs
   ```

3. Убедитесь, что конфигурация валидна:
   ```bash
   openclaw config validate
   ```

### Бот не отвечает в Telegram

1. Проверьте токен в конфигурации
2. Убедитесь, что gateway запущен
3. Проверьте, что бот не заблокирован

### Ошибки API

1. Проверьте API-ключ
2. Убедитесь в наличии средств на балансе провайдера
3. Проверьте доступность API-эндпоинта

***

## 10. Дополнительные ресурсы

* **Документация:** https://docs.openclaw.ai
* **GitHub:** https://github.com/openclaw/openclaw
* **ClawHub (скиллы):** https://clawhub.com
* **Discord:** https://discord.com/invite/clawd

***

> После настройки не забудьте протестировать агента в мессенджере. Отправьте `/start` и убедитесь, что получили ответ.
