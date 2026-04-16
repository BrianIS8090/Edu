# Скрипт сборки catalog.json (PowerShell)
# Сканирует lessons/*.md и modules/*/meta.md, парсит YAML frontmatter,
# генерирует build/catalog.json

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$BuildDir = Join-Path $Root "build"
$OutputFile = Join-Path $BuildDir "catalog.json"

if (-not (Test-Path $BuildDir)) { New-Item -ItemType Directory -Path $BuildDir | Out-Null }

# Парсинг frontmatter из файла
function Get-Frontmatter {
  param([string]$FilePath)
  $lines = Get-Content -Path $FilePath -Encoding UTF8
  $result = @{}
  $inFrontmatter = $false
  $started = $false

  foreach ($line in $lines) {
    $line = $line.TrimEnd()
    if (-not $started -and $line -eq "---") {
      $started = $true
      $inFrontmatter = $true
      continue
    }
    if ($inFrontmatter -and $line -eq "---") {
      break
    }
    if ($inFrontmatter -and $line -match "^(\w+):\s*(.*)$") {
      $result[$Matches[1]] = $Matches[2]
    }
  }
  return $result
}

# Парсинг тегов из строки [tag1, tag2, tag3]
function Get-Tags {
  param([string]$Raw)
  if (-not $Raw) { return @() }
  $Raw = $Raw -replace "^\[", "" -replace "\]$", ""
  if (-not $Raw.Trim()) { return @() }
  return ($Raw -split ",") | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
}

# Извлечение описания (первый текстовый параграф после frontmatter)
function Get-Description {
  param([string]$FilePath)
  $lines = Get-Content -Path $FilePath -Encoding UTF8
  $state = "start"

  foreach ($line in $lines) {
    $line = $line.TrimEnd()
    switch ($state) {
      "start" {
        if ($line -eq "---") { $state = "frontmatter" }
        else { $state = "searching" }
      }
      "frontmatter" {
        if ($line -eq "---") { $state = "searching" }
      }
      "searching" {
        if (-not $line -or $line -eq "***" -or $line -eq "---" -or $line -eq "___") { continue }
        if ($line -match "^#") { continue }
        if ($line -match "^!\[") { continue }
        if ($line -match "^\*\s" -or $line -match "^-\s") { continue }
        # Убираем markdown-разметку
        $desc = $line -replace "\*\*", "" -replace "\*", ""
        $desc = $desc -replace "\[([^\]]*)\]\([^\)]*\)", '$1'
        return $desc
      }
    }
  }
  return ""
}

# Оценка времени чтения Markdown (≈200 слов в минуту)
function Get-ReadTime {
  param([string]$FilePath)

  $content = Get-Content -Path $FilePath -Encoding UTF8 -Raw
  $content = $content -replace "(?s)^---\r?\n.*?\r?\n---\r?\n?", ""
  $content = $content -replace "[#*_`\[\]()!>~\-]", " "

  $wordCount = ($content -split "\s+" | Where-Object { $_ -ne "" }).Count
  $minutes = [Math]::Ceiling($wordCount / 200)

  if ($minutes -lt 1) {
    return 1
  }

  return [int]$minutes
}

# Аккуратно превращает только \uXXXX в Unicode-символы
function Convert-UnicodeEscapes {
  param([string]$Value)

  return [regex]::Replace($Value, "\\u([0-9a-fA-F]{4})", {
    param($match)
    [char]([Convert]::ToInt32($match.Groups[1].Value, 16))
  })
}

# Дата последнего изменения файла из git (ISO 8601)
function Get-LastUpdated {
  param([string]$FilePath)
  try {
    $date = git log -1 --format="%aI" -- $FilePath 2>$null
    if ($date) { return $date.Trim() }
  } catch {}
  return ""
}

# ID из имени файла/папки
function Make-Id {
  param([string]$Name)
  $Name = $Name -replace "\.md$", ""
  $Name = $Name -replace "[_ ]", "-"
  return $Name.ToLower()
}

