#!/bin/bash
set -e

echo "=============================================="
echo "   AGY Companion - Setup e Instalador"
echo "=============================================="
echo ""

# 1. Crear entorno virtual si no existe
if [ ! -d "venv" ]; then
    echo "[1/4] Creando entorno virtual Python (venv)..."
    python3 -m venv venv
else
    echo "[1/4] Entorno virtual 'venv' ya existe."
fi

source venv/bin/activate

# 2. Instalar dependencias de Python
echo "[2/4] Instalando dependencias de Python desde requirements.txt..."
pip install --upgrade pip
pip install -r requirements.txt

# 3. Descargar modelos de Kokoro ONNX (Opcional)
KOKORO_DIR="$HOME/kokoro-models"
if [ ! -f "$KOKORO_DIR/kokoro-v1.0.int8.onnx" ]; then
    echo "[3/4] Descargando modelo Kokoro-ONNX (~88MB)..."
    mkdir -p "$KOKORO_DIR"
    curl -L "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.int8.onnx" -o "$KOKORO_DIR/kokoro-v1.0.int8.onnx"
    curl -L "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin" -o "$KOKORO_DIR/voices-v1.0.bin"
else
    echo "[3/4] Modelos Kokoro ONNX ya están presentes en $KOKORO_DIR."
fi

# 4. Crear lanzador de escritorio .desktop
echo "[4/4] Creando lanzador de aplicación de escritorio..."
DESKTOP_FILE="$HOME/.local/share/applications/waku-companion.desktop"
mkdir -p "$HOME/.local/share/applications"

cat << EOF > "$DESKTOP_FILE"
[Desktop Entry]
Version=1.0
Type=Application
Name=AGY Companion
Comment=Tu compañero de IA conversacional con Antigravity CLI
Exec=$(pwd)/launch.sh
Icon=user-available
Terminal=false
Categories=Utility;Development;
EOF

chmod +x launch.sh interactive_cli.sh check_deps.sh
update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true

echo ""
echo "=============================================="
echo "  ¡Instalación completada con éxito! 🎉"
echo "=============================================="
echo "Para iniciar la aplicación:"
echo "  • Vía Interfaz Web: ./launch.sh"
echo "  • Vía Bucle CLI:    ./interactive_cli.sh"
echo "=============================================="
