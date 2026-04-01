#!/bin/bash

# Script de Reversión Instantánea (Rollback Strategy)
# Uso: ./scripts/rollback.sh v1.0.0

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "❌ Error: Debes especificar qué versión restaurar (ej: v1.0.0)"
  echo "Tags disponibles:"
  git tag -l | tail -n 5
  exit 1
fi

echo "⚠️ PREPARANDO ROLLBACK A LA VERSIÓN $VERSION..."
echo "Este proceso forzará la rama 'main' a este punto y activará el redespliegue en Railway."

# Preguntar confirmación rápida
read -p "¿Estás seguro? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Aborted."
    exit 1
fi

# 1. Resetear local a la etiqueta elegida
git reset --hard "$VERSION"

# 2. Empujar forzado a main para que Railway lo detecte
git push origin main --tags --force

echo "✅ Rollback enviado. Railway está redesplegando la versión estable: $VERSION"