# Собираем уроки
$lessons = @()
$lessonsDir = Join-Path $Root "lessons"
if (Test-Path $lessonsDir) {
  Get-ChildItem -Path $lessonsDir -Filter "*.md" | ForEach-Object {
    $fm = Get-Frontmatter -FilePath $_.FullName
    $title = if ($fm["title"]) { $fm["title"] } else { $_.BaseName }
    $category = if ($fm["category"]) { $fm["category"] } else { "Без категории" }
    $subcategory = if ($fm["subcategory"]) { $fm["subcategory"] } else { "" }
    $tags = Get-Tags -Raw $fm["tags"]
    $desc = Get-Description -FilePath $_.FullName
    $readTime = Get-ReadTime -FilePath $_.FullName
    $id = Make-Id -Name $_.Name

    $lastUpdated = Get-LastUpdated -FilePath $_.FullName

    $lessons += @{
      id = $id
      title = $title
      category = $category
      subcategory = $subcategory
      tags = $tags
      type = "lesson"
      file = "lessons/$($_.Name)"
      description = $desc
      readTime = $readTime
      lastUpdated = $lastUpdated
    }
  }
}

# Собираем модули
$modules = @()
$modulesDir = Join-Path $Root "modules"
if (Test-Path $modulesDir) {
  Get-ChildItem -Path $modulesDir -Directory | ForEach-Object {
    $metaFile = Join-Path $_.FullName "meta.md"
    $dirName = $_.Name
    $id = Make-Id -Name $dirName

    if (Test-Path $metaFile) {
      $fm = Get-Frontmatter -FilePath $metaFile
      $title = if ($fm["title"]) { $fm["title"] } else { $dirName }
      $category = if ($fm["category"]) { $fm["category"] } else { "Без категории" }
      $subcategory = if ($fm["subcategory"]) { $fm["subcategory"] } else { "" }
      $tags = Get-Tags -Raw $fm["tags"]
      $desc = Get-Description -FilePath $metaFile
    } else {
      $title = $dirName
      $category = "Без категории"
      $subcategory = ""
      $tags = @()
      $desc = ""
    }

    $lastUpdated = Get-LastUpdated -FilePath $_.FullName

    $modules += @{
      id = $id
      title = $title
      category = $category
      subcategory = $subcategory
      tags = $tags
      type = "module"
      path = "modules/$dirName/"
      description = $desc
      lastUpdated = $lastUpdated
    }
  }
}

# Формируем и сохраняем JSON
$catalog = @{
  lessons = $lessons
  modules = $modules
}

$json = $catalog | ConvertTo-Json -Depth 4 -Compress
# PowerShell 5.1 экранирует кириллицу как \uXXXX — декодируем только Unicode-экраны
if ($PSVersionTable.PSVersion.Major -lt 6) {
  $json = Convert-UnicodeEscapes -Value $json
}
# Запись без BOM (новый UTF8Encoding($false))
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($OutputFile, $json, $utf8NoBom)

Write-Host "catalog.json собран: $($lessons.Count) уроков, $($modules.Count) модулей"

# Генерация version.json
$pkgPath = Join-Path $Root "package.json"
$pkgVersion = "0.0.0"
if (Test-Path $pkgPath) {
  $pkg = Get-Content -Path $pkgPath -Encoding UTF8 -Raw | ConvertFrom-Json
  if ($pkg.version) { $pkgVersion = $pkg.version }
}
$commitHash = (git -C $Root rev-parse --short HEAD 2>$null)
if (-not $commitHash) { $commitHash = "unknown" }
$commitDate = (git -C $Root log -1 --format="%aI" 2>$null)
if (-not $commitDate) { $commitDate = "" }
$buildDate = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssK")
$branch = (git -C $Root rev-parse --abbrev-ref HEAD 2>$null)
if (-not $branch) { $branch = "unknown" }

$versionJson = "{""version"":""$pkgVersion"",""commit"":""$commitHash"",""branch"":""$branch"",""commitDate"":""$commitDate"",""buildDate"":""$buildDate""}"
$versionFile = Join-Path $BuildDir "version.json"
[System.IO.File]::WriteAllText($versionFile, $versionJson, $utf8NoBom)
Write-Host "version.json: v$pkgVersion ($commitHash)"
