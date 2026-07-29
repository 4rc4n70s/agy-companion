#!/bin/bash
echo "=== AGY Companion - Chequeo de Dependencias ==="
echo ""

ALL_OK=true

# 1. Check Python 3
if command -v python3 &> /dev/null; then
    echo "✅ Python 3: Instalado ($(python3 --version))"
else
    echo "❌ Python 3: NO instalado"
    ALL_OK=false
fi

# 2. Check Antigravity CLI (agy)
if command -v agy &> /dev/null; then
    echo "✅ Antigravity CLI (agy): Instalado"
else
    echo "❌ Antigravity CLI (agy): NO encontrado en PATH. Ejecuta: curl -fsSL https://antigravity.google/cli/install.sh | bash"
    ALL_OK=false
fi

# 3. Check Virtual Environment
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
if [ -d "$DIR/venv" ]; then
    echo "✅ Entorno Virtual Python (venv): Presente"
    source "$DIR/venv/bin/activate"
    
    # Check Flask
    if python -c "import flask" &> /dev/null; then
        echo "✅ Librería Flask: Instalada"
    else
        echo "❌ Librería Flask: NO instalada (Ejecuta: pip install flask)"
        ALL_OK=false
    fi

    # Check Edge TTS
    if python -c "import edge_tts" &> /dev/null; then
        echo "✅ Librería Edge TTS: Instalada"
    else
        echo "⚠️ Librería Edge TTS: NO instalada (Ejecuta: pip install edge-tts)"
    fi

    # Check Kokoro ONNX
    if python -c "import kokoro_onnx" &> /dev/null; then
        echo "✅ Librería Kokoro ONNX: Instalada"
    else
        echo "⚠️ Librería Kokoro ONNX: NO instalada (Ejecuta: pip install kokoro-onnx onnxruntime soundfile)"
    fi
else
    echo "❌ Entorno Virtual Python: NO encontrado. Crea uno con: python3 -m venv venv"
    ALL_OK=false
fi

# 4. Check Kokoro Models
if [ -f "/home/azanardi/kokoro-models/kokoro-v1.0.int8.onnx" ] && [ -f "/home/azanardi/kokoro-models/voices-v1.0.bin" ]; then
    echo "✅ Modelos Kokoro ONNX: Presentes en ~/kokoro-models"
else
    echo "⚠️ Modelos Kokoro ONNX: NO encontrados en ~/kokoro-models"
fi

# 5. Check Browser
if command -v google-chrome-stable &> /dev/null || command -v xdg-open &> /dev/null; then
    echo "✅ Navegador / Lanzador Web: Disponible"
else
    echo "❌ Navegador / xdg-open: NO encontrado"
    ALL_OK=false
fi

echo ""
if [ "$ALL_OK" = true ]; then
    echo "🎉 ¡Todo está OK! AGY Companion está listo para funcionar."
else
    echo "⚠️ Faltan algunas dependencias críticas. Por favor revisa la lista superior."
fi
