#!/usr/bin/env bash
# Скрипт сборки catalog.json
# Сканирует lessons/*.md и modules/*/meta.md, парсит YAML frontmatter,
# генерирует валидный JSON в stdout.
# Без внешних зависимостей — только bash, sed, grep, awk.

set -euo pipefail

# Определяем корневую директорию проекта (родитель scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# --- Вспомогательные функции ---

# Экранирование строки для JSON (обратный слэш, кавычки, управляющие символы)
json_escape() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\t'/\\t}"
  s="${s//$'\n'/\\n}"
  s="${s//$'\r'/}"
  printf '%s' "$s"
}

# Генерация id из имени файла/папки:
# убираем расширение, заменяем пробелы и подчёркивания на дефисы, приводим к нижнему регистру
make_id() {
  local name="$1"
  # Убираем расширение .md если есть
  name="${name%.md}"
  # Заменяем пробелы и подчёркивания на дефисы
  name="$(printf '%s' "$name" | sed 's/[_ ]/-/g')"
  # Приводим к нижнему регистру (только ASCII часть, кириллица остаётся как есть)
  name="$(printf '%s' "$name" | tr '[:upper:]' '[:lower:]')"
  printf '%s' "$name"
}

# Извлечение значения поля из frontmatter (принимает имя поля и содержимое frontmatter)
get_field() {
  local field="$1"
  local frontmatter="$2"
  local value
  value="$(printf '%s\n' "$frontmatter" | grep -i "^${field}:" | head -1 | sed "s/^${field}:[[:space:]]*//")"
  # Убираем кавычки если есть
  value="$(printf '%s' "$value" | sed 's/^"//; s/"$//; s/^'\''//; s/'\''$//')"
  printf '%s' "$value"
}

# Парсинг тегов из строки вида [tag1, tag2, tag3] в JSON-массив
parse_tags() {
  local raw="$1"
  # Убираем квадратные скобки
  raw="$(printf '%s' "$raw" | sed 's/^\[//; s/\]$//')"
  # Если пусто — возвращаем пустой массив
  if [ -z "$raw" ]; then
    printf '[]'
    return
  fi
  # Разбиваем по запятой, формируем JSON-массив
  local result="["
  local first=true
  # Используем запятую как разделитель
  while IFS= read -r -d ',' tag || [ -n "$tag" ]; do
    # Убираем пробелы в начале и конце
    tag="$(printf '%s' "$tag" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')"
    if [ -z "$tag" ]; then
      continue
    fi
    if [ "$first" = true ]; then
      first=false
    else
      result="$result, "
    fi
    result="$result\"$(json_escape "$tag")\""
  done <<< "$raw"
  result="$result]"
  printf '%s' "$result"
}

# Извлечение frontmatter из файла (текст между первой и второй строкой ---)
extract_frontmatter() {
  local file="$1"
  local in_frontmatter=false
  local frontmatter=""
  local line_num=0

  while IFS= read -r line || [ -n "$line" ]; do
    line_num=$((line_num + 1))
    # Убираем возврат каретки (Windows)
    line="${line//$'\r'/}"
    if [ "$line_num" -eq 1 ] && [ "$line" = "---" ]; then
      in_frontmatter=true
      continue
    fi
    if [ "$in_frontmatter" = true ] && [ "$line" = "---" ]; then
      break
    fi
    if [ "$in_frontmatter" = true ]; then
      frontmatter="$frontmatter$line"$'\n'
    fi
  done < "$file"

  if [ "$in_frontmatter" = true ]; then
    printf '%s' "$frontmatter"
  fi
}

# Извлечение описания: первый непустой абзац после frontmatter,
# который не является заголовком (не начинается с #) и не является горизонтальной линией
extract_description() {
  local file="$1"
  local state="start"
  local line_num=0
  local description=""

  while IFS= read -r line || [ -n "$line" ]; do
    line_num=$((line_num + 1))
    # Убираем возврат каретки (Windows)
    line="${line//$'\r'/}"

    case "$state" in
      start)
        if [ "$line_num" -eq 1 ] && [ "$line" = "---" ]; then
          # Начало frontmatter
          state="in_frontmatter"
        else
          # Файл без frontmatter — сразу ищем описание
          state="searching"
          # Обработаем текущую строку в следующей итерации — продублируем проверку
          if [ -n "$line" ] && ! printf '%s' "$line" | grep -q '^#' && ! printf '%s' "$line" | grep -q '^\*\*\*$' && ! printf '%s' "$line" | grep -q '^\!\['; then
            description="$line"
            break
          fi
        fi
        ;;
      in_frontmatter)
        if [ "$line" = "---" ]; then
          # Конец frontmatter
          state="searching"
        fi
        ;;
      searching)
        # Пропускаем пустые строки и горизонтальные разделители
        if [ -z "$line" ] || [ "$line" = "***" ] || [ "$line" = "---" ] || [ "$line" = "___" ]; then
          continue
        fi
        # Пропускаем заголовки (строки начинающиеся с #)
        if printf '%s' "$line" | grep -q '^#'; then
          continue
        fi
        # Пропускаем строки с изображениями
        if printf '%s' "$line" | grep -q '^\!\['; then
          continue
        fi
        # Пропускаем элементы маркированных списков (начинаются с * или - с пробелом)
        if printf '%s' "$line" | grep -q '^\*[[:space:]]'; then
          continue
        fi
        if printf '%s' "$line" | grep -q '^-[[:space:]]'; then
          continue
        fi
        # Нашли описание
        description="$line"
        break
        ;;
    esac
  done < "$file"

  # Убираем markdown-разметку (жирный, курсив)
  description="$(printf '%s' "$description" | sed 's/\*\*//g; s/\*//g')"
  # Убираем markdown-ссылки вида [текст](url) -> текст
  description="$(printf '%s' "$description" | sed 's/\[\([^]]*\)\]([^)]*)/ \1/g')"
  printf '%s' "$description"
}

