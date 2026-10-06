<#
.SYNOPSIS
  Instala el Cerebro: venv + requirements + init + importar-sdd + indexar. NO registra el MCP.
.DESCRIPTION
  Solo toca CEREBRO_DIR y el venv de cerebro\.venv (nunca el Python del sistema, nunca la configuracion de
  Claude Code). Se puede correr cuantas veces quieras: lo que ya existe no se pisa y el indexado es incremental.
  Se niega a instalar el Cerebro dentro de OneDrive (el indice SQLite genera conflictos ahi).
.PARAMETER CerebroDir
  Carpeta del Cerebro (default: %USERPROFILE%\Documents\Cerebro, la misma que usa cerebro.py sin CEREBRO_DIR).
.PARAMETER Repo
  Repo SDD del que se siembra el Cerebro (default: la raiz de este paquete).
.PARAMETER Embeddings
  local (default: baja el modelo ~220 MB la primera vez) | openai | falso (sin modelo, solo para probar).
.PARAMETER Python
  Python >= 3.10 con el que se crea el venv (default: python).
.PARAMETER Reindexar
  Pasa --todo a indexar: hace falta al cambiar de modo (falso, local u openai) sobre un Cerebro ya indexado.
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File cerebro\instalar.ps1 -CerebroDir D:\Notas\Cerebro
#>
param(
    [string]$CerebroDir = (Join-Path $(if ($env:USERPROFILE) { $env:USERPROFILE } else { $HOME }) 'Documents\Cerebro'),
    [string]$Repo = (Split-Path -Parent $PSScriptRoot),
    [ValidateSet('local', 'openai', 'falso')][string]$Embeddings = 'local',
    [string]$Python = 'python',
    [switch]$Reindexar
)
$ErrorActionPreference = 'Stop'

function Paso([string]$texto) { Write-Host "`n== $texto" -ForegroundColor Cyan }

# Para imprimir comandos que se puedan pegar aunque la ruta lleve una comilla simple.
function Q([string]$texto) { "'" + $texto.Replace("'", "''") + "'" }

# Un ejecutable nativo que falla no dispara $ErrorActionPreference: se mira el codigo de salida.
function Ejecutar([string]$exe, [string[]]$argumentos) {
    & $exe @argumentos
    if ($LASTEXITCODE -ne 0) { throw "fallo: $exe $($argumentos -join ' ') (codigo $LASTEXITCODE)" }
}

# $true si la ruta cae bajo OneDrive: una de sus variables o un segmento llamado OneDrive (o "OneDrive - Empresa").
function BajoOneDrive([string]$ruta, [string[]]$raices) {
    $completa = [IO.Path]::GetFullPath($ruta).TrimEnd('\')
    foreach ($raiz in $raices) {
        if (-not $raiz) { continue }
        $r = [IO.Path]::GetFullPath($raiz).TrimEnd('\')
        if ($completa -eq $r -or $completa.StartsWith($r + '\', [StringComparison]::OrdinalIgnoreCase)) { return $true }
    }
    foreach ($segmento in $completa.Split('\')) {
        if ($segmento -match '^OneDrive($|[ -])') { return $true }
    }
    return $false
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
if (BajoOneDrive $CerebroDir @($env:OneDrive, $env:OneDriveConsumer, $env:OneDriveCommercial)) {
    throw "CerebroDir '$CerebroDir' queda dentro de OneDrive: el indice SQLite genera conflictos ahi. Elegi otra carpeta con -CerebroDir (por ejemplo $(Join-Path $env:USERPROFILE 'Documents\Cerebro'))."
}

Paso "venv en $venv"
if (Test-Path $pyVenv) {
    Write-Host 'ya existe; se reutiliza'
} else {
    try { Ejecutar $Python @('-c', 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)') }
    catch { throw "hace falta Python 3.10 o mas (-Python '$Python' no lo cumple o no existe): $_" }
    Ejecutar $Python @('-m', 'venv', $venv)
}

Paso 'dependencias (requirements.txt, solo en el venv)'
try { Ejecutar $pyVenv @('-m', 'pip', 'install', '--quiet', '--disable-pip-version-check', '-r', $requirements) }
catch { throw "pip no pudo instalar requirements.txt (sin red? sin permiso?): $_" }

# Variables solo para este proceso: no se escribe ninguna variable de usuario ni de sistema.
$env:CEREBRO_DIR = $CerebroDir
$env:CEREBRO_EMBEDDINGS = $Embeddings
$env:PYTHONIOENCODING = 'utf-8'

Paso "init en $CerebroDir"
Ejecutar $pyVenv @($cerebroPy, 'init')

Paso "importar-sdd desde $Repo"
Ejecutar $pyVenv @($cerebroPy, 'importar-sdd', $Repo)

Paso "indexar ($Embeddings)"
if ($Embeddings -eq 'local') { Write-Host 'con modelo local: si todavia no esta, la primera vez lo baja (~220 MB) y puede tardar unos minutos' }
$argsIndexar = @($cerebroPy, 'indexar')
if ($Reindexar) { $argsIndexar += '--todo' }
try { Ejecutar $pyVenv $argsIndexar }
catch {
    Write-Host "Si cambiaste de modo (falso, local u openai) sobre un Cerebro ya indexado, volve a correr este script con -Reindexar." -ForegroundColor Yellow
    throw
}

Write-Host "`nListo. Probalo:" -ForegroundColor Green
Write-Host "  `$env:CEREBRO_DIR = $(Q $CerebroDir); `$env:CEREBRO_EMBEDDINGS = '$Embeddings'"
Write-Host "  & $(Q $pyVenv) $(Q $cerebroPy) buscar 'el agente copio un archivo para pasar un check'"
Write-Host "`nEl MCP NO se registro (eso se hace una vez, con tu OK). Con -s user queda disponible en todos tus proyectos:" -ForegroundColor Yellow
Write-Host "  claude mcp add -s user cerebro -e CEREBRO_DIR=$(Q $CerebroDir) -e CEREBRO_EMBEDDINGS=$Embeddings -- $(Q $pyVenv) $(Q (Join-Path $PSScriptRoot 'mcp_server.py'))"
