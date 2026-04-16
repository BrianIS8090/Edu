const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const catalogPath = path.join(rootDir, 'build', 'catalog.json');
const gitBashPath = 'C:\\Program Files\\Git\\bin\\bash.exe';

function runPowerShellBuild() {
  execFileSync('powershell', ['-ExecutionPolicy', 'Bypass', '-File', 'scripts\\build-catalog.ps1'], {
    cwd: rootDir,
    stdio: 'pipe'
  });
}

function readCatalog() {
  return JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
}

function assertCatalogShape(catalog, source) {
  if (!Array.isArray(catalog.lessons)) {
    throw new Error(`${source}: отсутствует массив lessons`);
  }

  if (!Array.isArray(catalog.modules)) {
    throw new Error(`${source}: отсутствует массив modules`);
  }

  if (catalog.lessons.length === 0) {
    throw new Error(`${source}: lessons пустой`);
  }

  if (catalog.modules.length === 0) {
    throw new Error(`${source}: modules пустой`);
  }
}

function runBashBuildIfNeeded() {
  if (process.platform === 'win32') {
    console.log('bash-проверка пропущена: локальный Windows smoke-run использует PowerShell-сборщик');
    return;
  }

  if (!fs.existsSync(gitBashPath)) {
    console.log('bash-проверка пропущена: Git Bash недоступен');
    return;
  }

  execFileSync(gitBashPath, ['-lc', './scripts/build-catalog.sh > build/catalog.json'], {
    cwd: rootDir,
    stdio: 'pipe'
  });

  const bashCatalog = readCatalog();
  assertCatalogShape(bashCatalog, 'bash');
  console.log(`bash: lessons=${bashCatalog.lessons.length}; modules=${bashCatalog.modules.length}`);
}

runPowerShellBuild();

const powerShellCatalog = readCatalog();
assertCatalogShape(powerShellCatalog, 'PowerShell');
console.log(`PowerShell: lessons=${powerShellCatalog.lessons.length}; modules=${powerShellCatalog.modules.length}`);

runBashBuildIfNeeded();