# --- Основная логика ---

# Переходим в корень проекта
cd "$ROOT_DIR"

# Массив для хранения JSON-элементов уроков
lessons_json=""
lessons_count=0

# Обрабатываем уроки (lessons/*.md)
if [ -d "lessons" ]; then
  for file in lessons/*.md; do
    [ -f "$file" ] || continue

    filename="$(basename "$file")"
    id="$(make_id "$filename")"

    # Извлекаем frontmatter
    frontmatter="$(extract_frontmatter "$file")"

    if [ -n "$frontmatter" ]; then
      title="$(get_field "title" "$frontmatter")"
      category="$(get_field "category" "$frontmatter")"
      subcategory="$(get_field "subcategory" "$frontmatter")"
      tags_raw="$(get_field "tags" "$frontmatter")"
    else
      title=""
      category=""
      subcategory=""
      tags_raw=""
    fi

    # Значения по умолчанию
    if [ -z "$title" ]; then
      title="${filename%.md}"
    fi
    if [ -z "$category" ]; then
      category="Без категории"
    fi

    tags_json="$(parse_tags "$tags_raw")"
    description="$(extract_description "$file")"

    # Формируем JSON-объект урока
    if [ "$lessons_count" -gt 0 ]; then
      lessons_json="$lessons_json,"
    fi
    lessons_json="$lessons_json
    {
      \"id\": \"$(json_escape "$id")\",
      \"title\": \"$(json_escape "$title")\",
      \"category\": \"$(json_escape "$category")\",
      \"subcategory\": \"$(json_escape "$subcategory")\",
      \"tags\": $tags_json,
      \"type\": \"lesson\",
      \"file\": \"$(json_escape "$file")\",
      \"description\": \"$(json_escape "$description")\"
    }"
    lessons_count=$((lessons_count + 1))
  done
fi

# Массив для хранения JSON-элементов модулей
modules_json=""
modules_count=0

# Обрабатываем модули (modules/*/meta.md)
if [ -d "modules" ]; then
  for dir in modules/*/; do
    [ -d "$dir" ] || continue

    dirname="$(basename "$dir")"
    id="$(make_id "$dirname")"
    meta_file="${dir}meta.md"

    if [ -f "$meta_file" ]; then
      frontmatter="$(extract_frontmatter "$meta_file")"

      if [ -n "$frontmatter" ]; then
        title="$(get_field "title" "$frontmatter")"
        category="$(get_field "category" "$frontmatter")"
        subcategory="$(get_field "subcategory" "$frontmatter")"
        tags_raw="$(get_field "tags" "$frontmatter")"
      else
        title=""
        category=""
        subcategory=""
        tags_raw=""
      fi

      description="$(extract_description "$meta_file")"
    else
      # Модуль без meta.md
      title=""
      category=""
      subcategory=""
      tags_raw=""
      description=""
    fi

    # Значения по умолчанию
    if [ -z "$title" ]; then
      title="$dirname"
    fi
    if [ -z "$category" ]; then
      category="Без категории"
    fi

    tags_json="$(parse_tags "$tags_raw")"

    # Формируем JSON-объект модуля
    if [ "$modules_count" -gt 0 ]; then
      modules_json="$modules_json,"
    fi
    modules_json="$modules_json
    {
      \"id\": \"$(json_escape "$id")\",
      \"title\": \"$(json_escape "$title")\",
      \"category\": \"$(json_escape "$category")\",
      \"subcategory\": \"$(json_escape "$subcategory")\",
      \"tags\": $tags_json,
      \"type\": \"module\",
      \"path\": \"$(json_escape "modules/${dirname}/")\",
      \"description\": \"$(json_escape "$description")\"
    }"
    modules_count=$((modules_count + 1))
  done
fi

# Выводим итоговый JSON
printf '{\n  "lessons": [%s\n  ],\n  "modules": [%s\n  ]\n}\n' "$lessons_json" "$modules_json"
