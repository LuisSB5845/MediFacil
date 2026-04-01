param (
    [string]$Version,
    [string]$Message = "Release $Version"
)

if (-not $Version) {
    Write-Host "❌ Error: Debes especificar una versión (ej: v1.0.0)" -ForegroundColor Red
    exit 1
}

Write-Host "🚀 Iniciando despliegue de la versión $Version..." -ForegroundColor Cyan

# 1. Asegurar sincronización
git pull origin main

# 2. Construir frontend
Write-Host "📦 Construyendo frontend..."
npm run build

# 3. Commit de cambios
git add .
git commit -m "chore: deploy $Version - $Message"

# 4. Crear Tag
Write-Host "🏷️ Creando tag $Version..."
git tag -a "$Version" -m "$Message"

# 5. Push a GitHub (Railway detectará el cambio en main)
Write-Host "📤 Subiendo a GitHub..."
git push origin main --tags

Write-Host "✅ Despliegue completado. Railway iniciará la construcción en breve." -ForegroundColor Green
