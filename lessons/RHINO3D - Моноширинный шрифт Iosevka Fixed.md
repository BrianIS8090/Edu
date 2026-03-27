***

title: RHINO3D - Моноширинный шрифт Iosevka Fixed
category: RHINO
tags: \[урок, rhino, настройка, шаблоны]
----------------------------------------

***

Описание модуля в одну-две строки.

<br />

<br />

## Шрифт Iosevka Fixed **- основной наш шрифт для оформления чертежей**

<br />

<br />

<br />

## Шрифт Iosevka Fixed — что нужно знать

### Общее

* Автор — Belleve Invis; проект ведётся на GitHub с 2015 года.

* Лицензия — SIL Open Font License 1.1 (свободно для любых проектов, включая коммерческие). [GitHub](https://github.com/be5invis/Iosevka?utm_source=chatgpt.com)

### Что значит «Fixed»

* Iosevka выпускается в трёх «шаговых» вариантах: Default, Term и Fixed.

* Fixed — строгий моноширинный подсемейство: **каждый** глиф (включая стрелки, блоки псевдографики и Powerline-символы) занимает ровно одну текстовую ячейку.

* В варианте Fixed отключены лигатуры, чтобы терминалы, IDE и старые редакторы, не умеющие в графические связывания и двухколоночные знаки, отображали текст без смещения. [GitHub](https://github.com/be5invis/Iosevka/blob/master/doc/PACKAGE-LIST.md?utm_source=chatgpt.com)[pkgsrc.se](https://pkgsrc.se/wip/iosevka-ttf?utm_source=chatgpt.com)

### Диапазон вариантов

* 9 начертаний (Thin 100 … Heavy 900).

* 2 ширины (Normal — 100 %, Extended — 108 %).

* 3 наклона (Upright, Italic ≈ 9 °, Oblique ≈ 6 °).

* Все эти параметры доступны как отдельные TTF, так и одним переменным VF-файлом с осями `wght`, `wdth`, `slnt`. [GitHub](https://github.com/be5invis/Iosevka?utm_source=chatgpt.com)[Typeof.net](https://typeof.net/Iosevka/?utm_source=chatgpt.com)

### Покрытие Unicode

* <br />

> 2 600 глифов: Basic Latin, Latin-1 Supplement, кириллица (U+0400 – 04FF), греческий, IPA, математические операторы, стрелки, плашки Box Drawing и полный набор Powerline/NERD. [Typewolf](https://www.typewolf.com/iosevka?utm_source=chatgpt.com)[Typeof.net](https://typeof.net/Iosevka/?utm_source=chatgpt.com)

### Сравнение с другими подсемействами Iosevka

Подсемейство

Лигатуры

Ширина «широких» символов

Типичная сфера применения

<br />

Default

да

2 ячейки (⟶ , ■)

GUI-IDE, тексты с красивыми стрелками

Term

да

1 ячейка для большинства, но остаются редкие двойные

Терминалы с поддержкой лигатур

**Fixed**

нет

1 ячейка всегда

Чистые моно-окружения, TUI, старые консоли

<br />

<br />

<br />

### Плюсы

* Безупречное выравнивание таблиц, ASCII-диаграмм и HEX-дампов.

* Переменный файл позволяет тонко подобрать насыщенность и ширину без смены семейства.

* Большой набор языков (русский, греческий, латиница) и иконок — не нужно вторых шрифтов.

### Минусы

* Отсутствуют кодовые лигатуры «!==», «->» и т. п. Если они нужны — берите Iosevka Term или сборку Fixed-Lig (самостоятельная перекомпиляция).

* Строгая одинаковая ширина делает глифы чуть уже, чем в Consolas/Fira Code; на низких DPI придётся поднять размер шрифта на пункт выше.

### Где взять

1. На странице релизов GitHub скачайте архив `ttf-iosevka-fixed-<версия>.zip` или `ttf-iosevka-fixed-variable.zip`. [GitHub](https://github.com/be5invis/Iosevka?utm_source=chatgpt.com)
2. Windows: распакуйте, выделите \*.ttf → ПКМ → «Установить для всех пользователей».
3. Linux: скопируйте файлы в `~/.local/share/fonts` и выполните `fc-cache -fv`.

