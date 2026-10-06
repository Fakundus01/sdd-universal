<#
.SYNOPSIS
  Instala el Cerebro: venv + requirements + init + importar-sdd + indexar. NO registra el MCP.
.DESCRIPTION
  Solo toca CEREBRO_DIR y el venv de cerebro\.venv (nunca el Python del sistema, nunca la configuracion de
  Claude Code). Se puede correr cuantas veces quieras: lo que ya existe no se pisa y el indexado es incremental.
.PARAMETER CerebroDir
  Carpeta del Cerebro (default: Documents\Cerebro; la misma que usa cerebro.py sin CEREBRO_DIR).
.PARAMETER Repo
  Repo SDD del que se siembra el Cerebro (default: la raiz de este paquete).
.PARAMETER Embeddings
  local (default: baja el modelo ~220 MB la primera vez) | openai | falso (sin modelo, solo para probar).
.PARAMETER Python
  Python >= 3.10 con el que se crea el venv (default: python).
.EXAMPLE
  powershell -File cerebro\instalar.ps1 -CerebroDir D:\Notas\Cerebro
#>
param(
    [string]$CerebroDir = (Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'Cerebro'),
    [string]$Repo = (Split-Path -Parent $PSScriptRoot),
    [ValidateSet('local', 'openai', 'falso')][string]$Embeddings = 'local',
    [string]$Python = 'python'
)
$ErrorActionPreference = 'Stop'

function Paso([string]$texto) { Write-Host "`n== $texto" -ForegroundColor Cyan }

# Un ejecutable nativo que falla no dispara $ErrorActionPreference: se mira el codigo de salida.
function Ejecutar([string]$exe, [string[]]$argumentos) {
    & $exe @argumentos
    if ($LASTEXITCODE -ne 0) { throw "fallo: $exe $($argumentos -join ' ') (codigo $LASTEXITCODE)" }
}

$cerebroPy = Join-Path $PSScriptRoot 'cerebro.py'
$requirements = Join-Path $PSScriptRoot 'requirements.txt'
$venv = Join-Path $PSScriptRoot '.venv'
$pyVenv = Join-Path $venv 'Scripts\python.exe'
if (-not (Test-Path $cerebroPy)) { throw "no encuentro ${cerebroPy}: corre el script desde un checkout del paquete" }
if (-not (Test-Path (Join-Path $Repo 'SDD-MASTER.md')) -and -not (Test-Path (Join-Path $Repo 'sdd'))) {
    throw "-Repo '$Repo' no parece un repo SDD (ni SDD-MASTER.md ni sdd\)"
}
$CerebroDir = [IO.Path]::GetFullPath($CerebroDir)

Paso "venv en $venv"
if (Test-Path $pyVenv) {
    Write-Host 'ya existe; se reutiliza'
} else {
    Ejecutar $Python @('-c', 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)')
    Ejecutar $Python @('-m', 'venv', $venv)
}

Paso 'dependencias (requirements.txt, solo en el venv)'
Ejecutar $pyVenv @('-m', 'pip', 'install', '--quiet', '--disable-pip-version-check', '-r', $requirements)

# Variables solo para este proceso: no se escribe ninguna variable de usuario ni de sistema.
$env:CEREBRO_DIR = $CerebroDir
$env:CEREBRO_EMBEDDINGS = $Embeddings
$env:PYTHONIOENCODING = 'utf-8'

Paso "init en $CerebroDir"
Ejecutar $pyVenv @($cerebroPy, 'init')

Paso "importar-sdd desde $Repo"
Ejecutar $pyVenv @($cerebroPy, 'importar-sdd', $Repo)

Paso "indexar ($Embeddings)"
if ($Embeddings -eq 'local') { Write-Host 'la primera vez baja el modelo (~220 MB): puede tardar unos minutos' }
Ejecutar $pyVenv @($cerebroPy, 'indexar')

Write-Host "`nListo. Probalo:" -ForegroundColor Green
Write-Host "  `$env:CEREBRO_DIR = '$CerebroDir'; `$env:CEREBRO_EMBEDDINGS = '$Embeddings'"
Write-Host "  & '$pyVenv' '$cerebroPy' buscar 'el agente copio un archivo para pasar un check'"
Write-Host "`nEl MCP NO se registro (eso se hace una vez, con tu OK). El comando es:" -ForegroundColor Yellow
Write-Host "  claude mcp add cerebro -e CEREBRO_DIR='$CerebroDir' -e CEREBRO_EMBEDDINGS=$Embeddings -- '$pyVenv' '$(Join-Path $PSScriptRoot 'mcp_server.py')'"
