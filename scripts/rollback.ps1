param (
    [string]$Version
)

if (-not $Version) {
    Write-Host "❌ Error: Debes especificar qué versión restaurar (ej: v1.0.0)" -ForegroundColor Red
    Write-Host "Tags disponibles:"
    git tag -l | tail -n 5
    exit 1
}

Write-Host "⚠️ PREPARANDO ROLLBACK A LA VERSIÓN $Version..." -ForegroundColor Yellow
$confirm = Read-Host "¿Estás seguro? (y/n)"
if ($confirm -ne 'y') {
    Write-Host "Aborted."
    exit 1
}

# 1. Resetear local a la versión elegida
Write-Host "📌 Reseteando local..."
git reset --hard "$Version"

# 2. Empujar forzado a main para que Railway lo detecte
Write-Host "📤 Sincronizando con Railway (Force Push)..."
git push origin main --tags --force

Write-Host "✅ Rollback completado con éxito. Railway está reconstruyendo la versión estable: $Version" -ForegroundColor Green
