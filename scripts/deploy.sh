#!/bin/bash

# Script de Despliegue con Versionado (Git Tags)
# Uso: ./scripts/deploy.sh v1.0.0 "Mensaje de cambios"

VERSION=$1
MESSAGE=$2

if [ -z "$VERSION" ]; then
  echo "❌ Error: Debes especificar una versión (ej: v1.0.0)"
  exit 1
fi

if [ -z "$MESSAGE" ]; then
  MESSAGE="Release $VERSION"
fi

echo "🚀 Iniciando despliegue de la versión $VERSION..."

# 1. Asegurar sincronización
git pull origin main

# 2. Construir frontend
echo "📦 Construyendo frontend..."
npm run build

# 3. Commit de cambios
git add .
git commit -m "chore: deploy $VERSION - $MESSAGE"

# 4. Crear Tag
echo "🏷️ Creando tag $VERSION..."
git tag -a "$VERSION" -m "$MESSAGE"

# 5. Push a GitHub (Railway detectará el cambio en main)
echo "📤 Subiendo a GitHub..."
git push origin main --tags

echo "✅ Despliegue completado. Railway iniciará la construcción en breve."
