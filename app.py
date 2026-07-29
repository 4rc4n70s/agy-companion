from flask import Flask, render_template, request, jsonify
import subprocess
import asyncio
import edge_tts
import json
import os
import time
import base64
import io
import shutil
import requests
import urllib.parse

app = Flask(__name__)
CONFIG_PATH = os.path.join(os.path.dirname(__file__), 'config.json')
IMAGES_DIR = os.path.join(os.path.dirname(__file__), 'static', 'images')

DEFAULT_CONFIG = {
    "character_name": "AGY Companion",
    "system_prompt": "You are AGY Companion, a friendly, witty, and super intelligent AI assistant. You answer helpfully in 3 sentences max without emojis.",
    "tts_engine": "edge",
    "tts_voice": "es-AR-ElenaNeural",
    "kokoro_voice": "ef_dora"
}

KOKORO_INSTANCE = None
KOKORO_MODEL_PATH = "/home/azanardi/kokoro-models/kokoro-v1.0.int8.onnx"
KOKORO_VOICES_PATH = "/home/azanardi/kokoro-models/voices-v1.0.bin"

def get_kokoro():
    global KOKORO_INSTANCE
    if KOKORO_INSTANCE is None:
        if os.path.exists(KOKORO_MODEL_PATH) and os.path.exists(KOKORO_VOICES_PATH):
            from kokoro_onnx import Kokoro
            KOKORO_INSTANCE = Kokoro(KOKORO_MODEL_PATH, KOKORO_VOICES_PATH)
    return KOKORO_INSTANCE

def load_config():
    if not os.path.exists(CONFIG_PATH):
        save_config(DEFAULT_CONFIG)
        return DEFAULT_CONFIG
    try:
        with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
            cfg = json.load(f)
            merged = DEFAULT_CONFIG.copy()
            merged.update(cfg)
            return merged
    except Exception:
        return DEFAULT_CONFIG

def save_config(cfg):
    with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
        json.dump(cfg, f, indent=2, ensure_ascii=False)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/config', methods=['GET', 'POST'])
def handle_config():
    if request.method == 'POST':
        new_cfg = request.json
        cfg = load_config()
        cfg.update(new_cfg)
        save_config(cfg)
        return jsonify({'status': 'ok', 'config': cfg})
    return jsonify(load_config())

@app.route('/api/health', methods=['GET'])
def health_check():
    checks = {
        'agy_cli': shutil.which('agy') is not None,
        'edge_tts': False,
        'kokoro_onnx': False,
        'kokoro_models': os.path.exists(KOKORO_MODEL_PATH) and os.path.exists(KOKORO_VOICES_PATH)
    }
    
    try:
        import edge_tts
        checks['edge_tts'] = True
    except ImportError:
        pass

    try:
        import kokoro_onnx
        checks['kokoro_onnx'] = True
    except ImportError:
        pass

    missing = []
    if not checks['agy_cli']:
        missing.append("Antigravity CLI (agy)")
    if not checks['edge_tts']:
        missing.append("Librería edge-tts")
    if not checks['kokoro_onnx']:
        missing.append("Librería kokoro-onnx")
    if not checks['kokoro_models']:
        missing.append("Pesos Kokoro ONNX (~/kokoro-models)")

    status_str = "ok" if checks['agy_cli'] else "critical_missing"

    return jsonify({
        'status': status_str,
        'checks': checks,
        'missing': missing
    })

@app.route('/api/generate-avatar', methods=['POST'])
def generate_avatar():
    prompt = request.json.get('prompt', 'cute AI mascot avatar portrait')
    if not prompt:
        prompt = 'cute AI mascot avatar portrait'
        
    encoded_prompt = urllib.parse.quote(prompt)
    img_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=512&height=512&nologo=true"

    try:
        res = requests.get(img_url, timeout=25)
        if res.status_code == 200:
            os.makedirs(IMAGES_DIR, exist_ok=True)
            closed_path = os.path.join(IMAGES_DIR, 'char-mouth-closed.png')
            open_path = os.path.join(IMAGES_DIR, 'char-mouth-open.png')
            
            with open(closed_path, 'wb') as f:
                f.write(res.content)
            with open(open_path, 'wb') as f:
                f.write(res.content)

            return jsonify({
                'status': 'ok',
                'timestamp': int(time.time()),
                'image_url': f"/static/images/char-mouth-closed.png?v={int(time.time())}"
            })
        else:
            return jsonify({'error': 'Error al generar la imagen desde el servidor'}), 500
    except Exception as e:
        return jsonify({'error': f"Excepción: {str(e)}"}), 500

