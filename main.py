from fastapi import FastAPI, Request, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from dotenv import load_dotenv
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
from typing import Optional
from orchestrator import global_event_bus, global_state_manager

app = FastAPI()
CONFIG_PATH = os.path.join(os.path.dirname(__file__), 'config.json')
IMAGES_DIR = os.path.join(os.path.dirname(__file__), 'static', 'images')

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

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

def save_config(new_cfg):
    try:
        with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
            json.dump(new_cfg, f, indent=4)
        return True
    except:
        return False

def get_brain_dir():
    return os.path.expanduser("~/.gemini/antigravity-cli/brain")

@app.get("/api/conversations")
def list_conversations(skip: int = 0, limit: int = 20):
    brain_dir = get_brain_dir()
    if not os.path.exists(brain_dir):
        return []
        
    metadata_path = os.path.join(os.path.dirname(brain_dir), "cache", "conversation_metadata.json")
    metadata_cache = {}
    if os.path.exists(metadata_path):
        try:
            with open(metadata_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                metadata_cache = data.get("conversations", {})
        except:
            pass

    # Paso 1: Encontrar todos los transcripts y su fecha de modificación
    all_conversations = []
    for item in os.listdir(brain_dir):
        path = os.path.join(brain_dir, item)
        if os.path.isdir(path):
            transcript_path = os.path.join(path, ".system_generated", "logs", "transcript.jsonl")
            if os.path.exists(transcript_path):
                mod_time = os.path.getmtime(transcript_path)
                all_conversations.append({
                    "id": item,
                    "path": transcript_path,
                    "timestamp": mod_time
                })
                
    # Paso 2: Ordenar por fecha (más reciente primero)
    all_conversations.sort(key=lambda x: x["timestamp"], reverse=True)
    
    # Paso 3: Aplicar paginación
    paginated_convs = all_conversations[skip : skip + limit]
    
    # Paso 4: Leer los títulos solo para la página actual
    result = []
    for conv in paginated_convs:
        title = ""
        prefix = "[CLI]"
        transcript_path = conv["path"]
        item = conv["id"]
        
        try:
            with open(transcript_path, 'r', encoding='utf-8') as f:
                for line in f:
                    data = json.loads(line)
                    if data.get("type") == "USER_INPUT":
                        content = data.get("content", "")
                        
                        if "<USER_REQUEST>" in content:
                            content = content.split("<USER_REQUEST>")[1].split("</USER_REQUEST>")[0].strip()
                        else:
                            content = content.strip()
                        
                        if content.startswith("Role:"):
                            prefix = "[AGE]"
                            parts = content.split("Task: ", 1)
                            title = parts[1].strip() if len(parts) > 1 else content.strip()
                        elif "User says:" in content:
                            prefix = "[COM]"
                            parts = content.split("User says:", 1)
                            title = parts[1].strip() if len(parts) > 1 else content.strip()
                        else:
                            prefix = "[CLI]"
                            cached_data = metadata_cache.get(item)
                            if cached_data and isinstance(cached_data, dict):
                                summary = cached_data.get("summary")
                                if summary and isinstance(summary, dict):
                                    title = summary.get("Preview", "")
                            
                            if not title:
                                title = content
                        
                        title = title[:40] + ("..." if len(title) > 40 else "")
                        break
        except:
            pass
        
        if not title:
            title = "Conversación sin título"
            
        full_title = f"{prefix} {title}"
        
        result.append({
            "id": item,
            "title": full_title,
            "timestamp": conv["timestamp"]
        })
        
    return result

@app.get("/api/conversations/{conv_id}/messages")
def get_conversation_messages(conv_id: str):
    transcript_path = os.path.join(get_brain_dir(), conv_id, ".system_generated", "logs", "transcript.jsonl")
    if not os.path.exists(transcript_path):
        return []
        
    messages = []
    try:
        with open(transcript_path, 'r', encoding='utf-8') as f:
            for line in f:
                data = json.loads(line)
                if data.get("type") == "USER_INPUT":
                    content = data.get("content", "")
                    if "<USER_REQUEST>" in content:
                        content = content.split("<USER_REQUEST>")[1].split("</USER_REQUEST>")[0].strip()
                    messages.append({"role": "user", "text": content})
                elif data.get("type") == "PLANNER_RESPONSE":
                    content = data.get("content", "")
                    tool_calls = data.get("tool_calls", [])
                    if tool_calls:
                        for t in tool_calls:
                            t_name = t.get("name", "Tool")
                            t_args = t.get("args", {})
                            summary = t_args.get("toolSummary", t_name)
                            target = t_args.get("TargetFile", "")
                            
                            content += f"\n\n> 🛠️ **{t_name}**: {summary}"
                            if target:
                                target = target.strip('"\'')
                                content += f"\n> 📄 `{target}`"
                                
                    if content.strip() or tool_calls:
                        if messages and messages[-1]["role"] == "agent":
                            # Combine with previous agent message
                            if content.strip():
                                messages[-1]["text"] += "\n\n" + content
                            if tool_calls:
                                messages[-1].setdefault("tool_calls", []).extend(tool_calls)
                        else:
                            messages.append({"role": "agent", "text": content, "tool_calls": tool_calls})
    except:
        pass
    return messages

@app.get("/api/artifacts/{conv_id}")
def list_artifacts(conv_id: str):
    conv_dir = os.path.join(get_brain_dir(), conv_id)
    if not os.path.exists(conv_dir):
        return []
    
    artifacts = []
    for item in os.listdir(conv_dir):
        item_path = os.path.join(conv_dir, item)
        # Ignoramos la carpeta .system_generated
        if item == ".system_generated" or os.path.isdir(item_path):
            continue
        artifacts.append({
            "name": item,
            "size": os.path.getsize(item_path),
            "updated_at": os.path.getmtime(item_path)
        })
    return artifacts

@app.get("/api/conversations/{conv_id}/modified_files")
def get_modified_files(conv_id: str):
    transcript_path = os.path.join(get_brain_dir(), conv_id, ".system_generated", "logs", "transcript.jsonl")
    if not os.path.exists(transcript_path):
        return []
        
    modified_files = set()
    try:
        with open(transcript_path, 'r', encoding='utf-8') as f:
            for line in f:
                data = json.loads(line)
                if data.get("type") == "PLANNER_RESPONSE":
                    tool_calls = data.get("tool_calls", [])
                    for t in tool_calls:
                        if t.get("name") in ["replace_file_content", "multi_replace_file_content", "write_to_file", "write_file", "edit"]:
                            target = t.get("args", {}).get("TargetFile", "")
                            if target:
                                target = target.strip('"\'')
                                modified_files.add(target)
    except:
        pass
    
    return [{"path": p, "name": os.path.basename(p)} for p in sorted(list(modified_files))]

@app.get("/api/artifacts/{conv_id}/{filename}")
def read_artifact(conv_id: str, filename: str):
    file_path = os.path.join(get_brain_dir(), conv_id, filename)
    if not os.path.exists(file_path) or not os.path.isfile(file_path):
        return JSONResponse(status_code=404, content={"error": "Artifact no encontrado"})
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    return {"name": filename, "content": content}

@app.get("/api/agents/state")
def get_agents_state():
    return {"session": global_state_manager.active_session_id, "agents": global_state_manager.get_all_agents()}


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/config")
async def get_config():
    return load_config()

@app.post("/api/config")
async def post_config(request: Request):
    new_cfg = await request.json()
    cfg = load_config()
    cfg.update(new_cfg)
    save_config(cfg)
    return {"status": "ok", "config": cfg}

@app.get("/api/health")
async def health_check():
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

    return {
        'status': status_str,
        'checks': checks,
        'missing': missing
    }

class AvatarRequest(BaseModel):
    prompt: Optional[str] = 'cute AI mascot avatar portrait'

@app.post("/api/generate-avatar")
async def generate_avatar(req: AvatarRequest):
    prompt = req.prompt if req.prompt else 'cute AI mascot avatar portrait'
    
    cli_prompt = (
        f"You are a background task. "
        f"1. Generate an image with prompt: '{prompt}'. IMPORTANT CONSTRAINTS: The image must be a perfectly centered portrait, facing directly forward at the camera, with a solid neutral background, and suitable for a circular profile picture or UI avatar. Save it to '{os.path.join(IMAGES_DIR, 'char-mouth-closed.png')}'. "
        f"2. Use the generated image as a reference (edit) to create a second image where the same character has its mouth wide open for speaking. Save it to '{os.path.join(IMAGES_DIR, 'char-mouth-open.png')}'. "
        f"Ensure background, framing, and style remain identical. Do not ask for user confirmation."
    )
    
    try:
        proc = await asyncio.create_subprocess_exec(
            "agy", "-p", cli_prompt, "--dangerously-skip-permissions",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await proc.communicate()
        
        if proc.returncode == 0:
            return {
                'status': 'ok',
                'timestamp': int(time.time()),
                'image_url': f"/static/images/char-mouth-closed.png?v={int(time.time())}"
            }
        else:
            return JSONResponse(status_code=500, content={'error': f"Error de CLI: {stderr.decode()}"})
    except Exception as e:
        return JSONResponse(status_code=500, content={'error': f"Excepción: {str(e)}"})

@app.get("/api/models")
async def get_models():
    try:
        proc = await asyncio.create_subprocess_exec(
            "agy", "models",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, _ = await proc.communicate()
        lines = stdout.decode().strip().split('\n')
        models = []
        for line in lines:
            line = line.strip()
            # Clean spinner characters
            if 'Fetching' in line or not line: continue
            
            # The line format is: model-id     Description
            parts = line.split()
            if len(parts) >= 1:
                # Remove ANSI codes if any
                model_id = parts[0]
                desc = " ".join(parts[1:]) if len(parts) > 1 else model_id
                models.append({"id": model_id, "name": desc})
        return {"models": models}
    except Exception as e:
        return JSONResponse(status_code=500, content={'error': str(e)})

@app.get("/api/quota")
async def get_quota():
    try:
        proc = await asyncio.create_subprocess_exec(
            "agy", "-p", "/quota", "--dangerously-skip-permissions",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode == 0:
            return {"quota": stdout.decode().strip()}
        else:
            return JSONResponse(status_code=500, content={'error': stderr.decode()})
    except Exception as e:
        return JSONResponse(status_code=500, content={'error': str(e)})


@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    await websocket.accept()
    
    event_queue = global_event_bus.subscribe()
    
    async def forward_events():
        try:
            while True:
                event = await event_queue.get()
                await websocket.send_text(json.dumps(event))
                event_queue.task_done()
        except asyncio.CancelledError:
            pass
        except Exception as e:
            print(f"Error forwarding events: {e}")
            
    forward_task = asyncio.create_task(forward_events())
    
    try:
        while True:
            cfg = load_config()
            data = await websocket.receive_text()
            req = json.loads(data)
            user_message = req.get("message", "")
            conversation_id = req.get("conversation_id", None)
            working_dir = req.get("working_dir", os.path.expanduser("~"))
            use_agents = req.get("use_agents", True)
            
            if not conversation_id:
                sys_prompt = cfg.get('system_prompt', '').strip()
                if sys_prompt:
                    prompt = f"{sys_prompt}\n\nUser says: {user_message}"
                else:
                    prompt = user_message
            else:
                prompt = user_message
                global_state_manager.set_session(conversation_id)
            
            # Verificar que el working dir exista
            if not os.path.isdir(working_dir):
                working_dir = os.path.expanduser("~")
                
            if use_agents:
                # Importacion perezosa para evitar circularidad
                from agents import SupervisorAgent
                supervisor = SupervisorAgent(working_dir=working_dir)
                
                # Avisamos al cliente que estamos en modo pensamiento (ahora manejado en frontend por 'Pensando...')
                
                final_answer = await supervisor.orchestrate(prompt, conversation_id)
            else:
                from agents import BaseAgent
                agent = BaseAgent(name="Direct", role="Assistant", working_dir=working_dir)
                
                final_answer = await agent.run(prompt, conversation_id, direct=True)
            
            # Enviar el resultado final al chat principal
            await websocket.send_text(json.dumps({"event": "result", "result": {"response": final_answer}}))
            await websocket.send_text(json.dumps({"event": "done"}))
            
    except WebSocketDisconnect:
        print("Cliente desconectado")
    except Exception as e:
        print(f"Error WebSocket: {e}")
    finally:
        forward_task.cancel()
        global_event_bus.unsubscribe(event_queue)
        try:
            await websocket.close()
        except:
            pass

def get_git_diff_files(repo_path: str):
    """Returns a set of absolute paths for files with uncommitted changes."""
    try:
        result = subprocess.run(["git", "rev-parse", "--show-toplevel"], 
                                cwd=repo_path, capture_output=True, text=True, check=True)
        git_root = result.stdout.strip()
        status_result = subprocess.run(["git", "status", "--porcelain"], 
                                      cwd=git_root, capture_output=True, text=True)
        diff_files = set()
        for line in status_result.stdout.splitlines():
            if len(line) > 3:
                rel_path = line[3:]
                abs_path = os.path.join(git_root, rel_path)
                diff_files.add(abs_path)
        return diff_files
    except:
        return set()

@app.get("/api/workspace/files")
def list_workspace_files(path: str = ""):
    if not path or not os.path.isdir(path):
        return {"error": "Ruta inválida"}
        
    diff_files = get_git_diff_files(path)
        
    try:
        files_list = []
        # Listamos solo el primer nivel para no bloquear, el frontend puede pedir subniveles
        for item in sorted(os.listdir(path)):
            if item in ['.git', 'node_modules', 'venv', '__pycache__']:
                continue
            item_path = os.path.join(path, item)
            is_dir = os.path.isdir(item_path)
            
            has_diff = False
            if is_dir:
                dir_prefix = item_path + os.sep
                if any(f.startswith(dir_prefix) for f in diff_files):
                    has_diff = True
            else:
                if item_path in diff_files:
                    has_diff = True
                    
            files_list.append({
                "name": item,
                "path": item_path,
                "is_dir": is_dir,
                "has_diff": has_diff
            })
        
        # Separar directorios de archivos y ordenarlos
        dirs = [f for f in files_list if f["is_dir"]]
        files = [f for f in files_list if not f["is_dir"]]
        return {"files": dirs + files}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/workspace/search")
def search_workspace_files(path: str = "", query: str = ""):
    if not path or not os.path.isdir(path):
        return {"error": "Ruta inválida"}
    
    files_list = []
    query = query.lower()
    
    try:
        # Busqueda recursiva limitando a primeros 100 resultados para no colgar
        count = 0
        for root, dirs, files in os.walk(path):
            dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', 'venv', '__pycache__']]
            for file in files:
                if query in file.lower():
                    item_path = os.path.join(root, file)
                    # Mostrar ruta relativa para mejor legibilidad
                    rel_path = os.path.relpath(item_path, path)
                    files_list.append({
                        "name": rel_path,
                        "path": item_path,
                        "is_dir": False
                    })
                    count += 1
                    if count >= 100:
                        break
            if count >= 100:
                break
        
        return {"files": files_list}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/workspace/file")
def read_workspace_file(filepath: str = ""):
    if not filepath or not os.path.isfile(filepath):
        return {"error": "Archivo inválido"}
    try:
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            return {"content": f.read()}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/workspace/file_original")
async def read_workspace_file_original(filepath: str = ""):
    if not filepath or not os.path.isfile(filepath):
        return {"error": "Archivo inválido"}
    try:
        # Extraer directorio y nombre de archivo para git
        directory = os.path.dirname(filepath)
        filename = os.path.basename(filepath)
        
        process = await asyncio.create_subprocess_exec(
            "git", "show", f"HEAD:./{filename}",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=directory
        )
        stdout, stderr = await process.communicate()
        
        if process.returncode == 0:
            return {"content": stdout.decode('utf-8', errors='replace')}
        else:
            # Si no está en git o no hay HEAD, devolvemos el archivo actual como fallback
            with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
                return {"content": f.read()}
    except Exception as e:
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            return {"content": f.read()}

@app.get("/api/workspace/git_diff")
async def workspace_git_diff(path: str = ""):
    if not path or not os.path.isdir(path):
        return {"diff": ""}
    
    try:
        # Ejecutamos git diff en esa ruta
        process = await asyncio.create_subprocess_exec(
            "git", "diff",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=path
        )
        stdout, _ = await process.communicate()
        return {"diff": stdout.decode('utf-8')}
    except Exception:
        return {"diff": ""}

class TTSRequest(BaseModel):
    text: str = ''
    engine: str = 'edge'
    voice: str = 'es-AR-ElenaNeural'

@app.post("/api/tts")
async def tts(req: TTSRequest):
    if not req.text:
        return JSONResponse(status_code=400, content={'error': 'No text provided'})

    if req.engine == 'kokoro':
        try:
            import soundfile as sf
            import numpy as np
            kokoro = get_kokoro()
            if not kokoro:
                return JSONResponse(status_code=500, content={'error': 'Modelo Kokoro-ONNX no encontrado'})
            
            all_samples = []
            sample_rate = 24000
            
            async for samples, sr in kokoro.create_stream(req.text, voice=req.voice, speed=1.0, lang="es"):
                all_samples.append(samples)
                sample_rate = sr
                
            if not all_samples:
                return JSONResponse(status_code=500, content={'error': 'Kokoro no generó audio'})
                
            final_samples = np.concatenate(all_samples)
            byte_io = io.BytesIO()
            sf.write(byte_io, final_samples, sample_rate, format='WAV')
            b64_audio = base64.b64encode(byte_io.getvalue()).decode('utf-8')
            return {'audio': f'data:audio/wav;base64,{b64_audio}'}
        except Exception as e:
            return JSONResponse(status_code=500, content={'error': f"Error Kokoro: {str(e)}"})
    else:
        communicate = edge_tts.Communicate(req.text, req.voice)
        audio_data = b""
        try:
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_data += chunk["data"]
            b64_audio = base64.b64encode(audio_data).decode('utf-8')
            return {'audio': f'data:audio/mp3;base64,{b64_audio}'}
        except Exception as e:
            return JSONResponse(status_code=500, content={'error': f"Error Edge TTS: {str(e)}"})

@app.post("/api/benchmark-kokoro")
async def benchmark_kokoro():
    try:
        kokoro = get_kokoro()
        if not kokoro:
            return JSONResponse(status_code=400, content={'error': 'El modelo Kokoro-ONNX no está instalado en este sistema.'})
        
        test_phrase = "Probando la velocidad de sintesis de voz en tiempo real con Kokoro ONNX."
        
        t0 = time.time()
        samples, sample_rate = kokoro.create(test_phrase, voice="ef_dora", speed=1.0, lang="es")
        elapsed = time.time() - t0
        
        is_suitable = elapsed < 1.5
        recommendation = "Tu PC es capaz de ejecutar Kokoro ONNX de forma fluida en tiempo real." if is_suitable else f"Procesamiento lento ({elapsed:.2f}s). Se recomienda seguir usando Edge TTS en esta PC."

        return {
            'elapsed_seconds': round(elapsed, 3),
            'suitable': is_suitable,
            'recommendation': recommendation
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={'error': str(e)})

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='127.0.0.1', port=5000)
