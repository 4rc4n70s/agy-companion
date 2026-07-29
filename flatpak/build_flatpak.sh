#!/bin/bash
set -e

echo "=== AGY Companion - Compilador de Flatpak ==="
echo ""

if ! command -v flatpak-builder &> /dev/null; then
    echo "❌ flatpak-builder no está instalado."
    echo "En Arch/Omarchy ejecuta: sudo pacman -S flatpak-builder flatpak"
    echo "En Ubuntu/Debian ejecuta: sudo apt install flatpak-builder flatpak"
    exit 1
fi

echo "1. Instalando SDK de Freedesktop..."
flatpak install -y flathub org.freedesktop.Platform//23.08 org.freedesktop.Sdk//23.08 || true

echo "2. Compilando Flatpak..."
flatpak-builder --force-clean build-dir org.antigravity.AGYCompanion.json

echo "3. Exportando a repositorio local..."
flatpak-builder --repo=repo --force-clean build-dir org.antigravity.AGYCompanion.json

echo "4. Empaquetando bundle listo para instalar (.flatpak)..."
flatpak build-bundle repo AGYCompanion.flatpak org.antigravity.AGYCompanion

echo ""
echo "🎉 ¡Flatpak generado con éxito: AGYCompanion.flatpak!"
echo "Para instalarlo en cualquier sistema Linux:"
echo "  flatpak install --user AGYCompanion.flatpak"