@app.route('/chat', methods=['POST'])
def chat():
    user_message = request.json.get('message', '')
    cfg = load_config()
    
    prompt = f"""{cfg.get('system_prompt', '')}

User says: {user_message}"""

    thoughts = [
        f"Recibiendo prompt del usuario: '{user_message}'",
        f"Cargando system instructions del personaje: '{cfg.get('character_name')}'",
        "Evaluando restricciones de longitud y personalidad...",
        "Invocando motor de razonamiento de Antigravity CLI..."
    ]

    tool_calls = [
        f"agy --dangerously-skip-permissions -p \"{prompt[:60]}...\""
    ]

    t0 = time.time()
    try:
        result = subprocess.run(
            ["agy", "--dangerously-skip-permissions", "-p", prompt],
            capture_output=True,
            text=True,
            timeout=60
        )
        elapsed = round(time.time() - t0, 3)
        response_text = result.stdout.strip()
        if not response_text:
            response_text = "No pude procesar la respuesta en este momento."
        thoughts.append(f"Inferencia completada con éxito en {elapsed}s.")
    except Exception as e:
        response_text = f"Error: {str(e)}"
        thoughts.append(f"Error durante la inferencia: {str(e)}")

    return jsonify({
        'response': response_text,
        'thoughts': thoughts,
        'tool_calls': tool_calls,
        'tts_engine': cfg.get('tts_engine', 'edge'),
        'tts_voice': cfg.get('tts_voice', 'es-AR-ElenaNeural'),
        'kokoro_voice': cfg.get('kokoro_voice', 'ef_dora'),
        'character_name': cfg.get('character_name', 'AGY Companion')
    })

@app.route('/api/tts', methods=['POST'])
def tts():
    text = request.json.get('text', '')
    engine = request.json.get('engine', 'edge')
    voice = request.json.get('voice', 'es-AR-ElenaNeural')
    
    if not text:
        return jsonify({'error': 'No text provided'}), 400

    if engine == 'kokoro':
        try:
            import soundfile as sf
            kokoro = get_kokoro()
            if not kokoro:
                return jsonify({'error': 'Modelo Kokoro-ONNX no encontrado'}), 500
            
            samples, sample_rate = kokoro.create(text, voice=voice, speed=1.0, lang="es")
            byte_io = io.BytesIO()
            sf.write(byte_io, samples, sample_rate, format='WAV')
            b64_audio = base64.b64encode(byte_io.getvalue()).decode('utf-8')
            return jsonify({'audio': f'data:audio/wav;base64,{b64_audio}'})
        except Exception as e:
            return jsonify({'error': f"Error Kokoro: {str(e)}"}), 500

    else: # Edge TTS
        async def _generate_edge():
            communicate = edge_tts.Communicate(text, voice)
            audio_data = b""
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_data += chunk["data"]
            return audio_data

        try:
            audio_bytes = asyncio.run(_generate_edge())
            b64_audio = base64.b64encode(audio_bytes).decode('utf-8')
            return jsonify({'audio': f'data:audio/mp3;base64,{b64_audio}'})
        except Exception as e:
            return jsonify({'error': f"Error Edge TTS: {str(e)}"}), 500

@app.route('/api/benchmark-kokoro', methods=['POST'])
def benchmark_kokoro():
    try:
        kokoro = get_kokoro()
        if not kokoro:
            return jsonify({'error': 'El modelo Kokoro-ONNX no está instalado en este sistema.'}), 400
        
        test_phrase = "Probando la velocidad de sintesis de voz en tiempo real con Kokoro ONNX."
        
        t0 = time.time()
        samples, sample_rate = kokoro.create(test_phrase, voice="ef_dora", speed=1.0, lang="es")
        elapsed = time.time() - t0
        
        is_suitable = elapsed < 1.5
        recommendation = "Tu PC es capaz de ejecutar Kokoro ONNX de forma fluida en tiempo real." if is_suitable else f"Procesamiento lento ({elapsed:.2f}s). Se recomienda seguir usando Edge TTS en esta PC."

        return jsonify({
            'elapsed_seconds': round(elapsed, 3),
            'suitable': is_suitable,
            'recommendation': recommendation
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000)
