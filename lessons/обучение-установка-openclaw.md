---
title: Установка и настройка OpenClaw
category: Обучение
tags: [OpenClaw, AI, Telegram, автоматизация, установка]
---

# Установка и настройка OpenClaw

Пошаговое руководство по установке, настройке и первому запуску OpenClaw — платформы для создания AI-агентов с интеграцией в Telegram, Signal, Discord, WhatsApp и другие мессенджеры.

![OpenClaw](https://raw.githubusercontent.com/openclaw/openclaw/main/docs/assets/openclaw-logo-text.svg)

***

## 1. Что такое OpenClaw

OpenClaw — это open-source платформа для создания персональных AI-агентов. Основные возможности:

* **Мультиканальность** — работа через 20+ платформ: Telegram, Signal, Discord, WhatsApp, Slack, iMessage, Matrix и другие
* **Гибкая настройка** — skills (навыки), память, персонализация поведения
* **Локальное выполнение** — код выполняется на вашем устройстве или сервере
* **Интеграции** — GitHub, календарь, почта, MCP-серверы, браузер
* **Расширяемость** — создание собственных навыков через ClawHub

> OpenClaw работает на Node.js. Установка занимает 2-3 минуты через официальный installer script.

**Официальные ресурсы:**

* Веб-сайт: https://openclaw.ai
* Документация: https://docs.openclaw.ai
* GitHub: https://github.com/openclaw/openclaw
* ClawHub (скиллы): https://clawhub.com
* Discord: https://discord.com/invite/clawd

***

## 2. Системные требования

### Оборудование

| Параметр | Минимум    | Рекомендуется |
|----------|------------|---------------|
| CPU      | 1 ядро     | 2+ ядер       |
| RAM      | 512 МБ     | 1+ ГБ         |
| Диск     | 500 МБ     | 2+ ГБ         |

### Операционная система

* **macOS** — нативная поддержка
* **Linux** — Ubuntu, Debian, CentOS и другие дистрибутивы
* **Windows** — нативно или через WSL2 (рекомендуется WSL2)

### Программное обеспечение

* **Node.js** v24 (рекомендуется) или v22.14+
* **npm** или **pnpm** — устанавливаются вместе с Node
* **Git** — для установки из исходников (опционально)

> Installer script автоматически установит Node.js, если его нет в системе.

***

## 3. Быстрая установка (рекомендуется)

### macOS / Linux / WSL2

Откройте терминал и выполните:

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

### Windows (PowerShell)

```powershell
iwr -useb https://openclaw.ai/install.ps1 | iex
```

Скрипт автоматически:

1. Определит вашу ОС
2. Установит Node.js (если нужно)
3. Установит OpenClaw глобально
4. Запустит интерактивный onboarding

### Установка без onboarding

Если хотите установить без запуска мастера настройки:

```bash
# macOS / Linux / WSL2
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --no-onboard

# Windows (PowerShell)
& ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
```

***

## 4. Альтернативные способы установки

### Через npm

Если Node.js уже установлен:

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

### Через pnpm

```bash
pnpm add -g openclaw@latest
pnpm approve-builds -g
openclaw onboard --install-daemon
```

### Из исходников

Для разработчиков:

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install && pnpm ui:build && pnpm build
pnpm link --global
openclaw onboard --install-daemon
```

***

## 5. Проверка установки

После установки проверьте, что всё работает:

```bash
# Версия CLI
openclaw --version

# Проверка конфигурации
openclaw doctor

# Статус Gateway
openclaw gateway status
```

Если команды не найдены — проверьте, что глобальная директория npm в PATH:

```bash
# Проверка
npm prefix -g
echo $PATH

# Добавление в PATH (если нужно)
export PATH="$(npm prefix -g)/bin:$PATH"
```

***

## 6. Onboarding — первичная настройка

Команда `openclaw onboard` запускает интерактивный мастер настройки:

```bash
openclaw onboard --install-daemon
```

Мастер поможет:

1. Настроить Gateway (сервер для мессенджеров)
2. Подключить каналы связи (Telegram, Discord и т.д.)
3. Выбрать LLM-провайдера (OpenAI, Anthropic, OpenRouter и др.)
4. Установить базовые навыки

Флаг `--install-daemon` установит Gateway как системный сервис (launchd/systemd), чтобы он работал в фоне.

***

## 7. Gateway — подключение мессенджеров

Gateway — это сервис, обеспечивающий связь между AI-агентом и мессенджерами.

### Управление Gateway

| Команда                    | Описание          |
|----------------------------|-------------------|
| `openclaw gateway start`   | Запустить         |
| `openclaw gateway stop`    | Остановить        |
| `openclaw gateway restart` | Перезапустить     |
| `openclaw gateway status`  | Проверить статус  |
| `openclaw gateway logs`    | Просмотреть логи  |

### Подключение Telegram

1. **Создайте бота** через [@BotFather](https://t.me/BotFather):
   * Отправьте `/newbot`
   * Укажите имя и username бота
   * Скопируйте полученный токен

2. **Настройте канал** через onboarding или в конфигурации:

```bash
openclaw onboard
# Выберите Telegram и введите токен
```

3. **Перезапустите gateway**:

```bash
openclaw gateway restart
```

4. **Найдите бота** в Telegram и отправьте `/start`

### Безопасность

По умолчанию бот работает в режиме **pairing** — неизвестные пользователи получают код подтверждения. Одобрить доступ:

```bash
openclaw pairing approve
```

Для проверки настроек безопасности:

```bash
openclaw doctor
```

***

## 8. Основные команды CLI

### Чат с агентом

```bash
# Интерактивный чат
openclaw chat

# Одиночный запрос
openclaw ask "Какие у меня задачи на сегодня?"

# Запрос с высоким thinking
openclaw agent --message "Проанализируй проект" --thinking high
```

### Работа с памятью

```bash
# Поиск по памяти
openclaw memory search "проект"

# Просмотр записей
openclaw memory list
```

### Управление навыками

```bash
# Список установленных навыков
openclaw skill list

# Установка из ClawHub
openclaw skill install <skill-name>
```

### Диагностика

```bash
# Полная проверка системы
openclaw doctor

# Статус всех компонентов
openclaw status
```

***

## 9. Структура рабочего пространства

Рабочее пространство OpenClaw находится в `~/.openclaw/`:

```
~/.openclaw/
├── config/
│   └── openclaw.json     # Основной конфиг (JSON5)
├── workspace/
│   ├── AGENTS.md         # Правила для агента
│   ├── SOUL.md           # Личность и характер
│   ├── USER.md           # Информация о пользователе
│   ├── MEMORY.md         # Долгосрочная память
│   └── memory/           # Ежедневные записи
└── logs/
    └── openclaw.log
```

### Ключевые файлы

| Файл       | Назначение                                    |
|------------|-----------------------------------------------|
| AGENTS.md  | Правила поведения агента в каждой сессии      |
| SOUL.md    | Личность, характер, стиль общения             |
| USER.md    | Информация о пользователе, проекты, интересы  |
| MEMORY.md  | Важная информация, которую нужно помнить      |
| memory/    | Ежедневные записи (YYYY-MM-DD.md)             |

### Пример SOUL.md

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

***

## 10. Полезные советы

### Автозапуск Gateway

При установке через `--install-daemon` Gateway автоматически запускается при старте системы. Проверьте:

```bash
# Linux (systemd)
systemctl --user status openclaw-gateway

# macOS (launchd)
launchctl list | grep openclaw
```

### Обновление

```bash
# Обновление до последней версии
openclaw update

# Или через npm
npm update -g openclaw
```

### Каналы обновлений

| Канал  | Описание                           |
|--------|------------------------------------|
| stable | Стабильные релизы (по умолчанию)   |
| beta   | Пререлизы для тестирования         |
| dev    | Последняя версия из main           |

```bash
openclaw update --channel beta
```

### Резервное копирование

Регулярно сохраняйте папку `~/.openclaw/workspace/`:

```bash
# Создание архива
tar -czf openclaw-backup.tar.gz -C ~/.openclaw workspace

# Восстановление
tar -xzf openclaw-backup.tar.gz -C ~/.openclaw
```

***

## 11. Решение проблем

### Команда `openclaw` не найдена

Проверьте PATH:

```bash
echo $PATH
npm prefix -g

# Добавьте в ~/.bashrc или ~/.zshrc
export PATH="$(npm prefix -g)/bin:$PATH"
```

### Gateway не запускается

1. Проверьте логи: `openclaw gateway logs`
2. Проверьте конфигурацию: `openclaw doctor`
3. Проверьте, что порт не занят: `lsof -i :18789`

### Бот не отвечает в Telegram

1. Проверьте токен в конфигурации
2. Убедитесь, что Gateway запущен: `openclaw gateway status`
3. Проверьте pairing: неизвестные пользователи должны получить код

### Ошибки API (LLM)

1. Проверьте API-ключ в конфигурации
2. Убедитесь в наличии средств на балансе
3. Проверьте доступность API-эндпоинта

***

## 12. Дополнительные ресурсы

* **Документация:** https://docs.openclaw.ai
* **GitHub:** https://github.com/openclaw/openclaw
* **ClawHub (скиллы):** https://clawhub.com
* **Discord:** https://discord.com/invite/clawd
* **Полный индекс документации:** https://docs.openclaw.ai/llms.txt

***

> После настройки отправьте `/start` в мессенджере и убедитесь, что получили ответ. Если всё работает — поздравляем, OpenClaw готов к использованию!
